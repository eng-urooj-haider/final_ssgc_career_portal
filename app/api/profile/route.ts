import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import { saveReferences } from "@/app/lib/validation/refrence";
import { saveProjects } from "@/app/lib/validation/project";
import { saveAchievements } from "@/app/lib/validation/achievements";
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
      },
    });
    return NextResponse.json({ profile: updated });
  }

  // --- Experience tab ----------------------------------------------------
  if (body.experience) {
    await prisma.$transaction([
      prisma.experience.deleteMany({ where: { profileId: profile.id } }),
      prisma.experience.createMany({
        data: body.experience.map((e: any) => ({
          profileId: profile.id,
          jobTitle: e.job_title,
          company: e.company,
          country: toIntOrNull(e.country),
          city: toIntOrNull(e.city),
          startDate: parseFlexibleDate(e.start_date),
          endDate: parseFlexibleDate(e.end_date),
          salary: e.salary || null,
          responsibility: e.responsibilities || null,
          reasonForLeave: e.reason || null,
          cityOther: e.city_other || "",
        })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  // --- Education tab -----------------------------------------------------
  if (body.education) {
    for (const e of body.education) {
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

    await prisma.$transaction([
      prisma.education.deleteMany({ where: { profileId: profile.id } }),
      prisma.education.createMany({
        data: body.education.map((e: any) => {
          const groupOther = e.qualification_group_id === "other";
          const qualOther = e.qualification_id === "other";
          const instOther = e.institute_id === "other";
          const cityOther = e.city === "other";

          return {
            profileId: profile.id,
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
        }),
      }),
    ]);
    return NextResponse.json({ ok: true });
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
    await prisma.$transaction([
      prisma.membership.deleteMany({ where: { profileId: profile.id } }),
      prisma.membership.createMany({
        data: body.memberships.map((m: any) => ({
          profileId: profile.id,
          organisation: m.organisation,
          membershipType: m.membership_type || null,
          memberSince: m.member_since || null,
        })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  }
  // --- References tab ----------------------------------------------------
  if (body.references) {
    try {
      const saved = await saveReferences(profile.id, body.references);
      return NextResponse.json({ ok: true, references: saved });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Error saving references:", error);
      return NextResponse.json(
        { error: "Failed to update references" },
        { status: 500 },
      );
    }
  }
  // --- Projects & Research tab -------------------------------------------
  if (body.projects) {
    try {
      const saved = await saveProjects(profile.id, body.projects);
      return NextResponse.json({ ok: true, projects: saved });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Error saving projects:", error);
      return NextResponse.json(
        { error: "Failed to update projects and research" },
        { status: 500 },
      );
    }
  }
  // --- Achievements & Awards tab -----------------------------------------
  if (body.achievements) {
    console.log(body.achievements);
    try {
      const saved = await saveAchievements(profile.id, body.achievements);
      console.log(saved);
      return NextResponse.json({ ok: true, achievements: saved });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Error saving achievements:", error);
      return NextResponse.json(
        { error: "Failed to update achievements and awards" },
        { status: 500 },
      );
    }
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
