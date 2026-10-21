import prisma from "../db";
import { ValidationError } from "../errors";

const MAX_ACHIEVEMENTS = 10;

interface AchievementMeta {
  id?: number | null;
  title?: string;
  issuer?: string;
  date_received?: string;
  description?: string;
}

interface CleanAchievement {
  id: number | null; // null = create
  title: string;
  issuer: string;
  dateReceived: Date;
  description: string | null;
}

function parseAchievementDate(value: string | undefined, label: string): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${label}: a valid date received is required`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${label}: a valid date received is required`);
  }
  if (date.getTime() > Date.now()) {
    throw new ValidationError(`${label}: date received cannot be in the future`);
  }
  return date;
}

export async function saveAchievements(profileId: number, meta: unknown) {
  if (!Array.isArray(meta) || meta.length === 0) {
    throw new ValidationError(
      "At least one achievement or award is required",
    );
  }
  if (meta.length > MAX_ACHIEVEMENTS) {
    throw new ValidationError(`You can add up to ${MAX_ACHIEVEMENTS} achievements`);
  }
  const items = meta as AchievementMeta[];

  // Only ids belonging to THIS profile may be updated or deleted
  const existing = await prisma.achievement.findMany({
    where: { profileId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((a) => a.id));

  // ---- 1. Validate everything before database execution --------------------
  const cleaned: CleanAchievement[] = items.map((ach, i) => {
    const label = `Achievement ${i + 1}`;

    const title = (ach.title ?? "").trim();
    const issuer = (ach.issuer ?? "").trim();
    const description = (ach.description ?? "").trim() || null;

    if (!title || title.length > 255) {
      throw new ValidationError(
        `${label}: achievement title is required (max 255 characters)`,
      );
    }
    if (!issuer || issuer.length > 255) {
      throw new ValidationError(
        `${label}: issuing organisation is required (max 255 characters)`,
      );
    }

    const dateReceived = parseAchievementDate(ach.date_received, label);

    // Negative IDs are unsaved items from the form state; positive IDs must exist for this profile
    const isExisting = typeof ach.id === "number" && ach.id > 0;
    if (isExisting && !existingIds.has(ach.id as number)) {
      throw new ValidationError(`${label}: not found`);
    }

    return {
      id: isExisting ? (ach.id as number) : null,
      title,
      issuer,
      dateReceived,
      description,
    };
  });

  // ---- 2. Database transaction (Atomic Create/Update/Delete) --------------
  const incomingIds = new Set(
    cleaned.filter((a) => a.id).map((a) => a.id as number),
  );
  const idsToDelete = existing
    .map((a) => a.id)
    .filter((id) => !incomingIds.has(id));

  const saved = await prisma.$transaction(async (tx) => {
    if (idsToDelete.length > 0) {
      await tx.achievement.deleteMany({
        where: { id: { in: idsToDelete }, profileId },
      });
    }

    const results = [];
    for (const a of cleaned) {
      const data = {
        title: a.title,
        issuer: a.issuer,
        dateReceived: a.dateReceived,
        description: a.description,
      };

      results.push(
        a.id
          ? await tx.achievement.update({ where: { id: a.id }, data })
          : await tx.achievement.create({ data: { ...data, profileId } }),
      );
    }
    return results;
  });

  return saved;
}