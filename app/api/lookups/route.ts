import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    switch (type) {
      case "qualification-groups": {
        const data = await prisma.qualificationGroup.findMany({
          orderBy: { groupName: "asc" },
        });
        return NextResponse.json({ success: true, data });
      }
      case "qualifications": {
        const data = await prisma.qualification.findMany({
          orderBy: { name: "asc" },
        });
        return NextResponse.json({ success: true, data });
      }
      case "institutes": {
        const data = await prisma.institution.findMany({
          orderBy: { name: "asc" },
        });
        return NextResponse.json({ success: true, data });
      }
      case "id": {
        const id = Number(searchParams.get("id"));

        // not a valid number -> not found
        if (!Number.isInteger(id) || id <= 0) {
          return NextResponse.json({ success: true, exists: false });
        }

        const job = await prisma.job.findUnique({
          where: { id },
          select: { id: true, title: true, jobCode: true },
        });

        return NextResponse.json({ success: true, exists: !!job, data: job });
      }
      default:
        return NextResponse.json(
          { success: false, message: "Invalid or missing 'type' parameter" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Lookups API Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
};
