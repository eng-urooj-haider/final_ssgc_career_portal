// app/api/applications/status/route.ts
import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  let userId: number | null = null;
  try {
    userId = token ? verifyToken(token).userId : null;
  } catch {
    userId = null;
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = Number(req.nextUrl.searchParams.get("jobId"));
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const application = await prisma.jobApplication.findUnique({
    where: { userId_jobId: { userId, jobId } },
    select: { id: true },
  });

  return NextResponse.json({
    applied: Boolean(application),
    applicationId: application?.id ?? null,
  });
}