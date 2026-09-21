// app/api/jobs/[id]/route.ts
import prisma from "../../../lib/db";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { JobType } from "@/app/generated/prisma/enums";

/* -------------------------------------------------------------------------- */
/*  Helpers (identical to the POST route; move to app/lib/jobHelpers.ts and    */
/*  import them in both files to avoid the duplication)                        */
/* -------------------------------------------------------------------------- */

const TITLE_MAX = 50;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const capitalizeFirst = (s: string) =>
  s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const capitalizeWords = (s: string) =>
  s.replace(/(^|[\s-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());

const safeSegment = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");
const safeFilename = (s: string) => {
  const base = path.basename(s);
  const ext = path.extname(base).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
  const name = path
    .basename(base, path.extname(base))
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);
  return `${name}${ext}`;
};

const optStr = (v: FormDataEntryValue | null, max?: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return max ? t.slice(0, max) : t;
};

const UPLOAD_ROOT = path.resolve(process.cwd(), "public", "uploads");

function validateFile(file: FormDataEntryValue | null): string | null {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED_TYPES.has(file.type))
    return "Only PDF, PNG or JPG files are allowed";
  if (file.size > MAX_FILE_SIZE) return "File must be 5 MB or smaller";
  return null;
}

async function saveFile(file: FormDataEntryValue | null, jobCode: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  const folder = `job-${safeSegment(jobCode)}`;
  const dir = path.join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${safeFilename(file.name)}`;
  await writeFile(
    path.join(dir, filename),
    Buffer.from(await file.arrayBuffer()),
  );
  return `/uploads/${folder}/${filename}`; // must fit VarChar(255)
}

// Best-effort delete; refuses anything outside public/uploads
async function removeUpload(publicPath: string | null | undefined) {
  if (!publicPath) return;
  const full = path.resolve(process.cwd(), "public", `.${publicPath}`);
  if (!full.startsWith(UPLOAD_ROOT + path.sep)) return;
  await unlink(full).catch(() => {});
}

const parseId = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

type Ctx = { params: Promise<{ id: string }> };

/* -------------------------------------------------------------------------- */
/*  GET                                                                        */
/* -------------------------------------------------------------------------- */

export const GET = async (_req: NextRequest, { params }: Ctx) => {
  try {
    const jobId = parseId((await params).id);
    if (!jobId) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
};

/* -------------------------------------------------------------------------- */
/*  PUT                                                                        */
/* -------------------------------------------------------------------------- */

export const PUT = async (req: NextRequest, { params }: Ctx) => {
  const newFiles: string[] = []; // written during this request (rollback on failure)
  try {
    // TODO: check session / role here and return 401/403

    const jobId = parseId((await params).id);
    if (!jobId) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const existingJob = await prisma.job.findUnique({ where: { id: jobId } });
    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const data = await req.formData();

    /* ---- required text fields ---- */
    const jobCode = String(data.get("job_code") ?? "").trim();
    const title = capitalizeFirst(String(data.get("title") ?? "").trim());
    const qualification = String(data.get("qualification") ?? "").trim();
    const jobTypeRaw = String(data.get("job_type") ?? "").trim();

    if (!jobCode || !title || !qualification || !jobTypeRaw) {
      return NextResponse.json(
        { error: "job_code, title, qualification and job_type are required" },
        { status: 400 },
      );
    }
    if (jobCode.length > 50) {
      return NextResponse.json(
        { error: "job_code must be 50 characters or fewer" },
        { status: 400 },
      );
    }
    if (title.length > TITLE_MAX) {
      return NextResponse.json(
        { error: `title must be ${TITLE_MAX} characters or fewer` },
        { status: 400 },
      );
    }

    /* ---- job type (enum) ---- */
    if (!(Object.values(JobType) as string[]).includes(jobTypeRaw)) {
      return NextResponse.json(
        {
          error: `Invalid job_type. Allowed: ${Object.values(JobType).join(", ")}`,
        },
        { status: 400 },
      );
    }
    const jobType = jobTypeRaw as JobType;

    /* ---- cities ---- */
    let cities: string[];
    try {
      const parsed = JSON.parse(String(data.get("cities") ?? ""));
      if (
        !Array.isArray(parsed) ||
        parsed.length === 0 ||
        !parsed.every((c) => typeof c === "string" && c.trim())
      ) {
        throw new Error("bad cities");
      }
      cities = parsed.map((c: string) => capitalizeWords(c.trim()));
    } catch {
      return NextResponse.json(
        { error: "cities must be a non-empty JSON array of city names" },
        { status: 400 },
      );
    }

    /* ---- dates ---- */
    const publicationDate = new Date(String(data.get("publication_date")));
    const deadline = new Date(String(data.get("deadline")));
    if (
      Number.isNaN(publicationDate.getTime()) ||
      Number.isNaN(deadline.getTime())
    ) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (deadline < publicationDate) {
      return NextResponse.json(
        { error: "Deadline cannot be before the publication date" },
        { status: 400 },
      );
    }

    /* ---- age (form field "age" -> maxAge) ---- */
    const ageRaw = optStr(data.get("age"));
    const maxAge = ageRaw ? Number(ageRaw) : null;
    if (
      maxAge !== null &&
      (!Number.isInteger(maxAge) || maxAge < 18 || maxAge > 80)
    ) {
      return NextResponse.json({ error: "Invalid age" }, { status: 400 });
    }

    /* ---- email ---- */
    const email = optStr(data.get("email"), 254);
    if (jobType === "Email" && !email) {
      return NextResponse.json(
        { error: "Email is required for Email job type" },
        { status: 400 },
      );
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    /* ---- attachments: validate before touching the disk ---- */
    const file1 = data.get("attachment_1_doc");
    const file2 = data.get("attachment_2_doc");
    const fileError = validateFile(file1) ?? validateFile(file2);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const doc1Title = optStr(data.get("attachment_1_title"), 200);
    const doc2Title = optStr(data.get("attachment_2_title"), 200);
    const hasNew1 = file1 instanceof File && file1.size > 0;
    const hasNew2 = file2 instanceof File && file2.size > 0;

    if (hasNew1 && !doc1Title) {
      return NextResponse.json(
        { error: "Attachment 1 needs a title" },
        { status: 400 },
      );
    }
    if (hasNew2 && !doc2Title) {
      return NextResponse.json(
        { error: "Attachment 2 needs a title" },
        { status: 400 },
      );
    }

    /* ---- profile completion: only re-lookup if the type changed ---- */
    let profileCompletionId = existingJob.profileCompletionId;
    if (jobType !== existingJob.jobType) {
      const completion = await prisma.profileCompletion.findFirst({
        where: { name: jobTypeRaw },
      });
      if (!completion) {
        return NextResponse.json(
          { error: `No profile completion found for "${jobTypeRaw}"` },
          { status: 404 },
        );
      }
      profileCompletionId = completion.id;
    }

    /* ---- write new files ---- */
    let doc1Attachment = existingJob.doc1Attachment;
    let doc2Attachment = existingJob.doc2Attachment;
    const toDelete: (string | null)[] = []; // old files, removed after DB success

    if (hasNew1) {
      const saved = await saveFile(file1, jobCode);
      if (saved) {
        newFiles.push(saved);
        toDelete.push(existingJob.doc1Attachment);
        doc1Attachment = saved;
      }
    } else if (!doc1Title && existingJob.doc1Attachment) {
      // Title cleared and no replacement -> remove the attachment
      toDelete.push(existingJob.doc1Attachment);
      doc1Attachment = null;
    }

    if (hasNew2) {
      const saved = await saveFile(file2, jobCode);
      if (saved) {
        newFiles.push(saved);
        toDelete.push(existingJob.doc2Attachment);
        doc2Attachment = saved;
      }
    } else if (!doc2Title && existingJob.doc2Attachment) {
      toDelete.push(existingJob.doc2Attachment);
      doc2Attachment = null;
    }

    /* ---- update ---- */
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        jobCode,
        title,
        cities,
        publicationDate,
        deadline,
        maxAge,
        qualification,
        skill: optStr(data.get("skills")),
        responsibility: optStr(data.get("responsibilities")),
        specialInfo: optStr(data.get("special_info")),
        jobType,
        email: jobType === "Email" ? email : null,
        doc1Title: doc1Attachment ? doc1Title : null,
        doc1Attachment,
        doc2Title: doc2Attachment ? doc2Title : null,
        doc2Attachment,
        req1DocTitle: optStr(data.get("request_doc_1_title"), 200),
        req2DocTitle: optStr(data.get("request_doc_2_title"), 200),
        profileCompletionId,
      },
    });

    // DB succeeded -> now it's safe to delete replaced/removed files
    await Promise.all(toDelete.map(removeUpload));

    return NextResponse.json({ data: job });
  } catch (error: any) {
    // Roll back files written during this request
    await Promise.all(newFiles.map(removeUpload));

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A job with this code already exists" },
        { status: 409 },
      );
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 },
    );
  }
};

/* -------------------------------------------------------------------------- */
/*  DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export const DELETE = async (_req: NextRequest, { params }: Ctx) => {
  try {
    // TODO: check session / role here and return 401/403

    const jobId = parseId((await params).id);
    if (!jobId) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const job = await prisma.job.delete({ where: { id: jobId } });

    await Promise.all([
      removeUpload(job.doc1Attachment),
      removeUpload(job.doc2Attachment),
    ]);

    return NextResponse.json({ message: "Job deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    // Foreign key from another table (e.g. applications) blocks the delete
    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "This job has related records and cannot be deleted" },
        { status: 409 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 },
    );
  }
};