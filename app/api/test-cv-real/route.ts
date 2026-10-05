import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { buildCvPdf } from "@/app/lib/generateCv";
import path from "path";
import { existsSync, readFileSync } from "fs";

export async function GET(req: NextRequest) {
  const userId = Number(req.nextUrl.searchParams.get("userId"));
  const jobId = Number(req.nextUrl.searchParams.get("jobId"));

  if (!userId || !jobId) {
    return NextResponse.json(
      {
        error:
          "Add ?userId=1&jobId=1 to the URL (use real ids from your database)",
      },
      { status: 400 },
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return NextResponse.json(
      { error: "No job found with that id" },
      { status: 404 },
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      experiences: true,
      education: {
        include: {
          institution: true,
          qualificationGroup:true,
          qualification: true, // only if you created this relation
        },
      },
      certificates: true,
    },
  });
  console.log('profilesdfsef' , profile)
  const jobApplication = await prisma.jobApplication.findUnique({
    where: { id: 11 },
    select: { selectedExperienceIds: true, id: true, createdAt: true }, // fetch only the field you need
  });

  const ids = jobApplication?.selectedExperienceIds ?? [];

  const experiences = ids.length
    ? await prisma.experience.findMany({
        where: { id: { in: ids } },
        orderBy: { startDate: "asc" },
      })
    : [];

  if (!profile) {
    return NextResponse.json(
      { error: "No profile found for that userId" },
      { status: 404 },
    );
  }

  // Remove leading "/" before joining with public/
  const relativeImagePath = profile.userPic
    ? profile.userPic.replace(/^\/+/, "")
    : null;

  const resolvedPath = relativeImagePath
    ? path.join(process.cwd(), "public", relativeImagePath)
    : null;

  let userPicDataUri: string | null = null;

  if (resolvedPath && existsSync(resolvedPath)) {
    const base64 = readFileSync(resolvedPath).toString("base64");

    // Your actual file is JPEG.
    // Even though the filename ends in .png, the binary data starts with /9j/
    userPicDataUri = `data:image/jpeg;base64,${base64}`;

    console.log("Profile image loaded:", {
      originalPath: profile.userPic,
      resolvedPath,
      dataUriPrefix: userPicDataUri.substring(0, 40),
      base64Length: base64.length,
    });
  } else {
    console.log("Profile image NOT FOUND:", {
      originalPath: profile.userPic,
      resolvedPath,
    });
  }

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
      id: jobApplication?.id, // shows APP-<real id> in the PDF
      createdAt: jobApplication?.createdAt,
    },
    experiences,
  });
  console.log("pdfBuffer", pdfBuffer);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=real-cv-test.pdf",
    },
  });
}
