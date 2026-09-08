import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cities = await prisma.cities.findMany();

    return NextResponse.json({
      cities,
    });
  } catch (error) {
    console.error("Fetch cities error:", error);
    return NextResponse.json(
      { error: "Something went wrong while fetching cities" },
      { status: 500 }
    );
  }
}