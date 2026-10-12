// scripts/backfill-uuid.ts
import { randomUUID } from "crypto";
import prisma from "../lib/db";   // adjust the path to your prisma client

async function main() {
  const jobs = await prisma.job.findMany({
    where: { uuid: null },
    select: { id: true },
  });

  for (const job of jobs) {
    await prisma.job.update({
      where: { id: job.id },
      data: { uuid: randomUUID() },
    });
  }

  console.log(`Updated ${jobs.length} jobs`);
}

main().finally(() => prisma.$disconnect());