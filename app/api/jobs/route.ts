import prisma from "../../lib/db";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// app/api/job/route.ts

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 10);
    const search = searchParams.get("search") ?? "";

    const where = search
      ? { title: { contains: search } }
      : {};

    const [job, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.job.count({ where }),
    ]);

    // Format created_at here, so the frontend never has to touch raw Date objects
    const data = job.map((job) => ({
      ...job,
      created_at_formatted: new Date(job.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
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
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const data = await req.formData();
    const job_code = data.get("job_code") as string;

    // --- Handle attachment 1 ---
    const file1 = data.get("attachment_1_doc") as File | null;
    let doc1_attachment: string | null = null;

    if (file1 && file1.size > 0) {
      const buffer = Buffer.from(await file1.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads", `job-${job_code}`);
      await mkdir(uploadDir, { recursive: true });

      const filename = `${Date.now()}-${file1.name}`;
      await writeFile(path.join(uploadDir, filename), buffer);

      doc1_attachment = `/uploads/job-${job_code}/${filename}`;
    }

    // --- Handle attachment 2 ---
    const file2 = data.get("attachment_2_doc") as File | null;
    let doc2_attachment: string | null = null;

    if (file2 && file2.size > 0) {
      const buffer = Buffer.from(await file2.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads", `job-${job_code}`);
      await mkdir(uploadDir, { recursive: true });

      const filename = `${Date.now()}-${file2.name}`;
      await writeFile(path.join(uploadDir, filename), buffer);

      doc2_attachment = `/uploads/job-${job_code}/${filename}`;
    }

    const job = await prisma.job.create({
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

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
};