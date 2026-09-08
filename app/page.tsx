import { Archivo, Inter } from "next/font/google";
import prisma from "./lib/db";
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-archivo",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

// Regenerate this page at most once per hour — keeps job postings fresh
// without needing client-side fetching (useQuery), which would hurt SEO
// since crawlers need the job content present in the initial HTML.
export const revalidate = 3600;

export const metadata = {
  title: "Careers at SSGC",
  description:
    "Current job openings and archived postings at Sui Southern Gas Company.",
};

// Matches your Prisma Job model exactly — snake_case fields, real DB shape
interface JobRecord {
  id: number;
  job_code: string;
  title: string;
  city: string[];
  publication_date: Date;
  deadline: Date;
  age: number | null;
  qualification: string;
  skill: string | null;
  responsibility: string | null;
  special_info: string | null;
  doc1_title: string | null;
  doc1_attachment: string | null;
  doc2_title: string | null;
  doc2_attachment: string | null;
  job_type: string;
  email: string | null;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function cityLine(job: JobRecord) {
  return Array.isArray(job.city) ? job.city.join(", ") : "";
}

function DetailRow({ label, html }: { label: string; html?: string | null }) {
  if (!html) return null;
  return (
    <tr className="border-b border-[#DCE7F5] last:border-b-0">
      <td className="w-48 shrink-0 px-5 py-4 align-top text-sm font-semibold text-[#0F2A52]">
        {label}
      </td>
      {/* Source content may include simple inline HTML (e.g. bullet lists),
          same as the original Blade template's {!! !!} fields. */}
      <td
        className="px-5 py-4 text-[15px] leading-relaxed text-[#3D5170]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </tr>
  );
}

function JobPosting({ job }: { job: JobRecord }) {
  const applyHref = job.email
    ? `mailto:${job.email}`
    : `/user/dashboard/?jobId=${job.id}`;

  return (
    <article className="mb-10 overflow-hidden rounded-sm border border-[#C9D9EE] bg-white shadow-[0_1px_3px_rgba(15,58,145,0.06)]">
      {/* Job code bar — deep flame-blue base */}
      <div className="flex items-center gap-2 bg-[#0B2E6B] px-5 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[#8FB8FF]">
          Job code
        </span>
        <span className="text-sm font-semibold text-white">{job.job_code}</span>
      </div>

      {/* Title / location / deadline */}
      <div className="grid grid-cols-1 divide-y divide-[#DCE7F5] border-b border-[#DCE7F5] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-[#5E7396]">Job title</p>
          <p className="mt-1 font-[family-name:var(--font-archivo)] text-lg font-bold text-[#0F2A52]">
            {job.title}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-[#5E7396]">Location</p>
          <p className="mt-1 text-[15px] font-medium text-[#0F2A52]">
            {cityLine(job)}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-[#5E7396]">Deadline</p>
          {/* Deadline gets the flame-tip orange — the "urgent" accent color */}
          <p className="mt-1 text-[15px] font-semibold text-[#E8720C]">
            {formatDate(job.deadline)}
          </p>
        </div>
      </div>

      {job.special_info && (
        <div
          className="border-b border-[#DCE7F5] bg-[#FFF1E2] px-5 py-3 text-sm font-medium text-[#B4530A]"
          dangerouslySetInnerHTML={{ __html: job.special_info }}
        />
      )}

      {/* Job details */}
      <div className="px-5 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#5E7396]">
          Job details
        </p>
      </div>
      <table className="w-full text-left">
        <tbody>
          <DetailRow
            label="Qualification & experience"
            html={job.qualification}
          />
          {job.age && (
            <tr className="border-b border-[#DCE7F5] last:border-b-0">
              <td className="w-48 shrink-0 px-5 py-4 align-top text-sm font-semibold text-[#0F2A52]">
                Age
              </td>
              <td className="px-5 py-4 text-[15px] text-[#3D5170]">
                Not more than {job.age} years
              </td>
            </tr>
          )}
          <DetailRow label="Skills" html={job.skill} />
          <DetailRow label="Responsibilities" html={job.responsibility} />

          {(job.doc1_attachment || job.doc2_attachment) && (
            <tr className="border-b border-[#DCE7F5] bg-[#F1F6FD]">
              <td colSpan={2} className="px-5 py-3 text-sm text-[#3D5170]">
                Applicants must download the form(s) below and attach the
                duly-filled form(s) with their application.
              </td>
            </tr>
          )}
          {job.doc1_attachment && (
            <tr className="border-b border-[#DCE7F5]">
              <td className="w-48 shrink-0 px-5 py-4 align-top text-sm font-semibold text-[#0F2A52]">
                {job.doc1_title}
              </td>
              <td className="px-5 py-4">
                <a
                  href={job.doc1_attachment}
                  className="text-sm font-medium text-[#1554C7] underline underline-offset-2 hover:text-[#0B2E6B]"
                >
                  Download file
                </a>
              </td>
            </tr>
          )}
          {job.doc2_attachment && (
            <tr>
              <td className="w-48 shrink-0 px-5 py-4 align-top text-sm font-semibold text-[#0F2A52]">
                {job.doc2_title}
              </td>
              <td className="px-5 py-4">
                <a
                  href={job.doc2_attachment}
                  className="text-sm font-medium text-[#1554C7] underline underline-offset-2 hover:text-[#0B2E6B]"
                >
                  Download file
                </a>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="px-5 py-5">
        {/* Apply button — flame-tip orange, the highest-emphasis color on the page */}
        <a
          href={applyHref}
          className="inline-flex items-center gap-2 rounded-sm bg-[#E8720C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C85E06]"
        >
          Apply now
        </a>
      </div>
    </article>
  );
}

export default async function CareersPage() {
  const allJobs = await prisma.job.findMany({
    orderBy: { created_at: "desc" },
  });

  const now = new Date();
  const currentJobs = allJobs.filter((job) => new Date(job.deadline) >= now);
  const previousJobs = allJobs.filter((job) => new Date(job.deadline) < now);

  return (
    <main
      className={`${archivo.variable} ${inter.variable} min-h-screen bg-[#F3F7FD] font-[family-name:var(--font-inter)] text-[#0F2A52]`}
    >
      {/* Header */}
      <header className="border-b border-[#C9D9EE] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div className="font-[family-name:var(--font-archivo)] text-xl font-extrabold tracking-tight text-[#0B2E6B]">
            SSGC
          </div>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-sm border border-[#0B2E6B] px-4 py-1.5 text-sm font-medium text-[#0B2E6B] hover:bg-[#0B2E6B] hover:text-white"
          >
            Login
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-8 font-[family-name:var(--font-archivo)] text-2xl font-bold text-[#0F2A52]">
          Current openings
        </h1>

        {currentJobs.length > 0 ? (
          currentJobs.map((job) => <JobPosting key={job.id} job={job} />)
        ) : (
          <p className="rounded-sm border border-[#C9D9EE] bg-white px-6 py-10 text-center text-[#5E7396]">
            There are no new jobs opening at this time. Please check back later.
          </p>
        )}

        {/* Archived positions */}
        {previousJobs.length > 0 && (
          <div className="mt-14">
            <hr className="border-[#C9D9EE]" />
            <h2 className="mb-6 mt-8 font-[family-name:var(--font-archivo)] text-2xl font-bold text-[#0F2A52]">
              Archived positions
            </h2>

            <div className="overflow-x-auto rounded-sm border border-[#C9D9EE] bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#C9D9EE] bg-[#EAF1FB] text-[#5E7396]">
                    <th className="px-5 py-3 font-medium">Job code</th>
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Location</th>
                    <th className="px-5 py-3 font-medium">Publication date</th>
                    <th className="px-5 py-3 font-medium">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {previousJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-[#DCE7F5] last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="px-5 py-4 text-left font-medium text-[#0F2A52]"
                      >
                        {job.job_code}
                      </th>
                      <td className="px-5 py-4 text-[#3D5170]">{job.title}</td>
                      <td className="px-5 py-4 text-[#3D5170]">
                        {cityLine(job)}
                      </td>
                      <td className="px-5 py-4 text-[#3D5170]">
                        {formatDate(job.publication_date)}
                      </td>
                      <td className="px-5 py-4 text-[#3D5170]">
                        {formatDate(job.deadline)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-[#C9D9EE] bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-[#5E7396]">
          © {new Date().getFullYear()} Sui Southern Gas Company. All positions
          are subject to SSGC's recruitment policy.
        </div>
      </footer>
    </main>
  );
}
