// app/api/jobs/[jobId]/export/route.ts
import ExcelJS from "exceljs";
import { PassThrough, Readable } from "node:stream";
import prisma from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH = 500;
const MAX_EXP = 5,
  MAX_EDU = 3,
  MAX_CERT = 5;

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

  // ---- headers (fixed up front) ---------------------------------------
  const expLabels = ["Title", "Company", "City", "Start", "End", "Salary"];
  const eduLabels = [
    "Qualification",
    "Institution",
    "Major",
    "Year",
    "Marks",
    "Grade",
  ];
  const certLabels = ["Name", "Organisation", "Issue Date"];

  const headers = [
    "Job Code",
    "Job Title",
    "Applied On",
    "Email",
    "First Name",
    "Last Name",
    "CNIC",
    "Mobile",
    "Gender",
    "DOB",
    "CV",
    ...rep("Exp", MAX_EXP, expLabels),
    ...rep("Edu", MAX_EDU, eduLabels),
    ...rep("Cert", MAX_CERT, certLabels),
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

  // Fire and forget: the response streams while this loop runs
  (async () => {
    try {
      let cursor: number | undefined;
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
            job: { select: { jobCode: true, title: true } },
            user: {
              select: {
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    cnic: true,
                    gender: true,
                    dateOfBirth: true,
                    mobilePrefix: true,
                    mobileNumber: true,
                    experiences: { orderBy: { startDate: "desc" } },
                    certificates: true,
                    education: {
                      orderBy: { passingYear: "desc" },
                      select: {
                        majorSubject: true,
                        passingYear: true,
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
          const selCert = ids(a.selectedCertificateIds);
          const exps = (p?.experiences ?? []).filter((e) =>
            selExp.includes(e.id),
          );
          const certs = (p?.certificates ?? []).filter((c) =>
            selCert.includes(c.id),
          );
          const edus = p?.education ?? [];

          ws.addRow([
            a.job.jobCode,
            a.job.title,
            d(a.createdAt),
            a.user.email,
            p?.firstName ?? "",
            p?.lastName ?? "",
            p?.cnic ?? "",
            `${p?.mobilePrefix ?? ""}${p?.mobileNumber ?? ""}`,
            p?.gender ?? "",
            d(p?.dateOfBirth),
            a.cv ?? "",
            ...pad(exps, MAX_EXP, 6, (e) => [
              e.jobTitle,
              e.company,
              (e.city && cityMap.get(e.city)) || e.cityOther || "",
              d(e.startDate),
              e.endDate ? d(e.endDate) : "Present",
              e.salary ? Number(e.salary) : "",
            ]),
            ...pad(edus, MAX_EDU, 6, (e) => [
              e.qualification.name,
              e.instituteOther || e.institution.name,
              e.majorSubject,
              e.passingYear,
              `${e.obtainedMarks}/${e.totalMarks}`,
              e.divisionGrade ?? "",
            ]),
            ...pad(certs, MAX_CERT, 3, (c) => [
              c.certificateName,
              c.organisation,
              d(c.issueDate),
            ]),
          ]).commit();
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

// ---- helpers ----------------------------------------------------------
function rep(prefix: string, n: number, labels: string[]) {
  return Array.from({ length: n }, (_, i) =>
    labels.map((l) => `${prefix} ${i + 1} ${l}`),
  ).flat();
}

function pad<T>(
  items: T[],
  n: number,
  width: number,
  map: (x: T) => (string | number)[],
) {
  return Array.from({ length: n }, (_, i) =>
    items[i] ? map(items[i]) : Array(width).fill(""),
  ).flat();
}
