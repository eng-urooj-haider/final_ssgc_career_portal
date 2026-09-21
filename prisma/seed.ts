import prisma from "@/app/lib/db";
import { seedProfileCompletions } from "./SeedProfileCompletion";
// import { seedCountries } from "./SeedCountries";
// ...

async function main() {
  // await seedCountries();
  // await seedCities();
  // await seedQualificationGroups();
  // await seedQualifications();
  await seedProfileCompletions();
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });