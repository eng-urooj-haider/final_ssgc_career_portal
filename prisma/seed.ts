import prisma from "@/app/lib/db";
import { seedCountries } from "./Seedcountries";
import { seedCities } from "./Seedcities";
import { seedQualificationGroups } from "./Seedqualificationgroups";
import { seedQualifications } from "./Seedqualifications";

async function main() {
  // Countries/Cities have no foreign key dependencies — order between
  // them doesn't matter. QualificationGroups must run BEFORE Qualifications
  // though, since every Qualification row references a qualification_group_id.
  await seedCountries();
  await seedCities();
  await seedQualificationGroups();
  await seedQualifications();
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });