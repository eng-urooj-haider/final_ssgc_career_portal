// app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Inter } from "next/font/google";
import { CalendarDays, Clock, Download, MapPin } from "lucide-react";
import prisma from "./lib/db";
import { flame, flameGradient } from "./lib/flameTheme";
import { htmlToPlainText } from "./lib/textFormat";

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

// Regenerate at most once per hour. See the note below about on-demand
// revalidation so new jobs appear immediately after saving.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Careers at SSGC",
  description:
    "Current job openings and archived postings at Sui Southern Gas Company.",
};

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// `deadline` is a date-only value stored as UTC midnight. A job stays open
// until the end of that day in Pakistan (UTC+5, no DST) = 19:00 UTC.
const CLOSE_OFFSET_MS = 19 * HOUR;

async function getJobs() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - CLOSE_OFFSET_MS);
  const published = { publicationDate: { lte: now } }; // hide future postings

  const [current, archived] = await Promise.all([
    prisma.job.findMany({
      where: { ...published, deadline: { gt: cutoff } },
      orderBy: { publicationDate: "desc" },
    }),
    prisma.job.findMany({
      where: { ...published, deadline: { lte: cutoff } },
      orderBy: { deadline: "desc" },
      take: 50,
    }),
  ]);

  return { current, archived, now: now.getTime() };
}

type JobRecord = Awaited<ReturnType<typeof getJobs>>["current"][number];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC", // @db.Date is stored as UTC midnight
  });

const getCities = (job: JobRecord): string[] =>
  Array.isArray(job.cities) ? (job.cities as string[]) : [];

const daysLeft = (deadline: Date, now: number) =>
  Math.ceil((deadline.getTime() + CLOSE_OFFSET_MS - now) / DAY);

const applyHref = (job: JobRecord) =>
  job.email
    ? `mailto:${job.email}?subject=${encodeURIComponent(
        `Application for ${job.title} (${job.jobCode})`,
      )}`
    : `/user/dashboard?jobId=${job.id}`;

/* -------------------------------------------------------------------------- */
/*  UI pieces                                                                  */
/* -------------------------------------------------------------------------- */

