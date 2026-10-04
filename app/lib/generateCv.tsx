// app/lib/generateCv.tsx
//
// Reusable PDF builder for the "Digital Candidate Resume Report" template.
// Import buildCvPdf() wherever a locked CV snapshot needs to be produced —
// currently called once, right after a JobApplication is created.
//
// npm install @react-pdf/renderer

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

const BORDER = "#1C6FD9";
const HEADER_BG = "#DCEBFB";
const ROW_BG = "#F4F8FD";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1A1A1A" },

  reportTitle: { fontSize: 16, fontWeight: "bold", textAlign: "center" },
  reportSubtitle: { fontSize: 8, textAlign: "center", color: "#555", marginBottom: 8 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
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

  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: BORDER,
    paddingBottom: 2,
  },

  kvTable: { borderWidth: 1, borderColor: "#ccc" },
  kvRow: { flexDirection: "row", flexWrap: "wrap" },
  kvCellLabel: {
    width: "17%",
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    fontWeight: "bold",
    backgroundColor: ROW_BG,
  },
  kvCellValue: {
    width: "33%",
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },

  table: { borderWidth: 1, borderColor: "#ccc", marginTop: 2 },
  tr: { flexDirection: "row" },
  thCell: {
    padding: 4,
    fontWeight: "bold",
    backgroundColor: HEADER_BG,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  tdCell: {
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },

  bodyText: { fontSize: 9, marginTop: 2 },
  bullet: { fontSize: 9, marginBottom: 2 },
});

// ---------------------------------------------------------------------------
// Public input type — what the caller (finish route) must supply
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
    dateOfBirth?: Date | string | null;
    nationality?: string | null;
    currentAddress?: string | null;
    cnic?: string | null;
    professionalSummary?: string | null;
    experiences: {
      jobTitle: string;
      company: string;
      startDate: Date | string | null;
      endDate: Date | string | null;
      responsibility?: string | null;
    }[];
    education: {
      majorSubject?: string | null;
      instituteOther?: string | null;
      passingYear?: string | number | null;
      divisionGrade?: string | null;
      obtainedMarksGpa?: string | null;
    }[];
    certificates: {
      certificateName: string;
      organisation: string;
      issueDate?: Date | string | null;
    }[];
  };
  job: {
    jobCode: string;
    title: string;
  };
  application: {
    id: number;
    createdAt: Date | string;
  };
  achievements?: string[]; // optional until a real Achievement model exists
}

