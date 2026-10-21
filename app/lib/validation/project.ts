import prisma from "../db";
import { ValidationError } from "../errors";

const MAX_PROJECTS = 10;

interface ProjectMeta {
  id?: number | null;
  project_title?: string;
  description?: string;
}

interface CleanProject {
  id: number | null; // null = create
  projectTitle: string;
  description: string;
}

export async function saveProjects(profileId: number, meta: unknown) {
  if (!Array.isArray(meta) || meta.length === 0) {
    throw new ValidationError(
      "At least one project or research entry is required",
    );
  }
  if (meta.length > MAX_PROJECTS) {
    throw new ValidationError(`You can add up to ${MAX_PROJECTS} projects`);
  }
  const items = meta as ProjectMeta[];

  // Only ids belonging to THIS profile may be updated or deleted
  const existing = await prisma.project.findMany({
    where: { profileId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((p) => p.id));

  // ---- 1. Validate everything before database execution --------------------
  const cleaned: CleanProject[] = items.map((proj, i) => {
    const label = `Project ${i + 1}`;

    const projectTitle = (proj.project_title ?? "").trim();
    const description = (proj.description ?? "").trim();

    if (!projectTitle || projectTitle.length > 255) {
      throw new ValidationError(
        `${label}: project title is required (max 255 characters)`,
      );
    }
    if (!description) {
      throw new ValidationError(`${label}: description is required`);
    }

    // Negative IDs are unsaved items from the form state; positive IDs must exist for this profile
    const isExisting = typeof proj.id === "number" && proj.id > 0;
    if (isExisting && !existingIds.has(proj.id as number)) {
      throw new ValidationError(`${label}: not found`);
    }

    return {
      id: isExisting ? (proj.id as number) : null,
      projectTitle,
      description,
    };
  });

  // ---- 2. Database transaction (Atomic Create/Update/Delete) --------------
  const incomingIds = new Set(
    cleaned.filter((p) => p.id).map((p) => p.id as number),
  );
  const idsToDelete = existing
    .map((p) => p.id)
    .filter((id) => !incomingIds.has(id));

  const saved = await prisma.$transaction(async (tx) => {
    if (idsToDelete.length > 0) {
      await tx.project.deleteMany({
        where: { id: { in: idsToDelete }, profileId },
      });
    }

    const results = [];
    for (const p of cleaned) {
      const data = {
        projectTitle: p.projectTitle,
        description: p.description,
      };

      results.push(
        p.id
          ? await tx.project.update({ where: { id: p.id }, data })
          : await tx.project.create({ data: { ...data, profileId } }),
      );
    }
    return results;
  });

  return saved;
}