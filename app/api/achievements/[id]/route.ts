import { verifyToken } from "@/app/lib/auth";
import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;
    const educationId = Number(id);

    if (!educationId || Number.isNaN(educationId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const education = await prisma.education.findFirst({
      where: {
        id: educationId,
      },
    });

    if (!education) {
      return NextResponse.json(
        { error: "Experience not found or does not belong to you" },
        { status: 404 },
      );
    }

    await prisma.education.delete({
      where: { id: educationId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete education error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
};