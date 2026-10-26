// app/api/test-cv-real/route.ts
//
// FOR TESTING ONLY — delete before deploying (no login required).
// Visit: http://localhost:3000/api/test-cv-real?userId=1&jobId=1

import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { buildCvPdf, CV_PROFILE_INCLUDE } from "@/app/lib/generateCv";

export async function GET(req: NextRequest) {
  const userId = Number(req.nextUrl.searchParams.get("userId"));
  const jobId = Number(req.nextUrl.searchParams.get("jobId"));

  if (!userId || !jobId) {
    return NextResponse.json(
      { error: "Add ?userId=1&jobId=1 to the URL (use real ids from your database)" },
      { status: 400 },
    );
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: "No job found with that id" }, { status: 404 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: CV_PROFILE_INCLUDE,
  });
  if (!profile) {
    return NextResponse.json({ error: "No profile found for that userId" }, { status: 404 });
  }

  // buildCvPdf resolves the profile picture itself, so pass the profile as-is.
  const pdfBuffer = await buildCvPdf({
    profile,
    job: {
      jobCode: job.jobCode,
      title: job.title,
      publicationDate: job.publicationDate,
    },
    application: { id: 0, createdAt: new Date() }, // 0 = preview
  });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=real-cv-test.pdf",
    },
  });
}