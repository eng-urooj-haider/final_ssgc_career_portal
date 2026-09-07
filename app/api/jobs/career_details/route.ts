import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";

export const GET = async () => {
 const  response = await prisma.job.findMany()
 NextResponse.json({
    message:"job fetch successfuly",
    data:response
 })
};