function DeadlineBadge({ left }: { left: number }) {
  const urgent = left <= 3;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        urgent
          ? "bg-[#F0862E]/15 text-[#FBB03B]"
          : "bg-white/10 text-white/80"
      }`}
    >
      {left <= 1 ? "Closes today" : `${left} days left`}
    </span>
  );
}

function Detail({ label, text }: { label: string; text?: string | null }) {
  const value = htmlToPlainText(text);
  if (!value) return null;
  return (
    <div className="grid gap-1 border-b border-[#E7E5E1] px-5 py-4 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <dt className="text-sm font-semibold" style={{ color: flame.ink }}>
        {label}
      </dt>
      <dd className="whitespace-pre-line text-[15px] leading-relaxed text-slate-600">
        {value}
      </dd>
    </div>
  );
}

function DocDetail({ title, href }: { title: string | null; href: string }) {
  return (
    <div className="grid items-center gap-1 border-b border-[#E7E5E1] px-5 py-3.5 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <dt className="text-sm font-semibold" style={{ color: flame.ink }}>
        {title || "Document"}
      </dt>
      <dd>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1C6FD9] transition-colors hover:text-[#F0862E]"
        >
          <Download className="h-4 w-4" />
          Download file
        </a>
      </dd>
    </div>
  );
}

// Structured data so Google can show the job in job search results.
// "<" is escaped so the JSON can never break out of the script tag.
function JobJsonLd({ job }: { job: JobRecord }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    identifier: {
      "@type": "PropertyValue",
      name: "SSGC",
      value: job.jobCode,
    },
    datePosted: job.publicationDate.toISOString().slice(0, 10),
    validThrough: job.deadline.toISOString().slice(0, 10),
    hiringOrganization: {
      "@type": "Organization",
      name: "Sui Southern Gas Company",
    },
    jobLocation: getCities(job).map((city) => ({
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressCountry: "PK",
      },
    })),
    description: [job.qualification, job.skill, job.responsibility]
      .map(htmlToPlainText)
      .filter(Boolean)
      .join("\n\n"),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function JobPosting({ job, now }: { job: JobRecord; now: number }) {
  const cities = getCities(job);
  const special = htmlToPlainText(job.specialInfo);
  const hasDocs = job.doc1Attachment || job.doc2Attachment;
  const left = daysLeft(job.deadline, now);
  const href = applyHref(job);
  const buttonClass =
    "inline-flex items-center rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90";

  return (
    <article
      id={`job-${job.id}`}
      className="mb-8 scroll-mt-6 overflow-hidden rounded-xl bg-white"
      style={{
        border: "1px solid #E7E5E1",
        boxShadow: "0 1px 2px rgba(11,31,51,0.04)",
      }}
    >
      <JobJsonLd job={job} />
      <div className="h-1" style={{ background: flameGradient }} />

      {/* Job code bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5"
        style={{ background: flame.ink }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-white/60">
            Job code
          </span>
          <span className="text-sm font-semibold text-white">
            {job.jobCode}
          </span>
          <span className="ml-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/80">
            {job.jobType}
          </span>
        </div>
        <DeadlineBadge left={left} />
      </div>

      {/* Title + meta */}
      <div className="border-b border-[#E7E5E1] px-5 py-5">
        <h2
          className="break-words font-[family-name:var(--font-archivo)] text-xl font-bold"
          style={{ color: flame.ink }}
        >
          {job.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
          {cities.length > 0 && (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#1C6FD9]" />
              {cities.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                >
                  {c}
                </span>
              ))}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-[#1C6FD9]" />
            Posted {formatDate(job.publicationDate)}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#D96F12]">
            <Clock className="h-4 w-4" />
            Apply by {formatDate(job.deadline)}
          </span>
        </div>
      </div>

      {special && (
        <div className="whitespace-pre-line border-b border-[#E7E5E1] bg-[#FFF4E8] px-5 py-3 text-sm font-medium text-[#B4530A]">
          {special}
        </div>
      )}

      {/* Details */}
      <dl>
        <Detail label="Qualification & experience" text={job.qualification} />
        {job.maxAge != null && (
          <div className="grid gap-1 border-b border-[#E7E5E1] px-5 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
            <dt className="text-sm font-semibold" style={{ color: flame.ink }}>
              Age
            </dt>
            <dd className="text-[15px] text-slate-600">
              Not more than {job.maxAge} years
            </dd>
          </div>
        )}
        <Detail label="Skills" text={job.skill} />
        <Detail label="Responsibilities" text={job.responsibility} />
      </dl>

      {hasDocs && (
        <div className="border-t border-[#E7E5E1] bg-[#FBFBFA]">
          <p className="px-5 pt-4 text-sm text-slate-600">
            Applicants must download the form(s) below and attach the
            duly-filled form(s) with their application.
          </p>
          <dl>
            {job.doc1Attachment && (
              <DocDetail title={job.doc1Title} href={job.doc1Attachment} />
            )}
            {job.doc2Attachment && (
              <DocDetail title={job.doc2Title} href={job.doc2Attachment} />
            )}
          </dl>
        </div>
      )}

      <div className="border-t border-[#E7E5E1] px-5 py-5">
        {job.email ? (
          <a href={href} className={buttonClass} style={{ background: flameGradient }}>
            Apply by email
          </a>
        ) : (
          <Link href={href} className={buttonClass} style={{ background: flameGradient }}>
            Apply now
          </Link>
        )}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function CareersPage() {
  const { current, archived, now } = await getJobs();

  return (
    <main
      className={`${archivo.variable} ${inter.variable} min-h-screen font-[family-name:var(--font-inter)]`}
      style={{ background: flame.paper, color: flame.ink }}
    >
      <header className="border-b border-[#E7E5E1] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div
            className="font-[family-name:var(--font-archivo)] text-xl font-extrabold tracking-tight"
            style={{ color: flame.ink }}
          >
            SSGC
          </div>
          <Link
            href="/login"
            className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#1C6FD9] hover:text-[#1C6FD9]"
          >
            Login
          </Link>
        </div>
        <div className="h-1" style={{ background: flameGradient }} />
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-archivo)] text-2xl font-bold">
            Current openings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {current.length > 0
              ? `${current.length} open ${current.length === 1 ? "position" : "positions"} at Sui Southern Gas Company.`
              : "Check back soon for new opportunities."}
          </p>
        </div>

        {current.length > 0 ? (
          current.map((job) => <JobPosting key={job.id} job={job} now={now} />)
        ) : (
          <p className="rounded-xl border border-[#E7E5E1] bg-white px-6 py-10 text-center text-slate-500">
            There are no new jobs opening at this time. Please check back
            later.
          </p>
        )}

        {archived.length > 0 && (
          <section className="mt-14">
            <hr className="border-[#E7E5E1]" />
            <h2 className="mb-1 mt-8 font-[family-name:var(--font-archivo)] text-2xl font-bold">
              Archived positions
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              Applications for these positions are closed.
            </p>

            <div className="overflow-x-auto rounded-xl border border-[#E7E5E1] bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Archived job positions</caption>
                <thead>
                  <tr className="border-b border-[#E7E5E1] bg-[#FBFBFA] text-slate-500">
                    <th scope="col" className="px-5 py-3 font-semibold">Job code</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Title</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Location</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Published</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {archived.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-[#E7E5E1] last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="px-5 py-4 text-left font-medium"
                        style={{ color: flame.ink }}
                      >
                        {job.jobCode}
                      </th>
                      <td className="px-5 py-4 text-slate-600">{job.title}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {getCities(job).join(", ")}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(job.publicationDate)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(job.deadline)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <footer className="border-t border-[#E7E5E1] bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-slate-500">
          © {new Date().getFullYear()} Sui Southern Gas Company. All positions
          are subject to SSGC&apos;s recruitment policy.
        </div>
      </footer>
    </main>
  );
}