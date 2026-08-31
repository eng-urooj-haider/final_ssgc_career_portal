import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createJwtToken } from "@/app/lib/auth";
import { setTokenCookie } from "@/app/lib/cookie";
interface RegisterBody {
  email: string;
  password: string;
  role?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RegisterBody = await req.json();

    const existUser = await prisma.user.findFirst({
      where: {
        email: body.email,
      },
    });

    if (existUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashed,
        role: body.role ?? "user",
      },
    });

    //token workout
   const token = createJwtToken(user)
    const response = NextResponse.json({
      message: "User created successfully",
      data: { id: user.id, email: user.email, role: user.role },
    });

   setTokenCookie(response , token)
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
