import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { saveReferences } from "@/app/lib/validation/refrence";
import { saveProjects } from "@/app/lib/validation/project";
import { saveAchievements } from "@/app/lib/validation/achievements";
import { saveSkills } from "@/app/lib/validation/skill";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

class ValidationError extends Error {}

function parseSafeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const sanitized = value.trim().toUpperCase();
    return sanitized === "YES" || sanitized === "TRUE" || sanitized === "1";
  }
  if (typeof value === "number") return value === 1;
  return false;
}

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return verifyToken(token).userId ?? null;
  } catch {
    return null; // expired or invalid
  }
}

function parseFlexibleDate(value: unknown): Date | null {
  if (!value || typeof value !== "string" || !value.trim()) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const withDay = new Date(`${value}-01`);
  if (!Number.isNaN(withDay.getTime())) return withDay;

  return null;
}

/** "other", "", null, undefined and anything non-numeric become null (never NaN). */
function toIntOrNull(v: unknown): number | null {
  if (v === "other" || v === "" || v == null) return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function textOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

// ---------------------------------------------------------------------------
// Certificates: config + helpers
// ---------------------------------------------------------------------------

const UPLOAD_URL_PREFIX = "/uploads/certificates/";
const UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "certificates",
);
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
  document?: string | null; // ignored on purpose: never trust client paths
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
  keepDocument: string | null; // stored document to keep when no new file
}

async function removeUpload(documentUrl: string | null | undefined) {
  if (!documentUrl || !documentUrl.startsWith(UPLOAD_URL_PREFIX)) return;
  try {
    await unlink(path.join(UPLOAD_DIR, path.basename(documentUrl)));
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
    throw new ValidationError(
      `${label}: only PDF, PNG or JPG files are allowed`,
    );
  }
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
    throw new ValidationError(
      `${label}: duration must be a whole number from 1 to 999`,
    );
  }
  if (!DURATION_UNITS.has(unit)) {
    throw new ValidationError(`${label}: invalid duration unit`);
  }
  return { durationValue: n, durationUnit: unit };
}

/**
 * Validates, stores files, then upserts certificates in one transaction.
 * Throws ValidationError for bad input. Cleans up new files on any failure.
 */
