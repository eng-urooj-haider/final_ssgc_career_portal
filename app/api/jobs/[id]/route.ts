// app/api/jobs/[id]/route.ts
import prisma from "../../../lib/db"; // adjust if your db.ts lives elsewhere
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id: Number(id) },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
};

export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const jobId = Number(id);
    const data = await req.formData();
    const job_code = data.get("job_code") as string;

    // Fetch the existing record first — needed to fall back to old attachment
    // paths when the user doesn't upload a new file.
    const existingJob = await prisma.job.findUnique({ where: { id: jobId } });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // --- Attachment 1: only overwrite if a new file was actually uploaded ---
    const file1 = data.get("attachment_1_doc") as File | null;
    let doc1_attachment = existingJob.doc1_attachment;

    if (file1 && file1.size > 0) {
      const buffer = Buffer.from(await file1.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads", `job-${job_code}`);
      await mkdir(uploadDir, { recursive: true });

      const filename = `${Date.now()}-${file1.name}`;
      await writeFile(path.join(uploadDir, filename), buffer);

      doc1_attachment = `/uploads/job-${job_code}/${filename}`;
    }

    // --- Attachment 2: same "keep existing unless replaced" logic ---
    const file2 = data.get("attachment_2_doc") as File | null;
    let doc2_attachment = existingJob.doc2_attachment;

    if (file2 && file2.size > 0) {
      const buffer = Buffer.from(await file2.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads", `job-${job_code}`);
      await mkdir(uploadDir, { recursive: true });

      const filename = `${Date.now()}-${file2.name}`;
      await writeFile(path.join(uploadDir, filename), buffer);

      doc2_attachment = `/uploads/job-${job_code}/${filename}`;
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        job_code,
        title: data.get("title") as string,
        city: JSON.parse(data.get("cities") as string),
        publication_date: new Date(data.get("publication_date") as string),
        deadline: new Date(data.get("deadline") as string),
        age: data.get("age") ? Number(data.get("age")) : null,
        qualification: data.get("qualification") as string,
        skill: data.get("skills") as string | null,
        responsibility: data.get("responsibilities") as string | null,
        special_info: data.get("special_info") as string | null,
        doc1_title: data.get("attachment_1_title") as string | null,
        doc1_attachment,
        doc2_title: data.get("attachment_2_title") as string | null,
        doc2_attachment,
        req1_doc_title: data.get("request_doc_1_title") as string | null,
        req2_doc_title: data.get("request_doc_2_title") as string | null,
        job_type: data.get("job_type") as string,
        email: data.get("email") as string | null,
      },
    });

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
};

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    await prisma.job.delete({ where: { id: Number(id) } });

    return NextResponse.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
};