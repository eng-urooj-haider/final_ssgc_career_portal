import prisma from "@/app/lib/db";

// Source: tbl_qualifications. Depends on QualificationGroup rows 1-8
// already existing — run seedQualificationGroups() first, or via the
// combined seed.ts below, which handles ordering automatically.
//
// Two spelling corrections made versus the original SQL, flagged rather
// than silently applied — revert if the originals are intentional:
//   - "Master of Administrative SciencE (MAS)" -> "...Science (MAS)"
//   - "Maticulation" -> "Matriculation" (only affects this table; the
//     QualificationGroup name "Maticulation" was left as-is per that file)
const qualifications: { id: number; qualificationGroupId: number; name: string }[] = [
  { id: 1, qualificationGroupId: 7, name: "Associate Chartered Management Accountant" },
  { id: 2, qualificationGroupId: 7, name: "Association of Chartered Certified Accountants" },
  { id: 3, qualificationGroupId: 1, name: "Bachelor of Business Administration" },
  { id: 4, qualificationGroupId: 1, name: "Bachelor of Law" },
  { id: 5, qualificationGroupId: 1, name: "Bachelor of Medicine, Bachelor of Surgery" },
  { id: 6, qualificationGroupId: 1, name: "Bachelors of Arts" },
  { id: 7, qualificationGroupId: 1, name: "Bachelors of Commerce" },
  { id: 8, qualificationGroupId: 1, name: "Bachelors of Computer Science" },
  { id: 9, qualificationGroupId: 1, name: "Bachelors of Dental Surgery" },
  { id: 10, qualificationGroupId: 1, name: "Bachelors of Engineering" },
  { id: 11, qualificationGroupId: 1, name: "Bachelors of Science (BS)" },
  { id: 12, qualificationGroupId: 1, name: "Bachelors of Science (BSC)" },
  { id: 13, qualificationGroupId: 2, name: "Bachelors of Technology" },
  { id: 14, qualificationGroupId: 7, name: "Chartered Accountant" },
  { id: 15, qualificationGroupId: 7, name: "Chartered Accountant Intermediate" },
  { id: 16, qualificationGroupId: 7, name: "Chartered Management Accountant Intermediate" },
  { id: 17, qualificationGroupId: 2, name: "Diploma In Associate Engineering (DAE)" },
  { id: 18, qualificationGroupId: 3, name: "Doctorate of Philosophy" },
  { id: 19, qualificationGroupId: 5, name: "Fellow of College of Physicians and Surgeons" },
  { id: 20, qualificationGroupId: 4, name: "Intermediate" },
  { id: 21, qualificationGroupId: 5, name: "Master of Administrative Science (MAS)" },
  { id: 22, qualificationGroupId: 5, name: "Master of Business Administration" },
  { id: 23, qualificationGroupId: 5, name: "Master of Philosophy" },
  { id: 24, qualificationGroupId: 5, name: "Masters in Public Administration" },
  { id: 25, qualificationGroupId: 5, name: "Masters of Arts" },
  { id: 26, qualificationGroupId: 5, name: "Masters of Commerce" },
  { id: 27, qualificationGroupId: 5, name: "Masters of Computer Science (MCS)" },
  { id: 28, qualificationGroupId: 5, name: "Masters of Engineering" },
  { id: 29, qualificationGroupId: 5, name: "Masters of Law" },
  { id: 30, qualificationGroupId: 5, name: "Masters of Science (MS)" },
  { id: 31, qualificationGroupId: 5, name: "Masters of Science (MSC)" },
  { id: 32, qualificationGroupId: 6, name: "Matriculation" },
  { id: 33, qualificationGroupId: 5, name: "Member of College of Physicians & Surgeons" },
  { id: 34, qualificationGroupId: 8, name: "Others" },
];

export async function seedQualifications() {
  const result = await prisma.qualification.createMany({
    data: qualifications,
    skipDuplicates: true,
  });
  console.log(`Seeded ${result.count} qualifications.`);
}

if (require.main === module) {
  seedQualifications()
    .catch((err) => {
      console.error("Qualification seed failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}