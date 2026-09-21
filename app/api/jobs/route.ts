import prisma from "../../lib/db";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { JobType } from "@/app/generated/prisma/enums";

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const safeSegment = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");
const safeFilename = (s: string) => {
  const base = path.basename(s);
  const ext = path
    .extname(base)
    .replace(/[^a-zA-Z0-9.]/g, "")
    .slice(0, 10);
  const name = path
    .basename(base, path.extname(base))
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);
  return `${name}${ext}`;
};

// Empty / missing form value -> null, otherwise trimmed string
const optStr = (v: FormDataEntryValue | null, max?: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return max ? t.slice(0, max) : t;
};

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
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${safeFilename(file.name)}`;
  await writeFile(
    path.join(dir, filename),
    Buffer.from(await file.arrayBuffer()),
  );
  // Must fit in VarChar(255)
  return `/uploads/${folder}/${filename}`;
}

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(searchParams.get("limit"))) || 10),
    );
    const search = (searchParams.get("search") ?? "").trim();

    const where = search ? { title: { contains: search } } : {};

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.job.count({ where }),
    ]);

    const data = jobs.map((j) => ({
      ...j,
      deadline_formatted: new Date(j.deadline).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC", // @db.Date is stored as UTC midnight
      }),
    }));

    return NextResponse.json({
      data,
      total,
      last_page: Math.ceil(total / limit),
      from: total === 0 ? 0 : (page - 1) * limit + 1,
      to: Math.min(page * limit, total),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
};

export const POST = async (req: NextRequest) => {
  const savedFiles: string[] = [];
  try {
    // TODO: check session / role here and return 401/403

    const data = await req.formData();

    const jobCode = String(data.get("job_code") ?? "").trim();
    const title = String(data.get("title") ?? "").trim();
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
    if (title.length > 250) {
      return NextResponse.json(
        { error: "title must be 250 characters or fewer" },
        { status: 400 },
      );
    }

    // jobType is a Prisma enum, so it must match one of its values exactly
    if (!(Object.values(JobType) as string[]).includes(jobTypeRaw)) {
      return NextResponse.json(
        {
          error: `Invalid job_type. Allowed: ${Object.values(JobType).join(", ")}`,
        },
        { status: 400 },
      );
    }
    const jobType = jobTypeRaw as JobType;

    // cities: JSON array of non-empty strings
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
      cities = parsed.map((c: string) => c.trim());
    } catch {
      return NextResponse.json(
        { error: "cities must be a non-empty JSON array of city names" },
        { status: 400 },
      );
    }

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

    // The form field is still called "age"; it maps to maxAge
    const ageRaw = optStr(data.get("age"));
    const maxAge = ageRaw ? Number(ageRaw) : null;
    if (
      maxAge !== null &&
      (!Number.isInteger(maxAge) || maxAge < 18 || maxAge > 80)
    ) {
      return NextResponse.json({ error: "Invalid age" }, { status: 400 });
    }
    const email = optStr(data.get("email"), 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    // ...inside prisma.job.create({ data: { ... } })
    const file1 = data.get("attachment_1_doc");
    const file2 = data.get("attachment_2_doc");
    const fileError = validateFile(file1) ?? validateFile(file2);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    // NOTE: this assumes ProfileCompletion.name holds the same value as the
    // JobType enum. If it doesn't, look it up by whatever field you actually
    // send from the form (e.g. an id).
    const completion = await prisma.profileCompletion.findFirst({
      where: { name: jobTypeRaw },
    });
    if (!completion) {
      return NextResponse.json(
        { error: `No profile completion found for "${jobTypeRaw}"` },
        { status: 404 },
      );
    }

    // Only touch the disk after everything else has passed
    const doc1Attachment = await saveFile(file1, jobCode);
    if (doc1Attachment) savedFiles.push(doc1Attachment);
    const doc2Attachment = await saveFile(file2, jobCode);
    if (doc2Attachment) savedFiles.push(doc2Attachment);

    const job = await prisma.job.create({
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
        email: email,
        doc1Title: optStr(data.get("attachment_1_title"), 200),
        doc1Attachment,
        doc2Title: optStr(data.get("attachment_2_title"), 200),
        doc2Attachment,
        req1DocTitle: optStr(data.get("request_doc_1_title"), 200),
        req2DocTitle: optStr(data.get("request_doc_2_title"), 200),
        profileCompletionId: completion.id,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error: any) {
    // Clean up any files written before the failure
    await Promise.all(
      savedFiles.map((f) =>
        unlink(path.join(process.cwd(), "public", f)).catch(() => {}),
      ),
    );

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A job with this code already exists" },
        { status: 409 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 },
    );
  }
};
