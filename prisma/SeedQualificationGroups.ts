import prisma from "@/app/lib/db";

// Source: tbl_qualification_groups. Kept the exact original spelling
// ("Maticulation") rather than silently correcting it to "Matriculation" —
// let me know if you'd rather it be fixed; I flagged the same typo when
// seeding the individual Qualification rows earlier.
const qualificationGroups: { id: number; groupName: string }[] = [
  { id: 1, groupName: "Bachelors" },
  { id: 2, groupName: "Diploma" },
  { id: 3, groupName: "Doctorate" },
  { id: 4, groupName: "Intermediate" },
  { id: 5, groupName: "Masters" },
  { id: 6, groupName: "Maticulation" },
  { id: 7, groupName: "CA / ICMA" },
  { id: 8, groupName: "Others" },
];

export async function seedQualificationGroups() {
  const result = await prisma.qualificationGroup.createMany({
    data: qualificationGroups,
    skipDuplicates: true,
  });
  console.log(`Seeded ${result.count} qualification groups.`);
}

if (require.main === module) {
  seedQualificationGroups()
    .catch((err) => {
      console.error("QualificationGroup seed failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}