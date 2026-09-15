import { verifyToken } from "@/app/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// fs/promises requires the Node.js runtime, not Edge (the default for
// route handlers in some Next.js configs).
export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const decoded = verifyToken(token);
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      include: {
        education: {
          orderBy: { passingYear: "desc" },
        },
        experiences: {
          orderBy: { startDate: "desc" },
        },
        memberships: {
          orderBy: { memberSince: "desc" },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Fetch profile error:", error);
    return NextResponse.json(
      { error: "Something went wrong while fetching profile" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const pic = formData.get("pic");

    if (!pic || !(pic instanceof File)) {
      return NextResponse.json(
        { message: "Picture is required" },
        { status: 400 },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(pic.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Use JPG, PNG, or WEBP." },
        { status: 400 },
      );
    }

    if (pic.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "File is too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    // 1. Fetch existing profile BEFORE writing anything, so we know what
    //    (if anything) to clean up once the new file/DB update succeed.
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { userPic: true },
    });

    // 2. Build a safe filename — only take the extension if it's on the
    //    whitelist, otherwise fall back to .png rather than trusting
    //    whatever the client sent.
    const rawExt = path.extname(pic.name).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : ".png";
    const fileName = `profile_${userId}_${Date.now()}${safeExt}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "images");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await pic.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), buffer);

    const picPath = `/uploads/images/${fileName}`;

    // 3. Update the DB with the new path.
    const updatedProfile = await prisma.profile.upsert({
      where: { userId: userId },
      update: { userPic: picPath },
      create: { userId: userId, userPic: picPath },
    });

    // 4. Only now delete the OLD file, after the DB update succeeded —
    //    if step 2 or 3 had failed, the old photo is still intact.
    if (existingProfile?.userPic) {
      const oldFilePath = path.join(
        process.cwd(),
        "public",
        existingProfile.userPic,
      );
      await unlink(oldFilePath).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== "ENOENT") {
          console.error("Failed to delete old profile picture:", err);
        }
      });
    }

    return NextResponse.json({
      message: "Profile picture updated successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Upload profile picture error:", error);
    return NextResponse.json(
      { error: "Something went wrong while updating profile" },
      { status: 500 },
    );
  }
}
