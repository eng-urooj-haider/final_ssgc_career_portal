export type Job = {
  id: string;
  jobCode: string;
  title: string;
  city1: string;
  city2?: string;
  city3?: string;
  deadline: string; // display string, e.g. "20-Sep-2026"
  specialInfo?: string; // may contain simple HTML from the source system
  qualification: string; // may contain simple HTML
  age?: number;
  skills?: string; // may contain simple HTML
  responsibilities?: string; // may contain simple HTML
  attachment1Title?: string;
  attachment1Doc?: string; // filename under /docs
  attachment2Title?: string;
  attachment2Doc?: string;
  email?: string; // if set, "Apply Now" is a mailto link
};

export type ArchivedJob = {
  id: string;
  jobCode: string;
  title: string;
  city1: string;
  publicationDate: string; // "j-M-Y" style, e.g. "2-Jun-2026"
  deadline: string;
};

// Static data — no fetching, safe for full static generation (SSG).
export const currentJobs: Job[] = [
  {
    id: "eng-dist-2026-014",
    jobCode: "SSGC/HR/2026/014",
    title: "Distribution Engineer",
    city1: "Karachi",
    deadline: "20-Sep-2026",
    qualification:
      "BE/BSc in Mechanical or Civil Engineering from an HEC-recognized university, with 3–5 years of relevant experience in gas distribution networks.",
    age: 35,
    skills:
      "Working knowledge of pipeline design standards, leak detection procedures, and AutoCAD or GIS mapping tools.",
    responsibilities:
      "Plan and maintain the low-pressure distribution network across Karachi South, supervise pipeline replacement projects, and coordinate leak survey schedules.",
    attachment1Title: "Application Form",
    attachment1Doc: "application-form.pdf",
    email: "careers.engineering@ssgc.com.pk",
  },
];

export const previousJobs: ArchivedJob[] = [
  {
    id: "hr-2026-011",
    jobCode: "SSGC/HR/2026/011",
    title: "HR Business Partner",
    city1: "Karachi",
    publicationDate: "2-Jun-2026",
    deadline: "1-Jul-2026",
  },
  {
    id: "eng-trans-2026-003",
    jobCode: "SSGC/HR/2026/003",
    title: "Transmission Pipeline Engineer",
    city1: "Sukkur",
    publicationDate: "14-May-2026",
    deadline: "10-Jun-2026",
  },
  {
    id: "legal-2026-001",
    jobCode: "SSGC/HR/2026/001",
    title: "Legal Counsel",
    city1: "Karachi",
    publicationDate: "20-Apr-2026",
    deadline: "18-May-2026",
  },
  {
    id: "cust-2026-019",
    jobCode: "SSGC/HR/2026/019",
    title: "Complaint Resolution Officer",
    city1: "Hyderabad",
    publicationDate: "11-Mar-2026",
    deadline: "8-Apr-2026",
  },
  {
    id: "it-2026-007",
    jobCode: "SSGC/HR/2026/007",
    title: "Network Security Engineer",
    city1: "Karachi",
    publicationDate: "25-Feb-2026",
    deadline: "22-Mar-2026",
  },
];