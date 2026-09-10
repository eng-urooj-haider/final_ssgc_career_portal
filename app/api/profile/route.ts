import { mkdir, writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";

// fs/promises requires the Node.js runtime — this route will fail silently
// (or error at deploy time) on the Edge runtime, which is the default for
// route handlers in some Next.js configs.
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "profile");

// Only these keys may ever be written to Profile via PATCH. Spreading the
// raw request body onto `update`/`create` (as the original code did) is a
// mass-assignment hole: a client could send { user_id: 999, id: 1, ... } and
// silently overwrite another user's profile or internal columns. Whitelisting
// closes that off — anything not listed here is dropped, not written.
const EDITABLE_PROFILE_FIELDS = [
  "father_name",
  "marital_status",
  "children",
  "date_of_birth",
  "birth_country",
  "birth_city",
  "birth_city_other",
  "passport_no",
  "domicile",
  "mobile_prefix",
  "mobile_number",
  "home_prefix",
  "home_number",
  "office_prefix",
  "office_number",
  "current_address",
  "permanent_address",
  "already_worked_ssgc",
  "ssgc_employee_name",
  "ssgc_employee_number",
] as const;
type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];

// ---------------------------------------------------------------------------
// Shared auth helper — was duplicated verbatim in POST and PATCH before.
// ---------------------------------------------------------------------------

type AuthResult = { userId: number } | { errorResponse: NextResponse };

function authenticate(req: NextRequest): AuthResult {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return {
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const decoded = verifyToken(token);
    return { userId: decoded.userId };
  } catch {
    return {
      errorResponse: NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      ),
    };
  }
}

// ---------------------------------------------------------------------------
// Whitelist + light type coercion for the PATCH body.
// ---------------------------------------------------------------------------

function pickEditableFields(body: Record<string, unknown>) {
  const data: Partial<Record<EditableProfileField, unknown>> = {};

  for (const field of EDITABLE_PROFILE_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  if (typeof data.date_of_birth === "string" && data.date_of_birth) {
    const parsed = new Date(data.date_of_birth);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid date_of_birth");
    }
    data.date_of_birth = parsed;
  }

  return data;
}

// ---------------------------------------------------------------------------
// POST — profile photo upload
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if ("errorResponse" in auth) return auth.errorResponse;
  const { userId } = auth;

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPG, PNG, or WEBP." },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    // 1. Look up the existing profile BEFORE writing the new file, so we
    //    know what (if anything) to clean up afterwards.
    const existingProfile = await prisma.profile.findUnique({
      where: { user_id: userId },
    });

    // 2. Build a safe filename. Never trust file.name directly — a
    //    malicious name like "../../../evil.js" could otherwise let a
    //    client write outside the upload directory (path traversal).
    //    We keep only the original extension and generate the rest.
    const ext = path.extname(file.name).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : "";
    const filename = `${randomUUID()}${safeExt}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    const imageUrl = `/profile/${filename}`;

    // 3. Upsert the DB record with the new image path.
    const profile = await prisma.profile.upsert({
      where: { user_id: userId },
      update: { user_pic: imageUrl },
      create: { user_id: userId, user_pic: imageUrl },
    });

    // 4. Only now delete the OLD file, after the DB update succeeded —
    //    if the upsert had failed above, we'd still have the old photo.
    if (existingProfile?.user_pic) {
      const oldFilePath = path.join(process.cwd(), "public", existingProfile.user_pic);
      await unlink(oldFilePath).catch((err) => {
        console.warn("Could not delete old profile picture:", err.message);
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile photo upload failed", error);
    return NextResponse.json(
      { error: "Something went wrong while uploading" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — personal details tab
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  const auth = authenticate(req);
  if ("errorResponse" in auth) return auth.errorResponse;
  const { userId } = auth;

  try {
    const body = await req.json();

    let data: Partial<Record<EditableProfileField, unknown>>;
    try {
      data = pickEditableFields(body);
    } catch {
      return NextResponse.json(
        { error: "Invalid date_of_birth" },
        { status: 400 },
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid profile fields were provided" },
        { status: 400 },
      );
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