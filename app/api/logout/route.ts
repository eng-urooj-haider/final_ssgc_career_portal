import { NextResponse } from "next/server";
import { clearTokenCookie } from "@/app/lib/cookie";

export async function POST() {
  const response = NextResponse.json({
    message: "Logged out successfully",
  });

  clearTokenCookie(response);

  return response;
}