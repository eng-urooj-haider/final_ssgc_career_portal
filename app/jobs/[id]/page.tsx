// app/jobs/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Clock,
  Download,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Users,
} from "lucide-react";
import { getJob } from "../../lib/jobs";
import { flame, flameGradient } from "../../lib/flameTheme";
import { htmlToPlainText } from "../../lib/textFormat";

/* ------------------------------ Types ------------------------------ */

interface Job {
  id: number;
  jobCode: string;
  title: string;
  cities: string[];
  publicationDate: string;
  deadline: string;
  maxAge: number | null;
  qualification: string;
  skill: string | null;
  responsibility: string | null;
  specialInfo: string | null;
  doc1Title: string | null;
  doc1Attachment: string | null;
  doc2Title: string | null;
  doc2Attachment: string | null;
  req1DocTitle: string | null;
  req2DocTitle: string | null;
  jobType: string;
  email: string | null;
}

/* ----------------------------- Helpers ----------------------------- */

const DAY = 24 * 60 * 60 * 1000;

const formatDate = (date?: string | null) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC", // @db.Date is stored as UTC midnight
      })
    : "—";

// Deadline is date-only, so the job stays open through the end of that day
const daysLeft = (deadline?: string | null): number | null => {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() + DAY - Date.now()) / DAY);
};

/* ---------------------------- UI pieces ---------------------------- */

const cardStyle = {
  border: "1px solid #E7E5E1",
  boxShadow: "0 1px 2px rgba(11,31,51,0.04)",
};

function Card({
  children,
  accent = false,
  className = "",
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl bg-white ${className}`}
      style={cardStyle}
    >
      {accent && <div className="h-1" style={{ background: flameGradient }} />}
      {children}
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-10" style={{ background: flame.paper }}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/jobs"
      className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to jobs
    </Link>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    blue: "bg-[#1C6FD9]/10 text-[#1C6FD9]",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-[#F0862E]/10 text-[#C4661A]",
    red: "bg-red-50 text-red-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${flame.core}14`, color: flame.core }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium text-slate-900">
          {children}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  text,
  first = false,
}: {
  title: string;
  text: string;
  first?: boolean;
}) {
  return (
    <section className={`px-6 py-6 sm:px-8 ${first ? "" : "border-t border-slate-200"}`}>
      <h2
        className="mb-3 text-sm font-bold uppercase tracking-wide"
        style={{ color: flame.ink }}
      >
        {title}
      </h2>
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
        {htmlToPlainText(text)}
      </p>
    </section>
  );
}

function SideTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mb-4 text-sm font-bold uppercase tracking-wide"
      style={{ color: flame.ink }}
    >
      {children}
    </h3>
  );
}

function DocLink({ title, href }: { title: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white"
      style={{ background: "#FBFBFA", border: "1px solid #E7E5E1" }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate text-sm font-medium text-slate-800">
          {title}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-[#1C6FD9] group-hover:text-[#F0862E]" />
    </a>
  );
}

/* ------------------------------- Page ------------------------------ */

export default function JobDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const {
    data: apiData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
  });

  if (isLoading) {
    return (
      <PageShell>
        <Card accent>
          <div className="animate-pulse space-y-4 p-8">
            <div className="h-6 w-2/3 rounded bg-slate-200" />
            <div className="h-4 w-1/3 rounded bg-slate-100" />
            <div className="h-24 rounded bg-slate-100" />
          </div>
        </Card>
      </PageShell>
    );
  }

  // Adjust if getJob returns the job directly instead of { data }
  const job: Job | undefined = apiData?.data ?? apiData;

  if (isError || !job) {
    return (
      <PageShell>
        <BackLink />
        <Card accent>
          <p className="p-8 text-sm font-medium text-red-500">
            Failed to load job details. It may not exist.
          </p>
        </Card>
      </PageShell>
    );
  }

  const left = daysLeft(job.deadline);
  const open = left !== null && left > 0;
  const cities = Array.isArray(job.cities) ? job.cities : [];
  const requestedDocs = [job.req1DocTitle, job.req2DocTitle].filter(
    Boolean,
  ) as string[];
  const attachments = [
    { title: job.doc1Title || "Document 1", href: job.doc1Attachment },
    { title: job.doc2Title || "Document 2", href: job.doc2Attachment },
  ].filter((d) => d.href) as { title: string; href: string }[];

  const sections = [
    { title: "Qualification & Experience", text: job.qualification },
    { title: "Skills", text: job.skill },
    { title: "Responsibilities", text: job.responsibility },
    { title: "Special / Misc. Info", text: job.specialInfo },
  ].filter((s) => s.text && htmlToPlainText(s.text)) as {
    title: string;
    text: string;
  }[];

  return (
    <PageShell>
      <BackLink />

      {/* Header card */}
      <Card accent className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-6 sm:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
              style={{ background: flameGradient }}
            >
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1
                className="break-words text-2xl font-semibold"
                style={{ color: flame.ink }}
              >
                {job.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-500">
                  {job.jobCode}
                </span>
                <Badge tone="blue">{job.jobType}</Badge>
                <Badge tone={open ? (left! <= 3 ? "amber" : "green") : "red"}>
                  {open
                    ? left === 1
                      ? "Closes today"
                      : `${left} days left`
                    : "Closed"}
                </Badge>
              </div>
            </div>
          </div>

          <Link
            href={`/jobs/${job.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: flameGradient }}
          >
            <Pencil className="h-4 w-4" />
            Edit job
          </Link>
        </div>
      </Card>

      {/* Body: description + sidebar */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Main column */}
        <Card className="lg:col-span-2">
          {sections.length > 0 ? (
            sections.map((s, i) => (
              <Section key={s.title} title={s.title} text={s.text} first={i === 0} />
            ))
          ) : (
            <p className="p-8 text-sm text-slate-500">
              No description has been added for this job.
            </p>
          )}
        </Card>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-6">
          <Card accent>
            <div className="space-y-5 p-6">
              <SideTitle>Job overview</SideTitle>
              <Fact icon={CalendarDays} label="Published">
                {formatDate(job.publicationDate)}
              </Fact>
              <Fact icon={Clock} label="Deadline">
                {formatDate(job.deadline)}
              </Fact>
              <Fact icon={MapPin} label="Location">
                {cities.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {cities.map((c) => (
                      <Badge key={c}>{c}</Badge>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </Fact>
              {job.maxAge != null && (
                <Fact icon={Users} label="Maximum age">
                  {job.maxAge} years
                </Fact>
              )}
              {job.email && (
                <Fact icon={Mail} label="Apply by email">
                  <a href={`mailto:${job.email}`}
                    className="break-all text-[#1C6FD9] hover:text-[#F0862E] hover:underline"
                  >
                    {job.email}
                  </a>
                </Fact>
              )}
            </div>
          </Card>

          {attachments.length > 0 && (
            <Card>
              <div className="p-6">
                <SideTitle>Attachments</SideTitle>
                <div className="space-y-2">
                  {attachments.map((d) => (
                    <DocLink key={d.title + d.href} title={d.title} href={d.href} />
                  ))}
                </div>
              </div>
            </Card>
          )}

          {requestedDocs.length > 0 && (
            <Card>
              <div className="p-6">
                <SideTitle>Required from applicants</SideTitle>
                <ul className="space-y-2">
                  {requestedDocs.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: flame.edge }}
                      />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </PageShell>
  );
}