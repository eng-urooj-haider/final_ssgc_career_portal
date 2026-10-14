// app/api/auth/register/route.ts
import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createJwtToken } from "@/app/lib/auth";
import { setTokenCookie } from "@/app/lib/cookie";
import { registerSchema } from "@/app/lib/validation/register";

export async function POST(req: NextRequest) {
  try {
    // 1. Parse JSON safely
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }

    // 2. Validate
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const { email, password, firstName, lastName, cnic, gender } = parsed.data;

    // 3. Duplicate checks
    const [emailTaken, cnicTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.profile.findFirst({ where: { cnic }, select: { id: true } }),
    ]);
    if (emailTaken || cnicTaken) {
      return NextResponse.json(
        { message: "An account with this email or CNIC already exists" },
        { status: 409 },
      );
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Create user + profile atomically. Role is ALWAYS USER here.
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "USER",
        profile: { create: { cnic, firstName, lastName, gender } },
      },
      select: { id: true, email: true, role: true }, // no password in memory
    });

    // 6. Token + cookie
    const token = createJwtToken(user);
    const response = NextResponse.json(
      {
        message: "User created successfully",
        data: { id: user.id, email: user.email, role: user.role },
      },
      { status: 201 },
    );
    setTokenCookie(response, token);
    return response;
  } catch (err: any) {
    // Race condition: two requests passed the check at the same time
    if (err?.code === "P2002") {
      return NextResponse.json(
        { message: "An account with this email or CNIC already exists" },
        { status: 409 },
      );
    }
    console.error("Registration error:", err);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}