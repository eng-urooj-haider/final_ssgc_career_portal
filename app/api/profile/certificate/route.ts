import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { verifyToken } from "@/app/lib/auth";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const UPLOAD_URL_PREFIX = "/uploads/certificates/";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "certificates");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_CERTIFICATES = 20;

const ALLOWED_TYPES: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
};

const DURATION_UNITS = new Set(["HOURS", "DAYS", "WEEKS", "MONTHS", "YEARS"]);

interface CertificateMeta {
  id?: number | null;
  name?: string;
  organisation?: string;
  issue_date?: string;
  document?: string | null; // ignored on purpose, see below
  duration_unit?: string | null;
  duration_value?: string | number | null;
}

interface CleanCertificate {
  id: number | null; // null = create
  certificateName: string;
  organisation: string;
  issueDate: Date;
  durationValue: number | null;
  durationUnit: string | null;
  file: File | null; // new upload, if any
  keepDocument: string | null; // existing document to keep when no new file
}

class ValidationError extends Error {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return verifyToken(token).userId ?? null;
  } catch {
    return null; // expired or invalid
  }
}

/** Remove a stored upload. Never throws; only touches our upload folder. */
async function removeUpload(documentUrl: string | null | undefined) {
  if (!documentUrl || !documentUrl.startsWith(UPLOAD_URL_PREFIX)) return;
  const filePath = path.join(UPLOAD_DIR, path.basename(documentUrl));
  try {
    await unlink(filePath);
  } catch {
    /* already gone */
  }
}

function checkFile(file: File, label: string) {
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(`${label}: file must be 5 MB or smaller`);
  }
  const ext = path.extname(file.name).toLowerCase();
  const allowedMime = ALLOWED_TYPES[ext];
  if (!allowedMime || !allowedMime.includes(file.type)) {
    throw new ValidationError(`${label}: only PDF, PNG or JPG files are allowed`);
  }
  return ext;
}

function parseIssueDate(value: string | undefined, label: string): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${label}: a valid issue date is required`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${label}: a valid issue date is required`);
  }
  if (date.getTime() > Date.now()) {
    throw new ValidationError(`${label}: issue date cannot be in the future`);
  }
  return date;
}

function parseDuration(
  rawValue: CertificateMeta["duration_value"],
  rawUnit: CertificateMeta["duration_unit"],
  label: string,
) {
  const valueStr = rawValue == null ? "" : String(rawValue).trim();
  const unit = (rawUnit ?? "").trim().toUpperCase();

  if (!valueStr && !unit) return { durationValue: null, durationUnit: null };

  if (!valueStr || !unit) {
    throw new ValidationError(
      `${label}: enter both duration number and unit, or leave both empty`,
    );
  }
  
  const n = Number(valueStr);
  if (!Number.isInteger(n) || n < 1 || n > 999) {
    throw new ValidationError(`${label}: duration must be a whole number from 1 to 999`);
  }
  if (!DURATION_UNITS.has(unit)) {
    throw new ValidationError(`${label}: invalid duration unit`);
  }
  
  // Explicitly return a JavaScript number for Prisma's Int? field
  return { durationValue: n, durationUnit: unit };
}

