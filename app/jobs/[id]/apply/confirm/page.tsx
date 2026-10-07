"use client";

import React, { useState, type ChangeEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, FileText, Paperclip, Flame } from "lucide-react";
import { getJob } from "@/app/lib/jobs";
import useUserProfile from "@/app/lib/fetchUserProfile";

// ---------------------------------------------------------------------------
// Theme (matches ProfileTabs)
// ---------------------------------------------------------------------------

const flame = {
  core: "#1C6FD9",
  mid: "#2E8FD6",
  edge: "#F0862E",
  tip: "#FBB03B",
  ink: "#0B1F33",
  paper: "#FAFAF8",
};

const flameGradient = `linear-gradient(90deg, ${flame.core} 0%, ${flame.mid} 45%, ${flame.edge} 78%, ${flame.tip} 100%)`;

// ---------------------------------------------------------------------------
// Types (matches the real API response — no snake_case / Blade-era fields)
// ---------------------------------------------------------------------------

interface JobDetail {
  id: number;
  jobCode: string;
  title: string;
  cities: string[];
  deadline: string;
  maxAge?: number | null;
  qualification?: string | null; // HTML
  specialInfo?: string | null; // HTML
  req1DocTitle?: string | null;
  req2DocTitle?: string | null;
}

interface JobApiResponse {
  data: JobDetail;
}

interface ExperienceEntry {
  id: number;
  job_title?: string;
  jobTitle?: string;
  company: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
}

interface CertificateEntry {
  id: number;
  name?: string;
  certificateName?: string;
  organisation: string;
}

interface ProfileFlags {
  experience?: boolean;
  certificate?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDeadline(deadline: unknown): string {
  if (!deadline) return "-";
  const d = new Date(deadline as string | number | Date);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatExperienceDuration(start?: string, end?: string): string {
  if (!start || !end) return "";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "";
  }
  // Count the end month as complete, mirroring the PHP ->setTime(24,0,0) behaviour.
  endDate.setMonth(endDate.getMonth() + 1);

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (endDate.getDate() < startDate.getDate()) {
    months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
  }

  const yearLabel = `${years} Year${years === 1 ? "" : "s"}`;
  const monthLabel =
    months > 0 ? `, ${months} Month${months === 1 ? "" : "s"}` : "";
  return `${yearLabel}${monthLabel}`;
}

function locationLabel(job?: JobDetail): string {
  if (!job || !job.cities?.length) return "-";
  return job.cities.filter(Boolean).join(", ") || "-";
}

// ---------------------------------------------------------------------------
// Small UI primitives
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-center gap-2">
      <h2
        className="text-sm font-bold uppercase tracking-wide"
        style={{ color: flame.ink }}
      >
        {children}
      </h2>
      <div className="h-px flex-1" style={{ background: "#E7E5E1" }} />
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <label
      className="flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors"
      style={{
        border: `1px solid ${checked ? flame.core : "#E7E5E1"}`,
        background: checked ? "#F0F7FF" : "#FBFBFA",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ accentColor: flame.core }}
      />
      <span className="text-sm text-slate-700">
        <span className="font-semibold" style={{ color: flame.ink }}>
          {label}
        </span>
        {sub && (
          <span className="block text-xs text-slate-500 mt-0.5">{sub}</span>
        )}
      </span>
    </label>
  );
}

function FileRow({
  label,
  file,
  onChange,
  error,
  required,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <span className="block text-sm font-semibold text-slate-800 mb-1.5">
        {label}
        {required && (
          <span className="ml-0.5" style={{ color: flame.edge }}>
            *
          </span>
        )}
      </span>
      <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
        <Paperclip className="w-4 h-4 shrink-0" style={{ color: flame.core }} />
        <span className="truncate flex-1">
          {file ? file.name : "Choose a file (Word or PDF)..."}
        </span>
        <span
          className="rounded px-2 py-1 text-xs font-semibold text-white shrink-0"
          style={{ background: flameGradient }}
        >
          Browse
        </span>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.files?.[0] || null)
          }
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root page
// ---------------------------------------------------------------------------

