import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Detect whether request content is FormData or JSON
  const contentType = req.headers.get("content-type") || "";
  let body: Record<string, any> = {};
  let formData: FormData | null = null;

  if (contentType.includes("multipart/form-data")) {
    formData = await req.formData();
    const certificatesRaw = formData.get("certificates") as string;
    if (certificatesRaw) {
      body.certificates = JSON.parse(certificatesRaw);
    }
  } else {
    body = await req.json();
  }

  // Ensure Profile row exists
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

  // --- Experience tab ----------------------------------------------------
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
          startDate: parseFlexibleDate(e.start_date),
          endDate: parseFlexibleDate(e.end_date),
          salary: e.salary || null,
          responsibility: e.responsibilities || null,
          reasonForLeave: e.reason || null,
          cityOther: e.cityOther || "",
        })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  // --- Education tab -----------------------------------------------------
  if (body.education) {
    await prisma.$transaction([
      prisma.education.deleteMany({ where: { profileId: profile.id } }),
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
          obtainedMarks:
            parseFloat(e.obtained_marks_gpa || e.obtained_marks || "0") || 0,
          totalMarks:
            parseFloat(e.total_marks_gpa || e.total_marks || "0") || 0,
          divisionGrade: e.division_grade ?? "",
        })),
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  // --- Certificates tab --------------------------------------------------
  if (body.certificates) {
    const certificatesList = Array.isArray(body.certificates)
      ? body.certificates
      : JSON.parse(body.certificates);

    const uploadDir = path.join(process.cwd(), "public/uploads/certificates");
    await mkdir(uploadDir, { recursive: true });

    // Prepare certificate records and write binary files to disk
    const certificateRecords = await Promise.all(
      certificatesList.map(async (cert: any, index: number) => {
        let documentUrl = cert.document || null;

        if (formData) {
          const file = formData.get(`document_${index}`) as File | null;
          if (file && file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.name)}`;
            const filePath = path.join(uploadDir, uniqueFilename);

            await writeFile(filePath, buffer);
            documentUrl = `/uploads/certificates/${uniqueFilename}`;
          }
        }

        return {
          profileId: profile.id,
          certificateName: cert.name || "",
          organisation: cert.organisation || cert.organization || "",
          issueDate: cert.issue_date ? new Date(cert.issue_date) : null,
          document: documentUrl,
        };
      }),
    );

    await prisma.$transaction([
      prisma.certificate.deleteMany({ where: { profileId: profile.id } }),
      prisma.certificate.createMany({ data: certificateRecords }),
    ]);

    return NextResponse.json({ ok: true });
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

  return NextResponse.json({ error: "Unrecognised payload" }, { status: 400 });
}
