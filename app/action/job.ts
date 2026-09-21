"use server";

import prisma from "@/app/lib/db";

export async function findId(id: string) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;

  const row = await prisma.job.findUnique({
    where: { id: numericId },
    include: { profileCompletion: true },
  });

  return row; // job with profileCompletion, or null
}