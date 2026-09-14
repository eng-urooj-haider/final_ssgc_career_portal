import prisma from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createJwtToken } from "@/app/lib/auth";
import { setTokenCookie } from "@/app/lib/cookie";
import { Gender , Role } from "@/app/generated/prisma/enums"; // Import generated Enums

interface RegisterBody {
  email: string;
  password: string;
  role?: Role;
  cnic: string;
  first_name: string;
  last_name: string;
  gender: Gender; // Matches Gender enum ("MALE" | "FEMALE" | "OTHER")
}

export async function POST(req: NextRequest) {
  try {
    const body: RegisterBody = await req.json();

    // 1. Check existing user by email
    const existUser = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (existUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // 3. Create User & Profile together inside a single atomic operation
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        role: body.role ?? Role.USER,
        profile: {
          create: {
            cnic: body.cnic,
            firstName: body.first_name,  // Mapped to camelCase
            lastName: body.last_name,    // Mapped to camelCase
            gender: body.gender,        // Valid Enum value
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // 4. Token & Cookie Setup
    const token = createJwtToken(user);
    const response = NextResponse.json({
      message: "User created successfully",
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

    setTokenCookie(response, token);
    return response;
  } catch (err: any) {
    console.error("Registration Error:", err);

    // Handle duplicate CNIC or Unique Constraint violation from Prisma
    if (err.code === "P2002") {
      return NextResponse.json(
        { message: "CNIC or Email already registered" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}