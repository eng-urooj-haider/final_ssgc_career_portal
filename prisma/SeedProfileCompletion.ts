import prisma from "@/app/lib/db";

const data = [
  { name: "Permanent", image: true,  personal: true,  experience: true,  education: true, certificate: true,  membership: false, count: "5" },
  { name: "Staff",     image: true,  personal: true,  experience: false, education: true, certificate: false, membership: false, count: "3" },
  { name: "Trainee",   image: true,  personal: true,  experience: false, education: true, certificate: false, membership: false, count: "3" },
  { name: "Email",     image: false, personal: false, experience: false, education: false, certificate: false, membership: false, count: "0" },
];

export async function seedProfileCompletions() {
  const now = new Date();

  for (const { name, ...rest } of data) {
    await prisma.profileCompletion.upsert({
      where: { name }, // requires `name String @unique` in the schema
      update: rest,
      create: { name, ...rest, createdAt: now, updatedAt: now },
    });
  }

  console.log(`Seeded ${data.length} profile completions`);
}