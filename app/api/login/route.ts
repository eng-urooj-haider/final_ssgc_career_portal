import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createJwtToken } from "@/app/lib/auth";
import { setTokenCookie } from "@/app/lib/cookie";

interface RequestBody {
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(body.password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }
    const token = createJwtToken(user);
    const response = NextResponse.json({
      message: "Login successful",
      data: { id: user.id, email: user.email, role: user.role },
    });
    setTokenCookie(response, token);
    return response
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
