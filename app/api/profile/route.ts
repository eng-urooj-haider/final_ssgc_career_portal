import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
function parseSafeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const sanitized = value.trim().toUpperCase();
    return sanitized === "YES" || sanitized === "TRUE" || sanitized === "1";
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decode = await verifyToken(token);
  const userId = decode.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Make sure a Profile row exists for this user before touching child tables.
  const profile = await prisma.profile.upsert({
    where: { userId: userId },
    update: {},
    create: { userId: userId },
  });

  // --- Personal details tab ---------------------------------------------
  if (
    !body.experience &&
    !body.education &&
    !body.certificates &&
    !body.memberships
  ) {
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        fatherName: body.father_name,
        maritalStatus: body.marital_status,
        childrenCount: parseInt(body.children),
        dateOfBirth: body.date_of_birth ? new Date(body.date_of_birth) : null,
        birthCountryId: parseInt(body.birth_country),
        birthCityId: parseInt(body.birth_city),
        birthCityOther: body.birth_city_other,
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
      },
    });
    return NextResponse.json({ profile: updated });
  }

  // --- Experience tab (full replace) -------------------------------------
  function parseFlexibleDate(value: unknown): Date | null {
    if (!value || typeof value !== "string" || !value.trim()) return null;

    // Try parsing as-is first (covers full ISO strings from the DB)
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;

    // Fall back to YYYY-MM (from <input type="month">) by appending a day
    const withDay = new Date(`${value}-01`);
    if (!Number.isNaN(withDay.getTime())) return withDay;

    return null;
  }
  if (body.experience) {
    await prisma.$transaction([
      prisma.experience.deleteMany({ where: { profileId: profile.id } }),
      prisma.experience.createMany({
        data: body.experience.map((e: any) => ({
          profileId: profile.id,
          jobTitle: e.job_title,
          company: e.company,
          country: parseInt(e.country) || null,
          city: parseInt(e.city) || null,
          startDate: parseFlexibleDate(e.start_date), // "2020-01" -> "2020-01-01"
          endDate: parseFlexibleDate(e.end_date),
          salary: e.salary || null,
          responsibility: e.responsibilities || null, // note: DB column is singular
          reasonForLeave: e.reason || null,
          cityOther: e.cityOther || "",
        })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  // --- Education tab (full replace) ---------------------------------------
  if (body.education) {
    await prisma.$transaction([
      prisma.education.deleteMany({
        where: { profileId: profile.id },
      }),
      prisma.education.createMany({
        data: body.education.map((e: any) => ({
          profileId: profile.id,
          qualificationGroupId: parseInt(
            e.qualification_group_id || e.qualificationGroupId,
          ),
          qualificationId: parseInt(e.qualification_id || e.qualificationId),
          institutionId:
            e.institute_id === "other" || !e.institute_id
              ? null
              : parseInt(e.institute_id),
          instituteOther:
            e.institute_id === "other" ? e.institute_other || "" : "",
          majorSubject: e.major_subject || e.majorSubject || "",
          countryId: parseInt(e.country_id || e.country || "0"),
          cityId: e.city === "other" || !e.city ? null : parseInt(e.city),
          cityOther: e.city_other || e.cityOther || "",
          passingYear: parseInt(e.passing_year || e.passingYear || "0"),

          // FIX: Match payload keys (obtained_marks_gpa & total_marks_gpa) with safe numeric fallbacks
          obtainedMarks:
            parseFloat(e.obtained_marks_gpa || e.obtained_marks || "0") || 0,
          totalMarks:
            parseFloat(e.total_marks_gpa || e.total_marks || "0") || 0,
            divisionGrade:e.division_grade ?? ""
        })),
      }),
    ]);

    return NextResponse.json({ ok: true });
  }
  // // --- Certificates tab (full replace) -------------------------------------
  if (body.certificates) {
    await prisma.$transaction([
      prisma.certificate.deleteMany({ where: { profileId: profile.id } }),
      prisma.certificate.createMany({
        data: body.certificates.map((c: any) => ({
          profileId: profile.id,
          certficateName: c.name,
          organisation: c.organisation,
          issueDate: c.issue_date,
        })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  // // --- Memberships tab (full replace) ---------------------------------------
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

  return NextResponse.json({ error: "Unrecognised payload" }, { status: 400 });
}
