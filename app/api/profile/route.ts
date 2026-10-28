import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import { saveSkills } from "@/app/lib/validation/skill";
import { ValidationError } from "@/app/lib/errors";
import { saveCertificates } from "@/app/lib/validation/certificate";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function parseSafeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const sanitized = value.trim().toUpperCase();
    return sanitized === "YES" || sanitized === "TRUE" || sanitized === "1";
  }
  if (typeof value === "number") return value === 1;
  return false;
}

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return verifyToken(token).userId ?? null;
  } catch {
    return null; // expired or invalid
  }
}

function parseFlexibleDate(value: unknown): Date | null {
  if (!value || typeof value !== "string" || !value.trim()) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const withDay = new Date(`${value}-01`);
  if (!Number.isNaN(withDay.getTime())) return withDay;

  return null;
}

/** "other", "", null, undefined and anything non-numeric become null (never NaN). */
function toIntOrNull(v: unknown): number | null {
  if (v === "other" || v === "" || v == null) return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function textOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Detect whether request content is FormData or JSON
  const contentType = req.headers.get("content-type") || "";
  let body: Record<string, any> = {};
  let formData: FormData | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      formData = await req.formData();
      const certificatesRaw = formData.get("certificates");
      if (typeof certificatesRaw === "string" && certificatesRaw) {
        body.certificates = JSON.parse(certificatesRaw);
      }
    } else {
      body = await req.json();
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Ensure Profile row exists
  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // --- Personal details tab ---------------------------------------------
  if (body.father_name) {
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        fatherName: body.father_name,
        maritalStatus: body.marital_status,
        childrenCount: toIntOrNull(body.children), // "5+" -> 5
        dateOfBirth: body.date_of_birth ? new Date(body.date_of_birth) : null,
        birthCountryId: toIntOrNull(body.birth_country),
        birthCityId: toIntOrNull(body.birth_city), // "other" -> null (not NaN)
        birthCityOther: textOrNull(body.birth_city_other),
        passportNo: body.passport_no,
        domicile: body.domicile,
        mobilePrefix: body.mobile_prefix,
        mobileNumber: body.mobile_number,
        homePrefix: body.home_prefix,
        homeNumber: body.home_number,
        officePrefix: body.office_prefix,
        officeNumber: body.office_number,
        currentAddress: body.current_address,
        permanentAddress: body.permanent_address,
        alreadyWorkedSsgc: parseSafeBoolean(body.already_worked_ssgc),
        ssgcEmployeeName: body.ssgc_employee_name,
        ssgcEmployeeNumber: body.ssgc_employee_number,
        isPakistani: parseSafeBoolean(body.is_pakistani),
        professionalSummary: body.professional_summary,
      },
    });
    return NextResponse.json({ profile: updated });
  }

  // --- Experience tab ----------------------------------------------------
  // if (body.experience) {
  //   await prisma.$transaction([
  //     prisma.experience.deleteMany({ where: { profileId: profile.id } }),
  //     prisma.experience.createMany({
  //       data: body.experience.map((e: any) => ({
  //         profileId: profile.id,
  //         jobTitle: e.job_title,
  //         company: e.company,
  //         country: toIntOrNull(e.country),
  //         city: toIntOrNull(e.city),
  //         startDate: parseFlexibleDate(e.start_date),
  //         endDate: parseFlexibleDate(e.end_date),
  //         salary: e.salary || null,
  //         responsibility: e.responsibilities || null,
  //         reasonForLeave: e.reason || null,
  //         cityOther: e.city_other || "",
  //       })),
  //     }),
  //   ]);
  //   return NextResponse.json({ ok: true });
  // }
  if (body.experience) {
    const items: any[] = body.experience;

    // Only rows that belong to THIS profile can be updated or deleted.
    const existing = await prisma.experience.findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((e) => e.id));

    // Positive ids = existing rows, anything else (null / negative) = new rows.
    const isExisting = (e: any) =>
      typeof e.id === "number" && e.id > 0 && existingIds.has(e.id);

    const incomingIds = new Set(
      items.filter(isExisting).map((e) => e.id as number),
    );
    const idsToDelete = existing
      .map((e) => e.id)
      .filter((id) => !incomingIds.has(id));

    const saved = await prisma.$transaction(async (tx) => {
      // 1. Delete rows that were removed in the form
      if (idsToDelete.length > 0) {
        await tx.experience.deleteMany({
          where: { id: { in: idsToDelete }, profileId: profile.id },
        });
      }

      // 2. Update existing rows or create new ones
      for (const e of items) {
        const data = {
          jobTitle: e.job_title,
          company: e.company,
          country: toIntOrNull(e.country),
          city: toIntOrNull(e.city),
          startDate: parseFlexibleDate(e.start_date) as Date,
          endDate: parseFlexibleDate(e.end_date),
          salary: e.salary || null,
          responsibility: e.responsibilities || null,
          reasonForLeave: e.reason || null,
          cityOther: e.city_other || "",
        };

        if (isExisting(e)) {
          await tx.experience.update({ where: { id: e.id }, data });
        } else {
          await tx.experience.create({
            data: { ...data, profileId: profile.id },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, data: saved });
  }

  // --- Education tab -----------------------------------------------------
  if (body.education) {
    const items: any[] = body.education;

    // Keep your existing "other" checks
    for (const e of items) {
      if (
        e.qualification_group_id === "other" &&
        !textOrNull(e.qualification_group_other)
      )
        return NextResponse.json(
          { error: "Qualification level name required" },
          { status: 400 },
        );
      if (e.qualification_id === "other" && !textOrNull(e.qualification_other))
        return NextResponse.json(
          { error: "Degree name required" },
          { status: 400 },
        );
      if (e.institute_id === "other" && !textOrNull(e.institute_other))
        return NextResponse.json(
          { error: "Institute name required" },
          { status: 400 },
        );
    }

    // Only rows that belong to THIS profile can be updated or deleted.
    const existing = await prisma.education.findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((e) => e.id));

    // Positive ids that belong to this profile = update, anything else = create.
    const isExisting = (e: any) =>
      typeof e.id === "number" && e.id > 0 && existingIds.has(e.id);

    const incomingIds = new Set(
      items.filter(isExisting).map((e) => e.id as number),
    );
    const idsToDelete = existing
      .map((e) => e.id)
      .filter((id) => !incomingIds.has(id));

    const saved = await prisma.$transaction(async (tx) => {
      // 1. Delete rows that were removed in the form
      if (idsToDelete.length > 0) {
        await tx.education.deleteMany({
          where: { id: { in: idsToDelete }, profileId: profile.id },
        });
      }

      // 2. Update existing rows or create new ones
      for (const e of items) {
        const groupOther = e.qualification_group_id === "other";
        const qualOther = e.qualification_id === "other";
        const instOther = e.institute_id === "other";
        const cityOther = e.city === "other";

        const data = {
          qualificationGroupId: groupOther
            ? null
            : toIntOrNull(e.qualification_group_id),
          qualificationGroupOther: groupOther
            ? textOrNull(e.qualification_group_other)
            : null,
          qualificationId: qualOther ? null : toIntOrNull(e.qualification_id),
          qualificationOther: qualOther
            ? textOrNull(e.qualification_other)
            : null,
          institutionId: instOther ? null : toIntOrNull(e.institute_id),
          instituteOther: instOther ? textOrNull(e.institute_other) : null,
          majorSubject: e.major_subject,
          countryId: Number(e.country),
          cityId: cityOther ? null : toIntOrNull(e.city),
          cityOther: cityOther ? textOrNull(e.city_other) : null,
          passingYear: Number(e.passing_year),
          obtainedMarks: Number(e.obtained_marks_gpa),
          totalMarks: Number(e.total_marks_gpa),
          divisionGrade: e.division_grade || null,
        };
        if (isExisting(e)) {
          await tx.education.update({ where: { id: e.id }, data });
        } else {
          await tx.education.create({
            data: { ...data, profileId: profile.id },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, data: saved });
  }

  // --- Certificates tab --------------------------------------------------
  if (body.certificates) {
    try {
      const saved = await saveCertificates(
        profile.id,
        body.certificates,
        formData,
      );
      return NextResponse.json({ ok: true, certificates: saved });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Error saving certificates:", error);
      return NextResponse.json(
        { error: "Failed to update certificates" },
        { status: 500 },
      );
    }
  }

  // --- Memberships tab ---------------------------------------------------
  if (body.memberships) {
    const items: any[] = body.memberships;

    // Only rows that belong to THIS profile can be updated or deleted.
    const existing = await prisma.membership.findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((m) => m.id));

    // Positive ids that belong to this profile = update, anything else = create.
    const isExisting = (m: any) =>
      typeof m.id === "number" && m.id > 0 && existingIds.has(m.id);

    const incomingIds = new Set(
      items.filter(isExisting).map((m) => m.id as number),
    );
    const idsToDelete = existing
      .map((m) => m.id)
      .filter((id) => !incomingIds.has(id));

    const saved = await prisma.$transaction(async (tx) => {
      // 1. Delete rows that were removed in the form
      if (idsToDelete.length > 0) {
        await tx.membership.deleteMany({
          where: { id: { in: idsToDelete }, profileId: profile.id },
        });
      }

      // 2. Update existing rows or create new ones
      for (const m of items) {
        const data = {
          organisation: m.organisation,
          membershipType: m.membership_type || null,
          memberSince: m.member_since || null,
        };
        if (isExisting(m)) {
          await tx.membership.update({ where: { id: m.id }, data });
        } else {
          await tx.membership.create({
            data: { ...data, profileId: profile.id },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, data: saved });
  }
  // --- References tab ----------------------------------------------------
  if (body.references) {
    const items: any[] = body.references;

    // Only rows that belong to THIS profile can be updated or deleted.
    const existing = await prisma.reference.findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((r) => r.id));

    // Positive ids that belong to this profile = update, anything else = create.
    const isExisting = (r: any) =>
      typeof r.id === "number" && r.id > 0 && existingIds.has(r.id);

    const incomingIds = new Set(
      items.filter(isExisting).map((r) => r.id as number),
    );
    const idsToDelete = existing
      .map((r) => r.id)
      .filter((id) => !incomingIds.has(id));

    const saved = await prisma.$transaction(async (tx) => {
      // 1. Delete rows that were removed in the form
      if (idsToDelete.length > 0) {
        await tx.reference.deleteMany({
          where: { id: { in: idsToDelete }, profileId: profile.id },
        });
      }

      // 2. Update existing rows or create new ones
      const results: any[] = [];
      for (const r of items) {
        const data = {
          name: r.name,
          designation: r.designation,
          organisation: r.organisation,
          phone: r.phone,
        };

        results.push(
          isExisting(r)
            ? await tx.reference.update({ where: { id: r.id }, data })
            : await tx.reference.create({
                data: { ...data, profileId: profile.id },
              }),
        );
      }
      return results;
    });

    return NextResponse.json({ ok: true, data: saved });
  }
  // --- Projects & Research tab -------------------------------------------
  if (body.projects) {
    const items: any[] = body.projects;

    // Only rows that belong to THIS profile can be updated or deleted.
    const existing = await prisma.project.findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((p) => p.id));

    // Positive ids that belong to this profile = update, anything else = create.
    const isExisting = (p: any) =>
      typeof p.id === "number" && p.id > 0 && existingIds.has(p.id);

    const incomingIds = new Set(
      items.filter(isExisting).map((p) => p.id as number),
    );
    const idsToDelete = existing
      .map((p) => p.id)
      .filter((id) => !incomingIds.has(id));

    await prisma.$transaction(async (tx) => {
      // 1. Delete rows that were removed in the form
      if (idsToDelete.length > 0) {
        await tx.project.deleteMany({
          where: { id: { in: idsToDelete }, profileId: profile.id },
        });
      }

      // 2. Update existing rows or create new ones
      for (const p of items) {
        const data = {
          projectTitle: p.projectTitle,
          description: p.description,
        };

        if (isExisting(p)) {
          await tx.project.update({ where: { id: p.id }, data });
        } else {
          await tx.project.create({
            data: { ...data, profileId: profile.id },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  }
  // --- Achievements & Awards tab -----------------------------------------
  if (body.achievements) {
    const items: any[] = body.achievements;

    // Only rows that belong to THIS profile can be updated or deleted.
    const existing = await prisma.achievement.findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((a) => a.id));

    // Positive ids that belong to this profile = update, anything else = create.
    const isExisting = (a: any) =>
      typeof a.id === "number" && a.id > 0 && existingIds.has(a.id);

    const incomingIds = new Set(
      items.filter(isExisting).map((a) => a.id as number),
    );
    const idsToDelete = existing
      .map((a) => a.id)
      .filter((id) => !incomingIds.has(id));

    await prisma.$transaction(async (tx) => {
      // 1. Delete rows that were removed in the form
      if (idsToDelete.length > 0) {
        await tx.achievement.deleteMany({
          where: { id: { in: idsToDelete }, profileId: profile.id },
        });
      }

      // 2. Update existing rows or create new ones
      for (const a of items) {
        const data = {
          title: a.title,
          issuer: a.issuer,
          dateReceived: parseFlexibleDate(a.dateReceived) as Date,
          description: a.description || null,
        };

        if (isExisting(a)) {
          await tx.achievement.update({ where: { id: a.id }, data });
        } else {
          await tx.achievement.create({
            data: { ...data, profileId: profile.id },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  }
  // --- Skills & Languages tab --------------------------------------------
  if (body.coreSkills) {
    try {
      const skillsData = body.skills || body;
      const saved = await saveSkills(profile.id, skillsData);
      console.log(saved);
      return NextResponse.json({ ok: true, skills: saved });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Error saving skills:", error);
      return NextResponse.json(
        { error: "Failed to update skills and languages" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Unrecognised payload" }, { status: 400 });
}