// ---------------------------------------------------------------------------
// PATCH /api/profile (certificates part)
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  const writtenFiles: string[] = []; // new uploads, cleaned up if the DB step fails

  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    let meta: CertificateMeta[];
    try {
      meta = JSON.parse((formData.get("certificates") as string) || "[]");
         console.log("certificates meta:", meta);
    } catch {
      return NextResponse.json({ error: "Invalid certificates data" }, { status: 400 });
    }
    if (!Array.isArray(meta) || meta.length === 0) {
      return NextResponse.json(
        { error: "At least one certificate is required" },
        { status: 400 },
      );
    }
    if (meta.length > MAX_CERTIFICATES) {
      return NextResponse.json(
        { error: `You can add up to ${MAX_CERTIFICATES} certificates` },
        { status: 400 },
      );
    }

    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Only ids that belong to THIS profile may be updated or deleted.
    const existing = await prisma.certificate.findMany({
      where: { profileId: profile.id },
      select: { id: true, document: true },
    });
    const existingById = new Map(existing.map((c) => [c.id, c.document]));

    // ---- 1. Validate everything before touching disk or DB ------------------
    const cleaned: CleanCertificate[] = meta.map((cert, i) => {
      const label = `Certificate ${i + 1}`;

      const name = (cert.name ?? "").trim();
      const organisation = (cert.organisation ?? "").trim();
      if (!name || name.length > 255) {
        throw new ValidationError(`${label}: certificate name is required (max 255 characters)`);
      }
      if (!organisation || organisation.length > 255) {
        throw new ValidationError(`${label}: issuing organisation is required (max 255 characters)`);
      }

      const issueDate = parseIssueDate(cert.issue_date, label);
      const { durationValue, durationUnit } = parseDuration(
        cert.duration_value,
        cert.duration_unit,
        label,
      );

      // Negative ids are unsaved rows from the form. Positive ids must exist
      // and belong to this profile.
      const isExisting = typeof cert.id === "number" && cert.id > 0;
      if (isExisting && !existingById.has(cert.id as number)) {
        throw new ValidationError(`${label}: not found`);
      }

      const rawFile = formData.get(`document_${i}`);
      const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
      if (file) checkFile(file, label);

      // Never trust a document path sent by the client. Keep the stored one.
      const keepDocument = isExisting
        ? (existingById.get(cert.id as number) ?? null)
        : null;

      if (!file && !keepDocument) {
        throw new ValidationError(`${label}: a supporting document is required`);
      }

      return {
        id: isExisting ? (cert.id as number) : null,
        certificateName: name,
        organisation,
        issueDate,
        durationValue,
        durationUnit,
        file,
        keepDocument,
      };
    });

    // ---- 2. Write new files (outside the transaction) -----------------------
    await mkdir(UPLOAD_DIR, { recursive: true });

    const documentUrls: string[] = [];
    for (const c of cleaned) {
      if (c.file) {
        const ext = path.extname(c.file.name).toLowerCase();
        const filename = `${profile.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const filePath = path.join(UPLOAD_DIR, filename);
        await writeFile(filePath, Buffer.from(await c.file.arrayBuffer()));
        writtenFiles.push(filePath);
        documentUrls.push(`${UPLOAD_URL_PREFIX}${filename}`);
      } else {
        documentUrls.push(c.keepDocument as string);
      }
    }

    // ---- 3. Database changes only (fast, atomic) ----------------------------
    const incomingIds = new Set(cleaned.filter((c) => c.id).map((c) => c.id as number));
    const idsToDelete = existing.map((c) => c.id).filter((id) => !incomingIds.has(id));

    const saved = await prisma.$transaction(async (tx) => {
      if (idsToDelete.length > 0) {
        await tx.certificate.deleteMany({
          where: { id: { in: idsToDelete }, profileId: profile.id },
        });
      }

      const results = [];
      for (let i = 0; i < cleaned.length; i++) {
        const c = cleaned[i];
        const data = {
          certificateName: c.certificateName,
          organisation: c.organisation,
          issueDate: c.issueDate,
          document: documentUrls[i],
          durationValue: c.durationValue,
          durationUnit: c.durationUnit,
        };

        results.push(
          c.id
            ? await tx.certificate.update({ where: { id: c.id }, data })
            : await tx.certificate.create({
                data: { ...data, profileId: profile.id },
              }),
        );
      }
      return results;
    });

    // ---- 4. After commit: delete files that are no longer used --------------
    for (const c of cleaned) {
      if (c.id && c.file) await removeUpload(existingById.get(c.id));
    }
    for (const id of idsToDelete) {
      await removeUpload(existingById.get(id));
    }

    return NextResponse.json({
      message: "Certificates updated successfully",
      certificates: saved,
    });
  } catch (error) {
    // Roll back any files written before the failure
    await Promise.all(
      writtenFiles.map((p) => unlink(p).catch(() => undefined)),
    );

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error saving certificates:", error);
    return NextResponse.json(
      { error: "Failed to update certificates" },
      { status: 500 },
    );
  }
}