import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";

export const GET = async (req: NextRequest) => {
  try {
    // 1. Auth: only admins can list applications
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let role: string | undefined;
    try {
      role = verifyToken(token).role;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Read and validate query params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(searchParams.get("limit"))) || 10),
    );
    const search = (searchParams.get("search") ?? "").trim();

    // const jobId = Number(searchParams.get("id"));
    const uuid = searchParams.get("uuid") ?? "";
    const job = await prisma.job.findUnique({
      where: { uuid },
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const jobId = job.id; // now it's the number
    if (!jobId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    // if (!Number.isInteger(jobId) || jobId <= 0) {
    //   return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    // }

    // 3. Build the filter: always this job, plus optional search
    const where = {
      jobId,
      ...(search && {
        OR: [
          { user: { profile: { firstName: { contains: search } } } },
          { user: { profile: { lastName: { contains: search } } } },
          { user: { profile: { cnic: { contains: search } } } },
          { user: { email: { contains: search } } },
        ],
      }),
    };

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          cv: true,
          doc1Path: true,
          doc2Path: true,
          user: {
            select: {
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  cnic: true,
                  mobileNumber: true,
                },
              },
            },
          },
        },
      }),
      prisma.jobApplication.count({ where }),
    ]);
    function deadline(date: string | Date) {
      return new Date(date).toISOString().split("T")[0];
    }
    const data = applications.map((a) => ({
      id: a.id,
      firstName: a.user.profile?.firstName ?? "",
      lastName: a.user.profile?.lastName ?? "",
      email: a.user.email,
      cnic: a.user.profile?.cnic ?? "",
      cv: a.cv,
      doc1Path: a.doc1Path,
      doc2Path: a.doc2Path,
      createdAt: deadline(a.createdAt),
    }));
    return NextResponse.json({
      data,
      total,
      last_page: Math.max(1, Math.ceil(total / limit)),
      from: total === 0 ? 0 : (page - 1) * limit + 1,
      to: Math.min(page * limit, total),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 },
    );
  }
};
