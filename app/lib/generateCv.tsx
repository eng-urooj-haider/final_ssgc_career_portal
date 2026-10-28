// app/lib/generateCv.tsx
//
// "Digital Candidate Resume Report" — 9-section template:
//   1. Candidate Application & Contact Details
//   2. Professional Summary
//   3. Qualifications
//   4. Professional Work Experience
//   5. Achievements & Awards
//   6. Certifications & Training
//   7. Technical & Professional Skills
//   8. Projects / Research (Optional)
//   9. References (Optional)
//
// SERVER ONLY: call buildCvPdf() from a route handler / server action.
// npm install @react-pdf/renderer

import React from "react";
import fs from "fs";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { workedMonths, fmtMonths, type DateLike } from "@/app/lib/experience";

// ---------------------------------------------------------------------------
// Prisma include — use this wherever you load a profile for the CV.
// If Prisma says "Unknown field", rename to match your schema.prisma.
// ---------------------------------------------------------------------------

export const CV_PROFILE_INCLUDE = {
  experiences: true,
  education: { include: { qualification: true, institution: true } },
  certificates: true,
  achievements: true,
  projects: true,
  references: true,
  skills: true,
} as const;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BORDER = "#1C6FD9";
const HEADER_BG = "#DCEBFB";
const ROW_BG = "#F4F8FD";
const GRID = "#BFC5CC";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 36,
    paddingBottom: 48,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
  },

  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  topRowLeft: { flexGrow: 1, paddingRight: 10 },
  nameLine: { fontSize: 10, marginBottom: 4 },
  photoBox: {
    width: 70,
    height: 80,
    borderWidth: 1,
    borderColor: "#999",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderText: { fontSize: 7, color: "#999", textAlign: "center" },

  sectionHeader: {
    marginTop: 12,
    marginBottom: 5,
    borderBottomWidth: 1.5,
    borderBottomColor: BORDER,
    paddingBottom: 2,
  },
  sectionTitle: { fontSize: 10.5, fontWeight: "bold" },
  star: { color: "#D00000" },
  sectionNote: { fontSize: 7.5, fontWeight: "normal", color: "#333" },

  // 4-column key/value grid (section 1)
  kvTable: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: GRID },
  kvRow: { flexDirection: "row" },
  kvLabel: {
    width: "22%",
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: GRID,
    backgroundColor: ROW_BG,
  },
  kvLabelText: { fontSize: 8, fontWeight: "bold" },
  kvValue: {
    width: "28%",
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: GRID,
  },
  kvValueText: { fontSize: 8 },

  // Generic data tables
  table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: GRID },
  tr: { flexDirection: "row" },
  thCell: {
    padding: 4,
    backgroundColor: HEADER_BG,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: GRID,
  },
  thText: { fontSize: 8, fontWeight: "bold", textAlign: "center" },
  tdCell: {
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: GRID,
  },
  cellText: { fontSize: 8 },

  bodyText: { fontSize: 9, lineHeight: 1.4 },
  bullet: { fontSize: 9, lineHeight: 1.4, marginBottom: 2 },
  skillLine: { fontSize: 9, lineHeight: 1.5, marginBottom: 3 },
  skillLabel: { fontWeight: "bold" },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#888",
    textAlign: "center",
  },
});

// ---------------------------------------------------------------------------
// Public input type
// ---------------------------------------------------------------------------

