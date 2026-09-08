// app/jobs/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";

interface Job {
  id: number;
  job_code: string;
  title: string;
  city: string[];
  publication_date: string;
  deadline: string;
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

function formatDate(date: string) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DetailRow({
  label,
  children,
  isEven,
}: {
  label: string;
  children: React.ReactNode;
  isEven: boolean;
}) {
  return (
    <tr className={isEven ? "bg-gray-50" : "bg-white"}>
      <td className="w-56 px-4 py-3 align-top text-sm font-semibold text-[#0B2E63]">
        {label}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{children}</td>
    </tr>
  );
}

export default function JobDetailsPage() {
  const params = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        if (!params?.id) return;
        const res = await axios.get(`/api/jobs/${params.id}`);
        setJob(res.data.data);
      } catch (err) {
        setError("Failed to load job details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [params?.id]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FFF9F0] px-4 py-8">
        <div className="mx-auto max-w-4xl text-sm text-gray-500">Loading…</div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-[#FFF9F0] px-4 py-8">
        <div className="mx-auto max-w-4xl text-sm text-red-500">
          {error ?? "Job not found."}
        </div>
      </main>
    );
  }

  // Pre-filter standard rows to maintain predictable alternating row colors cleanly
  const rows = [
    { label: "Job Code", value: job.job_code },
    { label: "Title", value: job.title },
    ...(job.city?.map((city, idx) => ({
      label: `City / Location #${idx + 1}`,
      value: city,
    })) || []),
    { label: "Publication Date", value: formatDate(job.publication_date) },
    { label: "Deadline", value: formatDate(job.deadline) },
    job.age ? { label: "Age", value: job.age } : null,
    job.qualification
      ? {
          label: "Qualification & Experience",
          html: job.qualification,
        }
      : null,
    job.skill
      ? {
          label: "Skills",
          html: job.skill,
        }
      : null,
    job.responsibility
      ? {
          label: "Responsibilities",
          html: job.responsibility,
        }
      : null,
    job.special_info
      ? { label: "Special / Misc. Info", value: job.special_info }
      : null,
    job.doc1_attachment
      ? {
          label: job.doc1_title || "Document 1",
          link: job.doc1_attachment,
        }
      : null,
    job.doc2_attachment
      ? {
          label: job.doc2_title || "Document 2",
          link: job.doc2_attachment,
        }
      : null,
    { label: "Job Type", value: job.job_type },
    job.email ? { label: "Email Address", value: job.email } : null,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#FFF9F0] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Page header */}
        <div className="mb-1 flex items-center gap-2 text-2xl font-bold text-[#0B2E63]">
          <span className="text-[#F5A623]">▶</span> Job Details
        </div>
        <p className="mb-4 text-sm font-semibold text-gray-700">{job.title}</p>

        {/* Detail table card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full border-collapse">
            <tbody>
              {rows.map((row, index) => (
                <DetailRow key={index} label={row!.label} isEven={index % 2 === 0}>
                  {row!.html ? (
                    <div dangerouslySetInnerHTML={{ __html: row!.html }} />
                  ) : row!.link ? (
                    <a
                      href={row!.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0E7C7B] underline hover:text-[#0B6564]"
                    >
                      Download File
                    </a>
                  ) : (
                    row!.value
                  )}
                </DetailRow>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="mt-6">
          <Link
            href="/jobs"
            className="inline-block rounded-lg bg-[#F5A623] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D88900]"
          >
            ← Back
          </Link>
        </div>
      </div>
    </main>
  );
}