async function saveCertificates(
  profileId: number,
  meta: unknown,
  formData: FormData | null,
) {
  if (!Array.isArray(meta) || meta.length === 0) {
    throw new ValidationError("At least one certificate is required");
  }
  if (meta.length > MAX_CERTIFICATES) {
    throw new ValidationError(
      `You can add up to ${MAX_CERTIFICATES} certificates`,
    );
  }
  const items = meta as CertificateMeta[];

  // Only ids that belong to THIS profile may be updated or deleted.
  const existing = await prisma.certificate.findMany({
    where: { profileId },
    select: { id: true, document: true },
  });
  const existingById = new Map(existing.map((c) => [c.id, c.document]));

  // ---- 1. Validate everything before touching disk or DB ------------------
  const cleaned: CleanCertificate[] = items.map((cert, i) => {
    const label = `Certificate ${i + 1}`;

    const name = (cert.name ?? "").trim();
    const organisation = (cert.organisation ?? "").trim();
    if (!name || name.length > 255) {
      throw new ValidationError(
        `${label}: certificate name is required (max 255 characters)`,
      );
    }
    if (!organisation || organisation.length > 255) {
      throw new ValidationError(
        `${label}: issuing organisation is required (max 255 characters)`,
      );
    }

    const issueDate = parseIssueDate(cert.issue_date, label);
    const { durationValue, durationUnit } = parseDuration(
      cert.duration_value,
      cert.duration_unit,
      label,
    );

    // Negative ids are unsaved rows from the form; positive ids must belong
    // to this profile.
    const isExisting = typeof cert.id === "number" && cert.id > 0;
    if (isExisting && !existingById.has(cert.id as number)) {
      throw new ValidationError(`${label}: not found`);
    }

    const rawFile = formData?.get(`document_${i}`);
    const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
    if (file) checkFile(file, label);

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
  const writtenFiles: string[] = [];
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const documentUrls: string[] = [];
    for (const c of cleaned) {
      if (c.file) {
        const ext = path.extname(c.file.name).toLowerCase();
        const filename = `${profileId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const filePath = path.join(UPLOAD_DIR, filename);
        await writeFile(filePath, Buffer.from(await c.file.arrayBuffer()));
        writtenFiles.push(filePath);
        documentUrls.push(`${UPLOAD_URL_PREFIX}${filename}`);
      } else {
        documentUrls.push(c.keepDocument as string);
      }
    }

    // ---- 3. Database changes only (fast, atomic) --------------------------
    const incomingIds = new Set(
      cleaned.filter((c) => c.id).map((c) => c.id as number),
    );
    const idsToDelete = existing
      .map((c) => c.id)
      .filter((id) => !incomingIds.has(id));

    const saved = await prisma.$transaction(async (tx) => {
      if (idsToDelete.length > 0) {
        await tx.certificate.deleteMany({
          where: { id: { in: idsToDelete }, profileId },
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
          durationValue: c.durationValue, // Int? column
          durationUnit: c.durationUnit,
        };

        results.push(
          c.id
            ? await tx.certificate.update({ where: { id: c.id }, data })
            : await tx.certificate.create({ data: { ...data, profileId } }),
        );
      }
      return results;
    });

    // ---- 4. After commit: delete files that are no longer used ------------
    for (const c of cleaned) {
      if (c.id && c.file) await removeUpload(existingById.get(c.id));
    }
    for (const id of idsToDelete) {
      await removeUpload(existingById.get(id));
    }

    return saved;
  } catch (error) {
    // Roll back files written before the failure
    await Promise.all(
      writtenFiles.map((p) => unlink(p).catch(() => undefined)),
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/profile
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Detect whether request content is FormData or JSON
  const contentType = req.headers.get("content-type") || "";
  let body: Record<string, any> = {};
  let formData: FormData | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      formData = await req.formData();
      const certificatesRaw = formData.get("certificates");
      if (typeof certificatesRaw === "string" && certificatesRaw) {
        body.certificates = JSON.parse(certificatesRaw);
      }
    } else {
      body = await req.json();
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Ensure Profile row exists
  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // --- Personal details tab ---------------------------------------------
  if (
    !body.experience &&
    !body.education &&
    !body.certificates &&
    !body.memberships &&
    !body.references &&
    !body.projects &&
    !body.achievements &&
    !body.coreSkills
  ) {
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        fatherName: body.father_name,
        maritalStatus: body.marital_status,
        childrenCount: toIntOrNull(body.children), // "5+" -> 5
        dateOfBirth: body.date_of_birth ? new Date(body.date_of_birth) : null,
        birthCountryId: toIntOrNull(body.birth_country),
        birthCityId: toIntOrNull(body.birth_city), // "other" -> null (not NaN)
        birthCityOther: textOrNull(body.birth_city_other),
        passportNo: body.passport_no,
        domicile: body.domicile,
        mobilePrefix: body.mobile_prefix,
        mobileNumber: body.mobile_number,
        homePrefix: body.home_prefix,
        homeNumber: body.home_number,
        officePrefix: body.office_prefix,
        officeNumber: body.office_number,
        currentAddress: body.current_address,
        permanentAddress: body.permanent_address,
        alreadyWorkedSsgc: parseSafeBoolean(body.already_worked_ssgc),
        ssgcEmployeeName: body.ssgc_employee_name,
        ssgcEmployeeNumber: body.ssgc_employee_number,
        isPakistani: parseSafeBoolean(body.is_pakistani),
      },
    });
    return NextResponse.json({ profile: updated });
  }

  // --- Experience tab ----------------------------------------------------
  if (body.experience) {
    await prisma.$transaction([
      prisma.experience.deleteMany({ where: { profileId: profile.id } }),
      prisma.experience.createMany({
        data: body.experience.map((e: any) => ({
          profileId: profile.id,
          jobTitle: e.job_title,
          company: e.company,
          country: toIntOrNull(e.country),
          city: toIntOrNull(e.city),
          startDate: parseFlexibleDate(e.start_date),
          endDate: parseFlexibleDate(e.end_date),
          salary: e.salary || null,
          responsibility: e.responsibilities || null,
          reasonForLeave: e.reason || null,
          cityOther: e.city_other || "",
        })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  // --- Education tab -----------------------------------------------------
  if (body.education) {
    for (const e of body.education) {
      if (
        e.qualification_group_id === "other" &&
        !textOrNull(e.qualification_group_other)
      )
        return NextResponse.json(
          { error: "Qualification level name required" },
          { status: 400 },
        );
      if (e.qualification_id === "other" && !textOrNull(e.qualification_other))
        return NextResponse.json(
          { error: "Degree name required" },
          { status: 400 },
        );
      if (e.institute_id === "other" && !textOrNull(e.institute_other))
        return NextResponse.json(
          { error: "Institute name required" },
          { status: 400 },
        );
    }

    await prisma.$transaction([
      prisma.education.deleteMany({ where: { profileId: profile.id } }),
      prisma.education.createMany({
        data: body.education.map((e: any) => {
          const groupOther = e.qualification_group_id === "other";
          const qualOther = e.qualification_id === "other";
          const instOther = e.institute_id === "other";
          const cityOther = e.city === "other";

          return {
            profileId: profile.id,
            qualificationGroupId: groupOther
              ? null
              : toIntOrNull(e.qualification_group_id),
            qualificationGroupOther: groupOther
              ? textOrNull(e.qualification_group_other)
              : null,
            qualificationId: qualOther ? null : toIntOrNull(e.qualification_id),
            qualificationOther: qualOther
              ? textOrNull(e.qualification_other)
              : null,
            institutionId: instOther ? null : toIntOrNull(e.institute_id),
            instituteOther: instOther ? textOrNull(e.institute_other) : null,
            majorSubject: e.major_subject,
            countryId: Number(e.country),
            cityId: cityOther ? null : toIntOrNull(e.city),
            cityOther: cityOther ? textOrNull(e.city_other) : null,
            passingYear: Number(e.passing_year),
            obtainedMarks: Number(e.obtained_marks_gpa),
            totalMarks: Number(e.total_marks_gpa),
            divisionGrade: e.division_grade || null,
          };
        }),
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  // --- Certificates tab --------------------------------------------------
  if (body.certificates) {
    try {
      const saved = await saveCertificates(
        profile.id,
        body.certificates,
        formData,
      );
      return NextResponse.json({ ok: true, certificates: saved });
    } catch (error) {
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

  // --- Memberships tab ---------------------------------------------------
  if (body.memberships) {
    await prisma.$transaction([
      prisma.membership.deleteMany({ where: { profileId: profile.id } }),
      prisma.membership.createMany({
        data: body.memberships.map((m: any) => ({
          profileId: profile.id,
          organisation: m.organisation,
          membershipType: m.membership_type || null,
          memberSince: m.member_since || null,
        })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  }
  // --- References tab ----------------------------------------------------
  if (body.references) {
    try {
      const saved = await saveReferences(profile.id, body.references);
      return NextResponse.json({ ok: true, references: saved });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Error saving references:", error);
      return NextResponse.json(
        { error: "Failed to update references" },
        { status: 500 },
      );
    }
  }
  // --- Projects & Research tab -------------------------------------------
  if (body.projects) {
    try {
      const saved = await saveProjects(profile.id, body.projects);
      return NextResponse.json({ ok: true, projects: saved });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Error saving projects:", error);
      return NextResponse.json(
        { error: "Failed to update projects and research" },
        { status: 500 },
      );
    }
  }
  // --- Achievements & Awards tab -----------------------------------------
  if (body.achievements) {
    console.log(body.achievements);
    try {
      const saved = await saveAchievements(profile.id, body.achievements);
      console.log(saved);
      return NextResponse.json({ ok: true, achievements: saved });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Error saving achievements:", error);
      return NextResponse.json(
        { error: "Failed to update achievements and awards" },
        { status: 500 },
      );
    }
  }
  // --- Skills & Languages tab --------------------------------------------
  if (body.coreSkills) {
    try {
      const skillsData = body.skills || body;
      const saved = await saveSkills(profile.id, skillsData);
      console.log(saved);
      return NextResponse.json({ ok: true, skills: saved });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Error saving skills:", error);
      return NextResponse.json(
        { error: "Failed to update skills and languages" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Unrecognised payload" }, { status: 400 });
}