export interface CvInput {
  profile: {
    firstName: string;
    lastName: string;
    userPic?: string | null;
    gender?: string | null;
    mobilePrefix?: string | null;
    mobileNumber?: string | null;
    email?: string | null;
    dateOfBirth?: DateLike;
    nationality?: string | null;
    isPakistani?: boolean | null;
    currentAddress?: string | null;
    currentCity?: string | null;
    currentCountry?: string | null;
    domicile?: string | null;
    cnic?: string | null;
    professionalSummary?: string | null;
    noticePeriod?: string | null;
    expectedSalary?: unknown;
    birthCity?: { cityName?: string | null } | null;
    birthCityOther?: string | null;
    birthCountry?: { countryName?: string | null } | null;
    experiences?: {
      id?: number;
      jobTitle: string;
      company: string;
      startDate: DateLike;
      endDate: DateLike;
      responsibility?: string | null;
      salary?: unknown;
    }[];
    education?: {
      qualification?: { name?: string | null } | string | null;
      qualificationOther?: string | null;
      institution?: { name?: string | null } | string | null;
      instituteOther?: string | null;
      majorSubject?: string | null;
      passingYear?: string | number | null;
      divisionGrade?: string | null;
      obtainedMarks?: string | number | null;
      totalMarks?: string | number | null;
    }[];
    certificates?: {
      certificateName: string;
      organisation: string;
      issueDate?: DateLike;
      durationValue?: unknown;
      durationUnit?: string | null;
    }[];
    achievements?: {
      title?: string | null;
      issuer?: string | null;
      dateReceived?: DateLike;
    }[];
    projects?: {
      projectTitle?: string | null;
      description?: string | null;
    }[];
    references?: {
      name?: string | null;
      designation?: string | null;
      organisation?: string | null;
      phone?: string | null;
    }[];
    skills?: unknown; // one row (or array with one row): coreSkills, softwareTools, languagesKnown
  };
  job: {
    jobCode: string;
    title: string;
  };
  application: {
    id: number; // 0 = preview (no real application yet)
    createdAt: DateLike;
  };
  /** Ids of the experiences the candidate marked "relevant" for this job. */
  relevantExperienceIds?: (number | string)[];
  /** Optional extra achievements as plain strings. */
  achievements?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toDate(d: unknown): Date | null {
  if (!d) return null;
  const x = new Date(d as string | number | Date);
  return Number.isNaN(x.getTime()) ? null : x;
}

function fmtDate(d: unknown): string {
  const date = toDate(d);
  if (!date) return "-";
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day}-${MONTHS[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

function fmtYear(d: unknown): string {
  const date = toDate(d);
  return date ? String(date.getUTCFullYear()) : "-";
}

function fmtMoney(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(String(v));
  if (Number.isNaN(n)) return String(v);
  return `${n.toLocaleString("en-US")}/-`;
}

function titleCase(s?: string | null): string {
  if (!s) return "-";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function fmtCnic(c?: string | null): string {
  if (!c) return "-";
  const digits = c.replace(/\D/g, "");
  return digits.length === 13
    ? `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
    : c;
}

function fmtDuration(value: unknown, unit?: string | null): string {
  if (value === null || value === undefined || value === "" || !unit)
    return "-";
  const n = Number(String(value));
  let u = titleCase(unit);
  if (n === 1 && u.endsWith("s")) u = u.slice(0, -1);
  return `${value} ${u}`;
}

function nameOf(
  v: { name?: string | null } | string | null | undefined,
): string {
  if (!v) return "";
  return typeof v === "string" ? v : (v.name ?? "");
}

function yearNum(v: unknown): number {
  const n = Number(String(v ?? ""));
  return Number.isNaN(n) ? 0 : n;
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "")
    : [];
}

function languageNames(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((l) =>
      typeof l === "string"
        ? l
        : ((l as { language?: string })?.language ?? ""),
    )
    .filter((x) => x.trim() !== "");
}

function normalizeSkills(raw: unknown) {
  const row = (Array.isArray(raw) ? raw[0] : raw) as
    | Record<string, unknown>
    | null
    | undefined;
  return {
    core: toStringArray(row?.coreSkills ?? row?.core_skills),
    tools: toStringArray(row?.softwareTools ?? row?.software_tools),
    languages: languageNames(row?.languagesKnown ?? row?.languages_known),
  };
}

/** Current job first, then most recent end date, then most recent start date. */
function byMostRecent(
  a: { startDate: DateLike; endDate: DateLike },
  b: { startDate: DateLike; endDate: DateLike },
): number {
  const endKey = (x: { endDate: DateLike }) =>
    x.endDate ? (toDate(x.endDate)?.getTime() ?? 0) : Infinity;
  const ea = endKey(a);
  const eb = endKey(b);
  if (ea !== eb) return ea < eb ? 1 : -1;
  return (
    (toDate(b.startDate)?.getTime() ?? 0) -
    (toDate(a.startDate)?.getTime() ?? 0)
  );
}

/** Turns the stored profile picture path into something react-pdf can embed. */
export function userPicToDataUri(userPic?: string | null): string | null {
  if (!userPic) return null;
  if (userPic.startsWith("data:") || /^https?:\/\//i.test(userPic)) {
    return userPic;
  }
  const candidates = [
    path.isAbsolute(userPic) ? userPic : "",
    path.join(process.cwd(), "public", userPic),
  ].filter(Boolean);
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) return null;

  let ext = path.extname(file).slice(1).toLowerCase() || "png";
  if (ext === "jpg") ext = "jpeg";
  return `data:image/${ext};base64,${fs.readFileSync(file).toString("base64")}`;
}

// ---------------------------------------------------------------------------
// Render data
// ---------------------------------------------------------------------------

type Cell = string | string[];

interface CvData {
  fullName: string;
  positionAppliedFor: string;
  photoUrl: string | null;
  footerId: string;

  jobCodeApplied: string;
  dateOfApplication: string;
  statusNotice: string;
  totalExperience: string;
  relevantExperience: string;
  postQualificationYears: string;
  latestDesignationOrg: string;
  lastDrawnSalary: string;
  expectedSalary: string;
  gender: string;
  mobileNumber: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  cnic: string;
  address: string;
  domicile: string;

  professionalSummary: string;
  qualifications: Cell[][];
  experiences: Cell[][];
  achievements: string[];
  certifications: Cell[][];
  coreSkills: string[];
  softwareTools: string[];
  languages: string[];
  projects: Cell[][];
  references: Cell[][];
}

// ---------------------------------------------------------------------------
// UI pieces
// ---------------------------------------------------------------------------

function SectionTitle({
  n,
  title,
  required,
  note,
}: {
  n: number;
  title: string;
  required?: boolean;
  note?: string;
}) {
  return (
    <View style={styles.sectionHeader} minPresenceAhead={60}>
      <Text style={styles.sectionTitle}>
        {`${n}. ${title}`}
        {required ? <Text style={styles.star}> *</Text> : null}
        {note ? <Text style={styles.sectionNote}>{`   ${note}`}</Text> : null}
      </Text>
    </View>
  );
}

function KvRow({
  left,
  right,
}: {
  left: [string, string];
  right?: [string, string];
}) {
  return (
    <View style={styles.kvRow} wrap={false}>
      <View style={styles.kvLabel}>
        <Text style={styles.kvLabelText}>{left[0]}</Text>
      </View>
      <View style={styles.kvValue}>
        <Text style={styles.kvValueText}>{left[1] || "-"}</Text>
      </View>
      <View style={styles.kvLabel}>
        <Text style={styles.kvLabelText}>{right ? right[0] : ""}</Text>
      </View>
      <View style={styles.kvValue}>
        <Text style={styles.kvValueText}>{right ? right[1] || "-" : ""}</Text>
      </View>
    </View>
  );
}

function DataTable({
  cols,
  rows,
}: {
  cols: { header: string; width: string }[];
  rows: Cell[][];
}) {
  const body = rows.length ? rows : [cols.map(() => "-")];
  return (
    <View style={styles.table}>
      <View style={styles.tr} wrap={false}>
        {cols.map((c, i) => (
          <View key={i} style={[styles.thCell, { width: c.width }]}>
            <Text style={styles.thText}>{c.header}</Text>
          </View>
        ))}
      </View>
      {body.map((row, r) => (
        <View key={r} style={styles.tr} wrap={false}>
          {row.map((cell, i) => (
            <View key={i} style={[styles.tdCell, { width: cols[i].width }]}>
              {Array.isArray(cell) ? (
                cell.length ? (
                  cell.map((t, j) => (
                    <Text key={j} style={styles.cellText}>
                      {`• ${t}`}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.cellText}>-</Text>
                )
              ) : (
                <Text style={styles.cellText}>{cell || "-"}</Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

function CvDocument({ data }: { data: CvData }) {
  return (
    <Document title={`CV - ${data.fullName}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.reportTitle}>DIGITAL CANDIDATE RESUME REPORT</Text>

        <View style={styles.topRow}>
          <View style={styles.topRowLeft}>
            <Text style={styles.nameLine}>Full Name: {data.fullName}</Text>
            <Text style={styles.nameLine}>
              Position Applied For: {data.positionAppliedFor}
            </Text>
          </View>
          <View style={styles.photoBox}>
            {data.photoUrl ? (
              <Image src={data.photoUrl} style={{ width: 68, height: 78 }} />
            ) : (
              <Text style={styles.photoPlaceholderText}>
                Passport Size Picture
              </Text>
            )}
          </View>
        </View>

        {/* 1 */}
        <SectionTitle n={1} title="CANDIDATE APPLICATION & CONTACT DETAILS" />
        <View style={styles.kvTable}>
          <KvRow
            left={["Job Code Applied For:", data.jobCodeApplied]}
            right={["Gender:", data.gender]}
          />
          <KvRow
            left={["Date of Application:", data.dateOfApplication]}
            right={["Mobile Number:", data.mobileNumber]}
          />
          <KvRow
            left={["Status / Notice:", data.statusNotice]}
            right={["Email Address:", data.email]}
          />
          <KvRow
            left={["Total Experience:", data.totalExperience]}
            right={["Date of Birth:", data.dateOfBirth]}
          />
          <KvRow
            left={["Relevant Experience:", data.relevantExperience]}
            right={["Nationality:", data.nationality]}
          />
          <KvRow
            left={["Post Qualification Years:", data.postQualificationYears]}
            right={["CNIC:", data.cnic]}
          />
          <KvRow
            left={[
              "Latest Designation / Organization:",
              data.latestDesignationOrg,
            ]}
            right={["Address:", data.address]}
          />
          <KvRow
            left={["Last Drawn Salary:", data.lastDrawnSalary]}
            right={["Domicile:", data.domicile]}
          />
          <KvRow left={["Expected Salary:", data.expectedSalary]} />
        </View>

        {/* 2 */}
        <SectionTitle n={2} title="PROFESSIONAL SUMMARY" />
        <Text style={styles.bodyText}>
          {data.professionalSummary || "No summary provided."}
        </Text>

        {/* 3 */}
        <SectionTitle
          n={3}
          title="QUALIFICATIONS"
          required
          note="(Please list from Highest to Lowest)"
        />
        <DataTable
          cols={[
            { header: "Degree / Certification", width: "26%" },
            { header: "Majors", width: "22%" },
            { header: "University / Institute", width: "26%" },
            { header: "Year of Completion", width: "13%" },
            { header: "Grade / CGPA", width: "13%" },
          ]}
          rows={data.qualifications}
        />

        {/* 4 */}
        <SectionTitle
          n={4}
          title="PROFESSIONAL WORK EXPERIENCE"
          required
          note="(Do not include Articleship, Trainee, House Job, Apprenticeship, or Internship experience)"
        />
        <DataTable
          cols={[
            { header: "Organization", width: "17%" },
            { header: "Designation", width: "15%" },
            { header: "From", width: "10%" },
            { header: "To", width: "10%" },
            { header: "Key Responsibilities", width: "28%" },
            { header: "Total Exp.", width: "10%" },
            { header: "Salary", width: "10%" },
          ]}
          rows={data.experiences}
        />

        {/* 5 */}
        <SectionTitle n={5} title="ACHIEVEMENTS & AWARDS" />
        {data.achievements.length > 0 ? (
          data.achievements.map((a, i) => (
            <Text key={i} style={styles.bullet}>
              {`• ${a}`}
            </Text>
          ))
        ) : (
          <Text style={styles.bodyText}>-</Text>
        )}

        {/* 6 */}
        <SectionTitle n={6} title="CERTIFICATIONS & TRAINING" required />
        <DataTable
          cols={[
            { header: "Certification / Training Name", width: "38%" },
            { header: "Issuing Organization", width: "32%" },
            { header: "Duration", width: "16%" },
            { header: "Year", width: "14%" },
          ]}
          rows={data.certifications}
        />

        {/* 7 */}
        <SectionTitle n={7} title="TECHNICAL & PROFESSIONAL SKILLS" required />
        <Text style={styles.skillLine}>
          <Text style={styles.skillLabel}>{"• Core Skills: "}</Text>
          {data.coreSkills.length ? data.coreSkills.join(", ") : "-"}
        </Text>
        <Text style={styles.skillLine}>
          <Text style={styles.skillLabel}>{"• Software & Tools: "}</Text>
          {data.softwareTools.length ? data.softwareTools.join(", ") : "-"}
        </Text>
        <Text style={styles.skillLine}>
          <Text style={styles.skillLabel}>{"• Languages Known: "}</Text>
          {data.languages.length ? data.languages.join(", ") : "-"}
        </Text>

        {/* 8 */}
        <SectionTitle n={8} title="PROJECTS / RESEARCH (Optional)" />
        <DataTable
          cols={[
            { header: "Description", width: "40%" },
            { header: "Contribution", width: "60%" },
          ]}
          rows={data.projects}
        />

        {/* 9 */}
        <SectionTitle n={9} title="REFERENCES (Optional)" />
        <DataTable
          cols={[
            { header: "Name", width: "25%" },
            { header: "Designation", width: "25%" },
            { header: "Organization", width: "25%" },
            { header: "Contact Details", width: "25%" },
          ]}
          rows={data.references}
        />

        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${data.footerId}  |  ${data.fullName}  |  Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function buildCvPdf(input: CvInput): Promise<Buffer> {
  const { profile, job, application } = input;

  const experiences = [...(profile.experiences ?? [])].sort(byMostRecent);
  const education = [...(profile.education ?? [])].sort(
    (a, b) => yearNum(b.passingYear) - yearNum(a.passingYear),
  );

  const allRanges = experiences.map(
    (e) => [e.startDate, e.endDate] as [DateLike, DateLike],
  );

  // Relevant experience = only the experiences the candidate selected for this job.
  // Ids are coerced to numbers so "12" (from FormData) matches 12 (from the DB).
  // If nothing was selected, it is shown as "-" (NOT silently copied from total).
  const relevantIds = (input.relevantExperienceIds ?? []).map(Number);
  const relevantRanges = experiences
    .filter((e) => e.id != null && relevantIds.includes(Number(e.id)))
    .map((e) => [e.startDate, e.endDate] as [DateLike, DateLike]);

  // Post-qualification experience = months worked after the latest passing year
  const latestPassingYear = Math.max(
    0,
    ...education.map((e) => yearNum(e.passingYear)),
  );
  const postQualMonths =
    latestPassingYear >= 1950
      ? workedMonths(allRanges, latestPassingYear * 12 + 11).size
      : 0;

  const latest = experiences[0];

  const nationality =
    profile.isPakistani === true
      ? "Pakistani"
      : profile.isPakistani === false
        ? profile.nationality || "Non-Pakistani"
        : profile.nationality || "-";

  const mobile =
    profile.mobilePrefix && profile.mobileNumber
      ? `${profile.mobilePrefix}-${profile.mobileNumber}`
      : `${profile.mobilePrefix ?? ""}${profile.mobileNumber ?? ""}` || "-";

  // Address on the first line, "City – Country" on the second
  // Address on the first line, "City – Country" on the second
  const cityCountry = [
    profile.birthCity?.cityName ?? profile.birthCityOther ?? null,
    profile.birthCountry?.countryName ?? null,
  ]
    .filter(Boolean)
    .join(" – ");

  const address =
    [profile.currentAddress, cityCountry].filter(Boolean).join("\n") || "-";
  console.log("cityCountry", profile.birthCity);
  const achievements = [
    ...(profile.achievements ?? [])
      .filter((a) => a.title)
      .map((a) => {
        const year = fmtYear(a.dateReceived);
        return `${a.title}${a.issuer ? ` – ${a.issuer}` : ""}${year !== "-" ? ` (${year})` : ""}`;
      }),
    ...(input.achievements ?? []),
  ];

  const skills = normalizeSkills(profile.skills);

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  const data: CvData = {
    fullName,
    positionAppliedFor: job.title,
    photoUrl: userPicToDataUri(profile.userPic),
    footerId: application.id > 0 ? `APP-${application.id}` : "PREVIEW",

    jobCodeApplied: job.jobCode,
    dateOfApplication: fmtDate(application.createdAt),
    statusNotice: profile.noticePeriod || "-",
    totalExperience: fmtMonths(workedMonths(allRanges).size),
    relevantExperience: relevantRanges.length
      ? fmtMonths(workedMonths(relevantRanges).size)
      : "-",
    postQualificationYears: fmtMonths(postQualMonths),
    latestDesignationOrg: latest
      ? `${latest.jobTitle}\n${latest.company}`
      : "-",
    lastDrawnSalary: latest ? fmtMoney(latest.salary) : "-",
    expectedSalary: fmtMoney(profile.expectedSalary),
    gender: titleCase(profile.gender),
    mobileNumber: mobile,
    email: profile.email || "-",
    dateOfBirth: fmtDate(profile.dateOfBirth),
    nationality,
    cnic: fmtCnic(profile.cnic),
    address,
    domicile: profile.domicile || "-",

    professionalSummary: profile.professionalSummary ?? "",

    qualifications: education.map((ed) => {
      const degree = nameOf(ed.qualification) || ed.qualificationOther || "-";
      const institute = nameOf(ed.institution) || ed.instituteOther || "-";
      return [
        degree,
        ed.majorSubject || "-",
        institute,
        ed.passingYear ? String(ed.passingYear) : "-",
        ed.divisionGrade ||
          (ed.obtainedMarks != null && ed.totalMarks != null
            ? `${ed.obtainedMarks}/${ed.totalMarks}`
            : "-"),
      ];
    }),

    experiences: experiences.map((e) => [
      e.company,
      e.jobTitle,
      fmtDate(e.startDate),
      e.endDate ? fmtDate(e.endDate) : "Present",
      (e.responsibility ?? "")
        .split(/\n|•/)
        .map((s) => s.trim())
        .filter(Boolean),
      fmtMonths(workedMonths([[e.startDate, e.endDate]]).size),
      fmtMoney(e.salary),
    ]),

    achievements,

    certifications: (profile.certificates ?? []).map((c) => [
      c.certificateName,
      c.organisation,
      fmtDuration(c.durationValue, c.durationUnit),
      fmtYear(c.issueDate),
    ]),

    coreSkills: skills.core,
    softwareTools: skills.tools,
    languages: skills.languages,

    // Description column = project title, Contribution column = description & contributions
    projects: (profile.projects ?? [])
      .filter((p) => p.projectTitle || p.description)
      .map((p) => [p.projectTitle || "-", p.description || "-"]),

    references: (profile.references ?? [])
      .filter((r) => r.name)
      .map((r) => [
        r.name || "-",
        r.designation || "-",
        r.organisation || "-",
        r.phone || "-",
      ]),
  };

  // Normalise whatever react-pdf returns (Buffer or stream) into a Buffer
  const out = await pdf(<CvDocument data={data} />).toBuffer();
  if (Buffer.isBuffer(out)) return out;

  const chunks: Uint8Array[] = [];
  for await (const chunk of out as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
