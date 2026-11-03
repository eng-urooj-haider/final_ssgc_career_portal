// app/api/jobs/[jobId]/export/route.ts
import ExcelJS from "exceljs";
import { PassThrough, Readable } from "node:stream";
import prisma from "@/app/lib/db";
import { calcAge } from "@/app/lib/validation/formatted_dob";
import { fmtMonths, workedMonths } from "@/app/lib/experience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH = 500;
const MAX_EXP_SLOTS = 10;

const d = (v?: Date | null) => (v ? v.toISOString().slice(0, 10) : "");
const ids = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number) : []);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // TODO: verify session + role (ADMIN / RECRUITER) here and return 403 otherwise

  const { id } = await params;
  const jobId = Number(id);

  if (!Number.isInteger(jobId)) {
    return new Response("Invalid job id", { status: 400 });
  }

  const [cities, countries] = await Promise.all([
    prisma.city.findMany(),
    prisma.country.findMany(),
  ]);
  const cityMap = new Map(cities.map((c) => [c.id, c.cityName]));
  const countryMap = new Map(countries.map((c) => [c.id, c.countryName]));

  // ---- headers --------------------------------------------------------
  const headers = [
    "SNO",
    "User Account ID",
    "Position Code",
    "Con",
    "CNIC",
    "Position Title",
    "Name",
    "Father Name",
    "Current Address",
    "Contact Number",
    "DOB",
    "Advertisment Date",
    "Age",
    "Age Digits",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "Subject 1",
    "Subject 2",
    "Subject 3",
    "Subject 4",
    "Subject 5",
    "Subject 6",
    "Total Experience",
    "File Name",
    "12",
    "23",
    "34",
    "45",
    "56",
    "67",
    "7",
    "8",
    "9",
    "10",
  ];

  // ---- stream plumbing ------------------------------------------------
  const pass = new PassThrough();
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: pass,
    useStyles: true,
  });
  const ws = wb.addWorksheet("Applicants", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.addRow(headers).commit();

  (async () => {
    try {
      let cursor: number | undefined;
      let sno = 1;
      for (;;) {
        const apps = await prisma.jobApplication.findMany({
          where: { jobId },
          take: BATCH,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
          select: {
            id: true,
            createdAt: true,
            cv: true,
            selectedExperienceIds: true,
            selectedCertificateIds: true,
            job: { select: { jobCode: true, title: true, createdAt: true } },
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    fatherName: true,
                    currentAddress: true,
                    cnic: true,
                    gender: true,
                    dateOfBirth: true,
                    mobilePrefix: true,
                    mobileNumber: true,
                    experiences: { orderBy: { startDate: "desc" } },
                    certificates: true,
                    education: {
                      select: {
                        qualificationId: true,
                        majorSubject: true,
                        obtainedMarks: true,
                        totalMarks: true,
                        divisionGrade: true,
                        instituteOther: true,
                        qualification: { select: { name: true } },
                        institution: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        });
        if (apps.length === 0) break;

        for (const a of apps) {
          const p = a.user.profile;
          const selExp = ids(a.selectedExperienceIds);
          const exps = (p?.experiences ?? []).filter((e) =>
            selExp.includes(e.id),
          );

          const cv = a.cv;
          const edus = p?.education ?? [];
          const asOn = a.job.createdAt ?? new Date();
          const age = calcAge(p?.dateOfBirth, asOn);
          const totalExperience = fmtMonths(
            workedMonths(
              exps.map((e) => [e.startDate, e.endDate] as [Date, Date | null]),
            ).size,
          );

          // Map education
          const eduMap = new Map<number, { qualName: string; major: string }>();
          edus.forEach((edu, index) => {
            const slot = index + 1;
            if (slot <= 6) {
              eduMap.set(slot, {
                qualName:
                  edu.qualification?.name ?? edu.qualificationOther ?? "#N/A",
                major: edu.majorSubject ?? "#N/A",
              });
            }
          });

          const qualColumns = [1, 2, 3, 4, 5, 6].map(
            (slot) => eduMap.get(slot)?.qualName ?? "#N/A",
          );
          const subjectColumns = [1, 2, 3, 4, 5, 6].map(
            (slot) => eduMap.get(slot)?.major ?? "#N/A",
          );

          // Build 10 Experience Columns in "Title:\n...\nCompany Name:\n...\nResponsibility:\n..." format
          const expColumns = Array.from({ length: MAX_EXP_SLOTS }, (_, index) => {
            const exp = exps[index];
            if (!exp) return "#N/A";

            const title = exp.jobTitle ?? "";
            const company = exp.company ?? "";
            const responsibilities = exp.responsibility ??  "";

            return `Title:\n${title}\nCompany Name:\n${company}\n\nResponsibility:\n${responsibilities}`;
          });

          const row = ws.addRow([
            sno++,
            a.user.id,
            a.job.jobCode,
            `(${a.job.jobCode})${p?.cnic ?? ""}`,
            p?.cnic ?? "",
            a.job.title ?? "",
            `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim(),
            p?.fatherName ?? "",
            p?.currentAddress ?? "",
            `${p?.mobilePrefix ?? ""}${p?.mobileNumber ?? ""}`,
            d(p?.dateOfBirth),
            d(a.job.createdAt),
            age.decimal,
            age.digits,
            ...qualColumns,
            ...subjectColumns,
            totalExperience,
            cv,
            ...expColumns,
          ]);

          // Enable text wrapping so newlines (\n) render as multi-line cells in Excel
          row.eachCell((cell) => {
            cell.alignment = { wrapText: true, vertical: "top" };
          });

          row.commit();
        }
        cursor = apps[apps.length - 1].id;
      }
      await ws.commit();
      await wb.commit();
    } catch (err) {
      console.error("Export failed", err);
      pass.destroy(err as Error);
    }
  })();

  return new Response(Readable.toWeb(pass) as ReadableStream, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="applicants-job-${jobId}.xlsx"`,
    },
  });
}