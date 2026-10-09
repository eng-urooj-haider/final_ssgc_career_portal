import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(searchParams.get("limit"))) || 10),
    );
    const search = (searchParams.get("search") ?? "").trim();

    const where = search
      ? {
          OR: [
            { cnic: { contains: search } },
            { firstName: { contains: search } },
          ],
        }
      : {};
    console.log("wherefeeeeee", where);
    console.log("where end");

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.job.count({ where }),
    ]);

    // const data = jobs.map((j) => ({
    //   ...j,
    //   deadline_formatted: new Date(j.deadline).toLocaleDateString("en-US", {
    //     year: "numeric",
    //     month: "short",
    //     day: "numeric",
    //     timeZone: "UTC", // @db.Date is stored as UTC midnight
    //   }),
    // }));

    return NextResponse.json({
      //   data,
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
