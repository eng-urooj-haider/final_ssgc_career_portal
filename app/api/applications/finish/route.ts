import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { buildCvPdf } from "@/app/lib/generateCv";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "jobs");
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return verifyToken(token).userId;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    // 2. job_id
    const jobIdRaw = formData.get("job_id");
    const jobId = Number(jobIdRaw);
    if (!jobIdRaw || Number.isNaN(jobId)) {
      return NextResponse.json(
        { message: "job_id is required and must be a valid number" },
        { status: 400 },
      );
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    // 3. Profile (with everything the CV needs)

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        experiences: true,
        education: {
          include: {
            institution: true,
            qualificationGroup: true,
            qualification: true,
          },
        },
        certificates: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Please complete your profile before applying." },
        { status: 422 },
      );
    }

    // 3b. Already applied? (JobApplication has @@unique([userId, jobId]))
    // const existing = await prisma.jobApplication.findUnique({
    //   where: { userId_jobId: { userId, jobId } },
    //   select: { id: true },
    // });
    // if (existing) {
    //   return NextResponse.json(
    //     { message: "You have already applied for this job." },
    //     { status: 409 },
    //   );
    // }

    // 4. experience[] / certificate[] — ownership is checked against the
    //    profile we already loaded, so no extra queries are needed.
    const experienceIds = toNumberArray(formData.getAll("experience[]"));
    const certificateIds = toNumberArray(formData.getAll("certificate[]"));

    const selectedExperiences = profile.experiences
      .filter((e) => experienceIds.includes(e.id))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    if (selectedExperiences.length !== new Set(experienceIds).size) {
      return NextResponse.json(
        { message: "One or more selected experiences are invalid." },
        { status: 422 },
      );
    }

    const selectedCertificates = profile.certificates.filter((c) =>
      certificateIds.includes(c.id),
    );

    if (selectedCertificates.length !== new Set(certificateIds).size) {
      return NextResponse.json(
        { message: "One or more selected certificates are invalid." },
        { status: 422 },
      );
    }

    // 5. doc_1 / doc_2
    const doc1Entry = formData.get("doc_1");
    const doc2Entry = formData.get("doc_2");

    if (job.req1DocTitle && !(doc1Entry instanceof File)) {
      return NextResponse.json(
        { message: `Please attach ${job.req1DocTitle}.` },
        { status: 422 },
      );
    }
    if (job.req2DocTitle && !(doc2Entry instanceof File)) {
      return NextResponse.json(
        { message: `Please attach ${job.req2DocTitle}.` },
        { status: 422 },
      );
    }

    const fileError =
      validateFile(doc1Entry, "doc_1") ?? validateFile(doc2Entry, "doc_2");
    if (fileError) {
      return NextResponse.json({ message: fileError }, { status: 422 });
    }

    // 6. Save uploaded documents
    const doc1Path = await saveIfFile(doc1Entry, job.jobCode, profile, "doc1");
    const doc2Path = await saveIfFile(doc2Entry, job.jobCode, profile, "doc2");

    // 7. Persist the application
    const application = await prisma.jobApplication.create({
      data: {
        userId,
        jobId,
        selectedExperienceIds: experienceIds,
        selectedCertificateIds: certificateIds,
        doc1Path,
        doc2Path,
      },
    });
    const ids = application?.selectedExperienceIds ?? [];

    const experiences = ids.length
      ? await prisma.experience.findMany({
          where: { id: { in: ids } },
          orderBy: { startDate: "asc" },
        })
      : [];
    // 8. Profile photo -> base64 data URI
    let userPicDataUri: string | null = null;
    if (profile.userPic) {
      const picPath = path.join(
        process.cwd(),
        "public",
        profile.userPic.replace(/^\/+/, ""),
      );
      if (existsSync(picPath)) {
        const base64 = readFileSync(picPath).toString("base64");
        userPicDataUri = `data:image/jpeg;base64,${base64}`;
      }
    }

    // 9. Build and save the CV snapshot
    const pdfBuffer = await buildCvPdf({
      profile: {
        ...profile,
        userPic: userPicDataUri,
      },
      job: {
        jobCode: job.jobCode,
        title: job.title,
      },
      application: {
        id: application?.id, // shows APP-<real id> in the PDF
        createdAt: application?.createdAt,
      },
      experiences,
    });

    const cvDir = path.join(UPLOAD_ROOT, `job-${job.jobCode}`, "cv");
    await mkdir(cvDir, { recursive: true });
    await writeFile(
      path.join(
        cvDir,
        `${profile.firstName}-${profile.lastName}-${profile.cnic}.pdf`,
      ),
      pdfBuffer,
    );

    return NextResponse.json(
      {
        message: "Application submitted successfully",
        data: { id: application.id },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to submit application", err);
    return NextResponse.json(
      { message: "Something went wrong while saving your application" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumberArray(values: FormDataEntryValue[]): number[] {
  return values.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
}

/** Returns an error message if the entry is a File that fails validation, otherwise null. */
function validateFile(
  entry: FormDataEntryValue | null,
  fieldLabel: string,
): string | null {
  if (!entry || !(entry instanceof File)) return null;

  if (!ALLOWED_MIME.has(entry.type)) {
    return `${fieldLabel}: only PDF or Word documents are allowed.`;
  }
  if (entry.size > MAX_FILE_SIZE) {
    return `${fieldLabel}: file must be under 10 MB.`;
  }
  return null;
}

interface ApplicantProfile {
  id: number;
  cnic: string | null;
}

async function saveIfFile(
  entry: FormDataEntryValue | null,
  jobCode: string,
  profile: ApplicantProfile,
  docLabel: "doc1" | "doc2",
): Promise<string | null> {
  if (!entry || !(entry instanceof File)) return null;

  const dir = path.join(UPLOAD_ROOT, `job-${jobCode}`, "attachments");
  await mkdir(dir, { recursive: true });

  const ext = path.extname(entry.name).toLowerCase();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const safeCnic =
    (profile.cnic ?? "").replace(/[^a-zA-Z0-9-]/g, "") ||
    `profile-${profile.id}`;
  const filename = `${safeCnic}-${docLabel}-${randomSuffix}${ext}`;

  await writeFile(
    path.join(dir, filename),
    Buffer.from(await entry.arrayBuffer()),
  );

  return `/uploads/jobs/job-${jobCode}/attachments/${filename}`;
}
