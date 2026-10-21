import prisma from "../db";
import { ValidationError } from "../errors";
const MAX_REFERENCES = 10;
const MAX_FIELD_LENGTH = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

// ValidationError was used but never defined/imported
// export class ValidationError extends Error {
//   constructor(message: string) {
//     super(message);
//     this.name = "ValidationError";
//   }
// }

interface ReferenceMeta {
  id?: number | null;
  name?: string;
  designation?: string;
  organisation?: string;
  email?: string;
  phone?: string;
}

interface CleanReference {
  id: number | null;
  name: string;
  designation: string;
  organisation: string;
  email?: string;
  phone: string;
}

function parseRequiredText(
  value: unknown,
  label: string,
  field: string,
): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > MAX_FIELD_LENGTH) {
    throw new ValidationError(
      `${label}: ${field} is required (max ${MAX_FIELD_LENGTH} characters)`,
    );
  }
  return text;
}


function parsePhone(value: unknown, label: string): string {
  const phone = typeof value === "string" ? value.trim() : "";
  if (!phone) {
    throw new ValidationError(`${label}: phone number is required`);
  }
  if (!PHONE_REGEX.test(phone)) {
    throw new ValidationError(`${label}: phone number is invalid`);
  }
  return phone;
}

export async function saveReferences(profileId: number, meta: unknown) {
  if (!Array.isArray(meta) || meta.length === 0) {
    throw new ValidationError("At least one professional reference is required");
  }
  if (meta.length > MAX_REFERENCES) {
    throw new ValidationError(`You can add up to ${MAX_REFERENCES} references`);
  }
  const items = meta as ReferenceMeta[];

  // Only ids belonging to THIS profile may be updated or deleted
  const existing = await prisma.reference.findMany({
    where: { profileId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((r) => r.id));
  const seenIds = new Set<number>();

  // ---- 1. Validate everything before database execution --------------------
  const cleaned: CleanReference[] = items.map((ref, i) => {
    const label = `Reference ${i + 1}`;

    // Guard against null / non-object entries in the array
    if (ref === null || typeof ref !== "object") {
      throw new ValidationError(`${label}: invalid data`);
    }

    const name = parseRequiredText(ref.name, label, "referee name");
    const designation = parseRequiredText(ref.designation, label, "designation");
    const organisation = parseRequiredText(ref.organisation, label, "organisation");
    // const email = parseEmail(ref.email, label);
    const phone = parsePhone(ref.phone, label);

    // Negative/missing IDs are unsaved items from the form state;
    // positive IDs must exist for this profile
    const id =
      typeof ref.id === "number" && Number.isInteger(ref.id) && ref.id > 0
        ? ref.id
        : null;

    if (id !== null) {
      if (!existingIds.has(id)) {
        throw new ValidationError(`${label}: not found`);
      }
      // Prevent the same record being submitted twice
      if (seenIds.has(id)) {
        throw new ValidationError(`${label}: duplicate reference`);
      }
      seenIds.add(id);
    }

    // return { id, name, designation, organisation, email, phone };
    return { id, name, designation, organisation, phone };

  });

  // ---- 2. Database transaction (Atomic Create/Update/Delete) --------------
  const idsToDelete = existing
    .map((r) => r.id)
    .filter((id) => !seenIds.has(id));

  return prisma.$transaction(async (tx) => {
    if (idsToDelete.length > 0) {
      await tx.reference.deleteMany({
        where: { id: { in: idsToDelete }, profileId },
      });
    }

    const results = [];
    for (const r of cleaned) {
      const { id, ...data } = r;

      results.push(
        id !== null
          // profileId in the where clause is defence-in-depth against races
          ? await tx.reference.update({
              where: { id, profileId },
              data,
            })
          : await tx.reference.create({ data: { ...data, profileId } }),
      );
    }
    return results;
  });
}