import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const countries = await prisma.countries.findMany();

    return NextResponse.json({
      countries,
    });
  } catch (error) {
    console.error("Fetch countries error:", error);
    return NextResponse.json(
      { error: "Something went wrong while fetching countries" },
      { status: 500 }
    );
  }
}