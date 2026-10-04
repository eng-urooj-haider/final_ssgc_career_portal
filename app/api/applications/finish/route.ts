import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth"; // however you resolve the logged-in user
import { writeFile, mkdir } from "fs/promises";
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
    const decoded = verifyToken(token);
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // ---------------------------------------------------------------------
    // 1. Auth — never trust a client-supplied user id
    // ---------------------------------------------------------------------
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    // ---------------------------------------------------------------------
    // 2. job_id — required, must be a real number
    // ---------------------------------------------------------------------
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

    // ---------------------------------------------------------------------
    // 3. Load the applicant's profile — required for ownership checks and
    //    for naming saved files. Fail loudly if it doesn't exist, rather
    //    than silently skipping ownership validation below.
    // ---------------------------------------------------------------------
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Please complete your profile before applying." },
        { status: 422 },
      );
    }

    // ---------------------------------------------------------------------
    // 4. experience[] / certificate[] — parse, then verify ownership
    // ---------------------------------------------------------------------
    const experienceIds = toNumberArray(formData.getAll("experience[]"));
    const certificateIds = toNumberArray(formData.getAll("certificate[]"));

    if (experienceIds.length > 0) {
      const owned = await prisma.experience.findMany({
        where: { id: { in: experienceIds }, profileId: profile.id },
        select: { id: true },
      });

      if (owned.length !== experienceIds.length) {
        return NextResponse.json(
          { message: "One or more selected experiences are invalid." },
          { status: 422 },
        );
      }
    }

    if (certificateIds.length > 0) {
      const owned = await prisma.certificate.findMany({
        where: { id: { in: certificateIds }, profileId: profile.id },
        select: { id: true },
      });
      if (owned.length !== certificateIds.length) {
        return NextResponse.json(
          { message: "One or more selected certificates are invalid." },
          { status: 422 },
        );
      }
    }

    // ---------------------------------------------------------------------
    // 5. doc_1 / doc_2 — required only if the job asks for them; validate
    //    type/size for whichever files were actually sent
    // ---------------------------------------------------------------------
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

    // ---------------------------------------------------------------------
    // 6. Save files (only after all validation passes).
    //    "doc1"/"doc2" labels keep the two filenames distinct even when
    //    they belong to the same applicant and job.
    // ---------------------------------------------------------------------
    const doc1Path = await saveIfFile(doc1Entry, job.jobCode, profile, "doc1");
    const doc2Path = await saveIfFile(doc2Entry, job.jobCode, profile, "doc2");

    // ---------------------------------------------------------------------
    // 7. Persist
    // ---------------------------------------------------------------------
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
    const fullProfile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: true, education: true, certificates: true },
    });

    if (fullProfile) {
      const pdfBuffer = await buildCvPdf({
        profile: fullProfile,
        job: { jobCode: job.jobCode, title: job.title },
        application: { id: application.id, createdAt: application.createdAt },
      });


      // const cvDir = path.join(
      //   process.cwd(),
      //   "public",
      //   "uploads",
      //   "jobs",
      //   `job-${job.jobCode}`,
      //   "cv",
      // );
      // await mkdir(cvDir, { recursive: true });

      // const cvFilename = `${application.id}.pdf`;
      // await writeFile(path.join(cvDir, cvFilename), pdfBuffer);
    }
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
  if (!entry || !(entry instanceof File)) return null; // nothing to validate

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
  firstName: string;
  lastName: string;
}

async function saveIfFile(
  entry: FormDataEntryValue | null,
  jobCode: string,
  profile: ApplicantProfile,
  docLabel: "doc1" | "doc2",
): Promise<string | null> {
  if (!entry || !(entry instanceof File)) return null;

  const dir = path.join(UPLOAD_ROOT, `job-${jobCode}/attatchments`);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(entry.name);
  // Include docLabel so doc1 and doc2 from the same applicant never collide,
  // and a random suffix so repeat submissions don't overwrite each other.
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const safeCnic = (profile.cnic ?? `profile-${profile.id}`).replace(
    /[^a-zA-Z0-9-]/g,
    "",
  );
  const filename = `${safeCnic}-${docLabel}-${randomSuffix}${ext}`;
  const filePath = path.join(dir, filename);

  const buffer = Buffer.from(await entry.arrayBuffer());
  await writeFile(filePath, buffer);

  return `/uploads/jobs/job-${jobCode}/attachments/${filename}`;
}
