import prisma from "../db";
import { ValidationError } from "../errors";

interface SkillsMeta {
  coreSkills?: unknown;
  softwareTools?: unknown;
  languagesKnown?: unknown;
}

function parseStringArray(input: unknown, label: string): string[] {
  if (!Array.isArray(input)) {
    throw new ValidationError(`${label} must be a valid list`);
  }
  return input
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "language" in item) {
        return String((item as any).language).trim();
      }
      return "";
    })
    .filter((item) => item.length > 0);
}

export async function saveSkills(profileId: number, meta: unknown) {
  if (!meta || typeof meta !== "object") {
    throw new ValidationError("Invalid skills data payload");
  }

  const payload = meta as SkillsMeta;

  const coreSkills = parseStringArray(payload.coreSkills, "Core skills");
  const softwareTools = parseStringArray(payload.softwareTools, "Software tools");
  const languagesKnown = parseStringArray(payload.languagesKnown, "Languages known");

  if (coreSkills.length === 0) {
    throw new ValidationError("At least one core skill is required");
  }

  // Check if a skill record already exists for this profile
  const existing = await prisma.skill.findFirst({
    where: { profileId },
  });

  let saved;
  if (existing) {
    saved = await prisma.skill.update({
      where: { id: existing.id },
      data: {
        coreSkills,
        softwareTools,
        languagesKnown, // Saves purely as a clean array of strings
      },
    });
  } else {
    saved = await prisma.skill.create({
      data: {
        profileId,
        coreSkills,
        softwareTools,
        languagesKnown,
      },
    });
  }

  return saved;
}