export default function JobApplicationConfirmPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params?.id as string;
  const queryClient = useQueryClient();

  const {
    data: job,
    isLoading: isLoadingJob,
    isError: isJobError,
  } = useQuery<JobDetail>({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const res = await getJob(jobId);
      return (res as unknown as JobApiResponse).data; // unwrap the { data: {...} } envelope
    },
    enabled: Boolean(jobId),
  });

  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();

  const experiences: ExperienceEntry[] = profile?.experiences ?? [];
  const certificates: CertificateEntry[] = profile?.certificates ?? [];
  const profileFlags: ProfileFlags = profile?.applicationRequirements ?? {
    experience: experiences.length > 0,
    certificate: certificates.length > 0,
  };

  const [selectedExperience, setSelectedExperience] = useState<number[]>([]);
  const [selectedCertificates, setSelectedCertificates] = useState<number[]>(
    [],
  );
  const [doc1, setDoc1] = useState<File | null>(null);
  const [doc2, setDoc2] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggle(list: number[], id: number, setList: (v: number[]) => void) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (profileFlags.experience && selectedExperience.length === 0) {
      next.experience = "Please select relevant experience.";
    }
    if (profileFlags.certificate && selectedCertificates.length === 0) {
      next.certificate = "Please select relevant certificate(s).";
    }
    if (job?.req1DocTitle && !doc1) {
      next.doc_1 = `Please attach ${job.req1DocTitle}.`;
    }
    if (job?.req2DocTitle && !doc2) {
      next.doc_2 = `Please attach ${job.req2DocTitle}.`;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const body = new FormData();
      selectedExperience.forEach((id) =>
        body.append("experience[]", String(id)),
      );
      selectedCertificates.forEach((id) =>
        body.append("certificate[]", String(id)),
      );
      if (doc1) body.append("doc_1", doc1);
      if (doc2) body.append("doc_2", doc2);
      body.append("job_id", jobId);
     const res =  await axios.post("/api/applications/finish", body, {
        withCredentials: true,
      });
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      router.replace(res.data.data.redirectTo);

      // router.push("/applications/confirmation");
    } catch (err) {
      console.error("Application submission failed", err);
      setSubmitError("Something went wrong while submitting your application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelAndLogout() {
    try {
      await axios.post("/api/logout", {}, { withCredentials: true });
    } finally {
      router.push("/login");
    }
  }

  const isLoading = isLoadingJob || isLoadingProfile;

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: flame.paper }}
      >
        <p className="text-slate-600 font-medium">Loading job details…</p>
      </div>
    );
  }

  if (isJobError || !job) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: flame.paper }}
      >
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-md shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Job not found
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            We couldn&apos;t find the job you&apos;re trying to apply for.
            Please check the link and try again.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-md text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: flameGradient }}
          >
            Back to jobs
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ background: flame.paper }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: flameGradient }}
          >
            <Flame
              className="w-5 h-5 text-white"
              fill="white"
              fillOpacity={0.25}
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: flame.ink }}>
              Confirm your application
            </h1>
            <p className="text-sm text-slate-500">
              Review the position details below before submitting.
            </p>
          </div>
        </div>

        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{
            border: "1px solid #E7E5E1",
            boxShadow: "0 1px 2px rgba(11,31,51,0.04)",
          }}
        >
          <div className="h-1" style={{ background: flameGradient }} />

          <div className="p-6 sm:p-8">
            <div
              className="rounded-md px-4 py-3 mb-6 flex items-center gap-2"
              style={{ background: "#FFF4E5", border: "1px solid #FBD9A5" }}
            >
              <CheckCircle2
                className="w-5 h-5 shrink-0"
                style={{ color: flame.edge }}
              />
              <p className="text-sm font-semibold" style={{ color: flame.ink }}>
                You are applying for the following position:
              </p>
            </div>

            {/* Job code */}
            <div className="grid grid-cols-3 rounded-t-md overflow-hidden border border-slate-200">
              <div
                className="col-span-1 px-4 py-2 text-sm font-bold text-white"
                style={{ background: flame.core }}
              >
                JOB CODE
              </div>
              <div className="col-span-2 px-4 py-2 text-sm font-semibold text-slate-800 bg-white">
                {job.jobCode ?? "-"}
              </div>
            </div>

            {/* Title / Location / Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border border-t-0 border-slate-200 text-xs font-bold uppercase tracking-wide">
              <div
                className="px-4 py-2"
                style={{ background: "#F1F5F9", color: flame.ink }}
              >
                Job Title
              </div>
              <div
                className="px-4 py-2 sm:border-l border-slate-200"
                style={{ background: "#F1F5F9", color: flame.ink }}
              >
                Location
              </div>
              <div
                className="px-4 py-2 sm:border-l border-slate-200"
                style={{ background: "#F1F5F9", color: flame.ink }}
              >
                Deadline
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 rounded-b-md overflow-hidden border border-t-0 border-slate-200 text-sm font-semibold text-slate-800">
              <div className="px-4 py-2 bg-white">{job.title ?? "-"}</div>
              <div className="px-4 py-2 sm:border-l border-slate-200 bg-white">
                {locationLabel(job)}
              </div>
              <div className="px-4 py-2 sm:border-l border-slate-200 bg-white">
                {formatDeadline(job.deadline)}
              </div>
            </div>

            {job.specialInfo && (
              <div
                className="mt-4 text-sm font-medium text-slate-700"
                dangerouslySetInnerHTML={{ __html: job.specialInfo }}
              />
            )}

            {/* Job details */}
            <SectionTitle>Job Details</SectionTitle>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-1 sm:gap-4 border-b border-slate-100 pb-3">
                <span className="font-semibold text-slate-600">
                  Qualification &amp; Experience
                </span>
                <span
                  className="text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: job.qualification ?? "-",
                  }}
                />
              </div>
              {job.maxAge && (
                <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-1 sm:gap-4">
                  <span className="font-semibold text-slate-600">Age</span>
                  <span className="text-slate-700">
                    Not more than {job.maxAge} years
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Experience */}
              {profileFlags.experience && (
                <>
                  <SectionTitle>Select Relevant Experience</SectionTitle>
                  <p className="text-sm text-slate-500 mb-3">
                    Please select work experience most relevant to the above
                    position:
                  </p>
                  <div className="space-y-2">
                    {experiences.map((exp) => (
                      <CheckRow
                        key={exp.id}
                        checked={selectedExperience.includes(exp.id)}
                        onChange={() =>
                          toggle(
                            selectedExperience,
                            exp.id,
                            setSelectedExperience,
                          )
                        }
                        label={`${exp.job_title ?? exp.jobTitle ?? ""} — ${exp.company}`}
                        sub={formatExperienceDuration(
                          exp.start_date ?? exp.startDate,
                          exp.end_date ?? exp.endDate,
                        )}
                      />
                    ))}
                  </div>
                  {errors.experience && (
                    <p className="mt-2 text-xs text-red-500">
                      {errors.experience}
                    </p>
                  )}
                </>
              )}

              {/* Certificates */}
              {profileFlags.certificate && (
                <>
                  <SectionTitle>Select Relevant Certificate(s)</SectionTitle>
                  <p className="text-sm text-slate-500 mb-3">
                    Please select certificate(s) relevant to the above position:
                  </p>
                  <div className="space-y-2">
                    {certificates.map((cert) => (
                      <CheckRow
                        key={cert.id}
                        checked={selectedCertificates.includes(cert.id)}
                        onChange={() =>
                          toggle(
                            selectedCertificates,
                            cert.id,
                            setSelectedCertificates,
                          )
                        }
                        label={cert.name ?? cert.certificateName ?? ""}
                        sub={cert.organisation}
                      />
                    ))}
                  </div>
                  {errors.certificate && (
                    <p className="mt-2 text-xs text-red-500">
                      {errors.certificate}
                    </p>
                  )}
                </>
              )}

              {/* Extra required documents */}
              {job.req1DocTitle && (
                <div className="mt-5">
                  <FileRow
                    label={`Attach ${job.req1DocTitle}`}
                    file={doc1}
                    onChange={setDoc1}
                    error={errors.doc_1}
                    required
                  />
                </div>
              )}
              {job.req2DocTitle && (
                <div className="mt-5">
                  <FileRow
                    label={`Attach ${job.req2DocTitle}`}
                    file={doc2}
                    onChange={setDoc2}
                    error={errors.doc_2}
                    required
                  />
                </div>
              )}

              {submitError && (
                <p className="mt-4 text-sm font-medium text-rose-600">
                  {submitError}
                </p>
              )}

              <div
                className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t pt-6"
                style={{ borderColor: "#E7E5E1" }}
              >
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FileText className="w-4 h-4" />
                  Documents should be in Word or PDF format.
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: flameGradient }}
                >
                  {submitting ? "Submitting…" : "Confirm Your Job Application"}
                </button>
              </div>
            </form>
          </div>

          <div
            className="flex items-center justify-end gap-3 border-t px-6 sm:px-8 py-4"
            style={{ borderColor: "#E7E5E1", background: "#FBFBFA" }}
          >
            <a
              href="/"
              className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: flame.tip, color: flame.ink }}
            >
              Cancel Process
            </a>
            <button
              type="button"
              onClick={handleCancelAndLogout}
              className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "#E0554A" }}
            >
              Cancel &amp; Logoff
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