interface CvData {
  fullName: string;
  positionAppliedFor: string;
  photoUrl?: string | null;
  jobCodeApplied: string;
  applicationId: string;
  dateOfApplication: string;
  statusNotice: string;
  totalExperienceYears: string;
  relevantExperienceYears: string;
  postQualificationYears: string;
  gender: string;
  mobileNumber: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  homeAddress: string;
  cnic: string;
  professionalSummary: string;
  education: {
    qualification: string;
    institution: string;
    boardUniversity: string;
    yearOfCompletion: string;
    gradeOrCgpa: string;
  }[];
  experiences: {
    organization: string;
    designation: string;
    from: string;
    to: string;
    keyResponsibilities: string[];
    totalExp: string;
  }[];
  achievements: string[];
  certifications: {
    name: string;
    issuingOrganization: string;
    year: string;
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "-" : date.toISOString().slice(0, 10);
}

function fmtYear(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "-" : date.getFullYear().toString();
}

function computeTotalYears(
  ranges: [Date | string | null | undefined, Date | string | null | undefined][]
): string {
  let totalMonths = 0;
  for (const [start, end] of ranges) {
    if (!start) continue;
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) continue;
    totalMonths += (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  }
  if (totalMonths <= 0) return "-";
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return months > 0 ? `${years}y ${months}m` : `${years}y`;
}

function KvRow({ pairs }: { pairs: [string, string][] }) {
  return (
    <View style={styles.kvRow}>
      {pairs.map(([label, value], i) => (
        <React.Fragment key={i}>
          <Text style={styles.kvCellLabel}>{label}</Text>
          <Text style={styles.kvCellValue}>{value || "-"}</Text>
        </React.Fragment>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Document Component
// ---------------------------------------------------------------------------

function CvDocument({ data }: { data: CvData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.reportTitle}>DIGITAL CANDIDATE RESUME REPORT</Text>
        <Text style={styles.reportSubtitle}>
          Automated Recruitment System Application Record
        </Text>

        <View style={styles.topRow}>
          <View style={styles.topRowLeft}>
            <Text style={styles.nameLine}>Full Name: {data.fullName}</Text>
            <Text style={styles.nameLine}>
              Position Applied For: {data.positionAppliedFor}
            </Text>
            <Text style={styles.nameLine}>
              Position Applied For: {data.positionAppliedFor}
            </Text>
          </View>
          
          <View style={styles.photoBox}>
            {data.photoUrl ? (
              <Image src={data.photoUrl} style={{ width: 70, height: 80 }} />
            ) : (
              <Text style={styles.photoPlaceholderText}>Passport Size Picture</Text>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          1. CANDIDATE APPLICATION &amp; CONTACT DETAILS
        </Text>
        <View style={styles.kvTable}>
          <KvRow pairs={[["Job Code Applied For:", data.jobCodeApplied], ["Gender:", data.gender]]} />
          <KvRow pairs={[["Application ID:", data.applicationId], ["Mobile Number:", data.mobileNumber]]} />
          <KvRow pairs={[["Date of Application:", data.dateOfApplication], ["Email Address:", data.email]]} />
          <KvRow pairs={[["Status / Notice:", data.statusNotice], ["Date of Birth:", data.dateOfBirth]]} />
          <KvRow pairs={[["Total Experience:", data.totalExperienceYears], ["Nationality:", data.nationality]]} />
          <KvRow pairs={[["Relevant Experience Years:", data.relevantExperienceYears], ["Home Address:", data.homeAddress]]} />
          <KvRow pairs={[["Post Qualification Years:", data.postQualificationYears], ["CNIC:", data.cnic]]} />
        </View>

        <Text style={styles.sectionTitle}>2. PROFESSIONAL SUMMARY</Text>
        <Text style={styles.bodyText}>{data.professionalSummary || "No summary provided."}</Text>

        <Text style={styles.sectionTitle}>3. EDUCATIONAL QUALIFICATIONS</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.thCell, { width: "28%" }]}>Qualification</Text>
            <Text style={[styles.thCell, { width: "24%" }]}>Institution</Text>
            <Text style={[styles.thCell, { width: "24%" }]}>Board / University</Text>
            <Text style={[styles.thCell, { width: "12%" }]}>Year</Text>
            <Text style={[styles.thCell, { width: "12%", borderRightWidth: 0 }]}>Grade / CGPA</Text>
          </View>
          {data.education.map((edu, i) => (
            <View style={styles.tr} key={i}>
              <Text style={[styles.tdCell, { width: "28%" }]}>{edu.qualification}</Text>
              <Text style={[styles.tdCell, { width: "24%" }]}>{edu.institution}</Text>
              <Text style={[styles.tdCell, { width: "24%" }]}>{edu.boardUniversity}</Text>
              <Text style={[styles.tdCell, { width: "12%" }]}>{edu.yearOfCompletion}</Text>
              <Text style={[styles.tdCell, { width: "12%", borderRightWidth: 0 }]}>{edu.gradeOrCgpa}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>4. WORK EXPERIENCE</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.thCell, { width: "20%" }]}>Organization</Text>
            <Text style={[styles.thCell, { width: "16%" }]}>Designation</Text>
            <Text style={[styles.thCell, { width: "10%" }]}>From</Text>
            <Text style={[styles.thCell, { width: "10%" }]}>To</Text>
            <Text style={[styles.thCell, { width: "36%" }]}>Key Responsibilities</Text>
            <Text style={[styles.thCell, { width: "8%", borderRightWidth: 0 }]}>Total Exp.</Text>
          </View>
          {data.experiences.map((exp, i) => (
            <View style={styles.tr} key={i}>
              <Text style={[styles.tdCell, { width: "20%" }]}>{exp.organization}</Text>
              <Text style={[styles.tdCell, { width: "16%" }]}>{exp.designation}</Text>
              <Text style={[styles.tdCell, { width: "10%" }]}>{exp.from}</Text>
              <Text style={[styles.tdCell, { width: "10%" }]}>{exp.to}</Text>
              <View style={[styles.tdCell, { width: "36%" }]}>
                {exp.keyResponsibilities.map((r, j) => (
                  <Text key={j} style={{ fontSize: 8 }}>• {r}</Text>
                ))}
              </View>
              <Text style={[styles.tdCell, { width: "8%", borderRightWidth: 0 }]}>{exp.totalExp}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>5. ACHIEVEMENTS &amp; AWARDS</Text>
        {data.achievements.length > 0 ? (
          data.achievements.map((a, i) => (
            <Text key={i} style={styles.bullet}>• {a}</Text>
          ))
        ) : (
          <Text style={styles.bodyText}>No achievements listed.</Text>
        )}

        <Text style={styles.sectionTitle}>6. CERTIFICATIONS &amp; TRAINING</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.thCell, { width: "50%" }]}>Certification / Training Name</Text>
            <Text style={[styles.thCell, { width: "35%" }]}>Issuing Organization</Text>
            <Text style={[styles.thCell, { width: "15%", borderRightWidth: 0 }]}>Year</Text>
          </View>
          {data.certifications.map((cert, i) => (
            <View style={styles.tr} key={i}>
              <Text style={[styles.tdCell, { width: "50%" }]}>{cert.name}</Text>
              <Text style={[styles.tdCell, { width: "35%" }]}>{cert.issuingOrganization}</Text>
              <Text style={[styles.tdCell, { width: "15%", borderRightWidth: 0 }]}>{cert.year}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function buildCvPdf(input: CvInput): Promise<Buffer> {
  const { profile, job, application } = input;
console.log(input)
  const data: CvData = {
    fullName: `${profile.firstName} ${profile.lastName}`.trim(),
    positionAppliedFor: job.title,
    photoUrl: profile.userPic ?? null,
    jobCodeApplied: job.jobCode,
    applicationId: `APP-${application.id}`,
    dateOfApplication: fmtDate(application.createdAt),
    statusNotice: "-",
    totalExperienceYears: computeTotalYears(
      profile.experiences.map((e) => [e.startDate, e.endDate])
    ),
    relevantExperienceYears: "-",
    postQualificationYears: "-",
    gender: profile.gender ?? "-",
    mobileNumber: `${profile.mobilePrefix ?? ""}${profile.mobileNumber ?? ""}` || "-",
    email: profile.email ?? "-",
    dateOfBirth: fmtDate(profile.dateOfBirth),
    nationality: profile.nationality ?? "-",
    homeAddress: profile.currentAddress ?? "-",
    cnic: profile.cnic ?? "-",
    professionalSummary: profile.professionalSummary ?? "",
    education: profile.education.map((ed) => ({
      qualification: ed.majorSubject ?? "-",
      institution: ed.instituteOther ?? "-",
      boardUniversity: ed.instituteOther ?? "-",
      yearOfCompletion: String(ed.passingYear ?? "-"),
      gradeOrCgpa: ed.divisionGrade ?? ed.obtainedMarksGpa ?? "-",
    })),
    experiences: profile.experiences.map((e) => ({
      organization: e.company,
      designation: e.jobTitle,
      from: fmtDate(e.startDate),
      to: e.endDate ? fmtDate(e.endDate) : "Present",
      keyResponsibilities: (e.responsibility ?? "")
        .split(/\n|•/)
        .map((s) => s.trim())
        .filter(Boolean),
      totalExp: computeTotalYears([[e.startDate, e.endDate]]),
    })),
    achievements: input.achievements ?? [],
    certifications: profile.certificates.map((c) => ({
      name: c.certificateName,
      issuingOrganization: c.organisation,
      year: fmtYear(c.issueDate),
    })),
  };

  return await pdf(<CvDocument data={data} />).toBuffer();
}