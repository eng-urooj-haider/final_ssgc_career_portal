import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";

export async function PATCH(req: NextRequest) {
 const token = req.cookies.get("token")?.value;
  const decode = await verifyToken(token);
  const userId = decode.userId
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Make sure a Profile row exists for this user before touching child tables.
 const profile = await prisma.profile.upsert({
  where: { user_id: userId },
  update: {},
  create: { user_id: userId },
});

  // --- Personal details tab ---------------------------------------------
  if (!body.experience && !body.education && !body.certificates && !body.memberships) {
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        father_name: body.father_name,
        marital_status: body.marital_status,
        children: body.children,
        date_of_birth: body.date_of_birth ? new Date(body.date_of_birth) : null,
        birth_country: body.birth_country,
        birth_city: body.birth_city,
        birth_city_other: body.birth_city_other,
        passport_no: body.passport_no,
        domicile: body.domicile,
        mobile_prefix: body.mobile_prefix,
        mobile_number: body.mobile_number,
        home_prefix: body.home_prefix,
        home_number: body.home_number,
        office_prefix: body.office_prefix,
        office_number: body.office_number,
        current_address: body.current_address,
        permanent_address: body.permanent_address,
        already_worked_ssgc: body.already_worked_ssgc,
        ssgc_employee_name: body.ssgc_employee_name,
        ssgc_employee_number: body.ssgc_employee_number,
      },
    });
    return NextResponse.json({ profile: updated });
  }

  // --- Experience tab (full replace) -------------------------------------
  if (body.experience) {
  await prisma.$transaction([
    prisma.experience.deleteMany({ where: { profile_id: profile.id } }),
    prisma.experience.createMany({
      data: body.experience.map((e: any) => ({
        profile_id: profile.id,
        job_title: e.job_title,
        company: e.company,
        country: e.country || null,
        city: e.city || null,
        start_date: new Date(`${e.start_date}-01`), // "2020-01" -> "2020-01-01"
        end_date: e.end_date ? new Date(`${e.end_date}-01`) : null,
        salary: e.salary || null,
        responsibility: e.responsibilities || null, // note: DB column is singular
        reason: e.reason || null,
      })),
    }),
  ]);
  return NextResponse.json({ ok: true });
}

  // --- Education tab (full replace) ---------------------------------------
  // if (body.education) {
  //   await prisma.$transaction([
  //     prisma.education.deleteMany({ where: { profileId: profile.id } }),
  //     prisma.education.createMany({
  //       data: body.education.map((e: any) => ({
  //         profileId: profile.id,
  //         degree: e.degree,
  //         institution: e.institution,
  //         year: e.year,
  //         grade: e.grade || null,
  //       })),
  //     }),
  //   ]);
  //   return NextResponse.json({ ok: true });
  // }

  // // --- Certificates tab (full replace) -------------------------------------
  // if (body.certificates) {
  //   await prisma.$transaction([
  //     prisma.certificate.deleteMany({ where: { profileId: profile.id } }),
  //     prisma.certificate.createMany({
  //       data: body.certificates.map((c: any) => ({
  //         profileId: profile.id,
  //         name: c.name,
  //         organisation: c.organisation,
  //         issue_date: c.issue_date,
  //         credential_id: c.credential_id || null,
  //       })),
  //     }),
  //   ]);
  //   return NextResponse.json({ ok: true });
  // }

  // // --- Memberships tab (full replace) ---------------------------------------
  // if (body.memberships) {
  //   await prisma.$transaction([
  //     prisma.membership.deleteMany({ where: { profileId: profile.id } }),
  //     prisma.membership.createMany({
  //       data: body.memberships.map((m: any) => ({
  //         profileId: profile.id,
  //         organisation: m.organisation,
  //         membership_type: m.membership_type || null,
  //         member_since: m.member_since || null,
  //         membership_id: m.membership_id || null,
  //       })),
  //     }),
  //   ]);
  //   return NextResponse.json({ ok: true });
  // }

  return NextResponse.json({ error: "Unrecognised payload" }, { status: 400 });
}