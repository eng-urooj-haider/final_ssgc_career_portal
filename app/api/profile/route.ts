import { mkdir, writeFile, unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const file1 = formData.get("photo") as File | null;

    if (!file1 || file1.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file1.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // 1. Look up existing profile BEFORE writing the new file
    const existingProfile = await prisma.profile.findUnique({
      where: { user_id: userId },
    });

    // 2. Save the new file
    const buffer = Buffer.from(await file1.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "profile");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${file1.name}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    const imageUrl = `/profile/${filename}`;

    // 3. Upsert the DB record with the new image path
    const profile = await prisma.profile.upsert({
      where: { user_id: userId },
      update: { user_pic: imageUrl },
      create: {
        user_pic: imageUrl,
        user_id: userId,
      },
    });

    // 4. Only now delete the OLD file, after DB update succeeded
    if (existingProfile?.user_pic) {
      const oldFilePath = path.join(
        process.cwd(),
        "public",
        existingProfile.user_pic,
      );
      await unlink(oldFilePath).catch((err) => {
        console.warn("Could not delete old profile user_picture:", err.message);
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Something went wrong while uploading" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: number;
  try {
    const decoded = verifyToken(token);
    userId = decoded.userId;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    // Update if a profile already exists for this user, otherwise create one.
    const data = { ...body };
    if (data.date_of_birth) {
      data.date_of_birth = new Date(data.date_of_birth);
    }

    const profile = await prisma.profile.upsert({
      where: { user_id: userId },
      update: data,
      create: { user_id: userId, ...data },
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (err) {
    console.error("Profile PATCH failed", err);
    return NextResponse.json(
      { error: "Something went wrong while saving the profile" },
      { status: 500 },
    );
  }
}
