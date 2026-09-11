import { verifyToken } from "@/app/lib/auth";
import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
interface TokenPayload {
  userId: number;
}
export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token) as TokenPayload | null;

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;
    const experienceId = Number(id);

    if (!experienceId || Number.isNaN(experienceId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // const profile = await prisma.profile.findFirst({
    //   where: { user_id: decoded.userId },
    // });

    // if (!profile) {
    //   return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    // }

    // Verify the experience entry actually belongs to this user's profile
    // before deleting — otherwise anyone could delete any id by guessing it.
    const experience = await prisma.experience.findFirst({
      where: {
        id: experienceId,
      },
    });

    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found or does not belong to you" },
        { status: 404 },
      );
    }

    await prisma.experience.delete({
      where: { id: experienceId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete experience error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
};
