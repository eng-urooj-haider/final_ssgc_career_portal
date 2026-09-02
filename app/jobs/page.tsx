// app/jobs/new/page.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Building2, Plus, X } from "lucide-react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";

const RichTextEditor = dynamic(() => import("../components/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm text-gray-400">
      Loading editor…
    </div>
  ),
});

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none transition focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/20 disabled:bg-gray-100";

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-[#333333]">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function SectionDivider({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-t border-gray-100 pt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0B2E63]">
        {title}
      </h3>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

interface JobFormData {
  job_code: string;
  title: string;
  cities: string[];
  publication_date: string;
  deadline: string;
  age: string;

  qualification: string;
  skills: string;
  responsibilities: string;
  special_info: string;

  attachment_1_title: string;
  attachment_1_doc: File | null;
  attachment_2_title: string;
  attachment_2_doc: File | null;

  request_doc_1_title: string;
  request_doc_2_title: string;

  job_type: "Permanent" | "Staff" | "Trainee" | "Email" | "";
  email: string;
}

interface JobResponse {
  message: string;
  data: {
    id: number;
  };
}

const createJob = async (data: JobFormData): Promise<JobResponse> => {
  const body = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (key === "cities") {
      body.append(key, JSON.stringify(value));
    } else if (value !== null) {
      body.append(key, value as string | Blob);
    }
  });
  const response = await axios.post("/api/jobs", body, {
    withCredentials: true,
  });
  return response.data;
};

export default function AddNewJobPage() {
  const [formData, setFormData] = useState<JobFormData>({
    job_code: "",
    title: "",
    cities: [""],
    publication_date: "",
    deadline: "",
    age: "",

    qualification: "",
    skills: "",
    responsibilities: "",
    special_info: "",

    attachment_1_title: "",
    attachment_1_doc: null,
    attachment_2_title: "",
    attachment_2_doc: null,

    request_doc_1_title: "",
    request_doc_2_title: "",

    job_type: "",
    email: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Generic handler — used by every plain text/date/number/email/radio input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Dynamic city list handlers — now update formData.cities directly
  const handleCityChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      cities: prev.cities.map((city, i) => (i === index ? value : city)),
    }));
  };

  const handleAddCity = () => {
    setFormData((prev) => ({ ...prev, cities: [...prev.cities, ""] }));
  };

  const handleRemoveCity = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      cities: prev.cities.filter((_, i) => i !== index),
    }));
  };

  // Rich text editors — each field gets its own onChange call
  const handleRichText = (field: keyof JobFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // File inputs
  const handleFileChange = (
    field: "attachment_1_doc" | "attachment_2_doc",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, [field]: file }));
  };
  const JobMutation = useMutation({
    mutationFn: createJob,
  });
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log(formData);
    JobMutation.mutate(formData);
  };

  return (
    <main className="min-h-screen bg-[#FFF9F0] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/jobs" className="hover:text-[#F5A623] hover:underline">
              Jobs Portal
            </Link>
            <span>/</span>
            <span className="text-gray-700">Add New Job</span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[#0B2E63]">
            <span className="text-[#F5A623]">▶</span> Add New Job
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Please provide the job / position details.
          </p>
        </div>

        {submitError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {submitError}
          </div>
        )}

        {/* Form card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            {/* Basic details */}
            <div className="space-y-5">
              <SectionDivider title="Basic Details" />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Job Code</FieldLabel>
                  <input
                    id="job_code"
                    name="job_code"
                    type="text"
                    value={formData.job_code}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={15}
                    placeholder="e.g. SSGC-2026-001"
                    className={inputClass}
                  />
                </div>

                <div>
                  <FieldLabel required>Title</FieldLabel>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={250}
                    placeholder="e.g. Senior Network Engineer"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Cities — dynamic add/remove */}
              <div>
                <FieldLabel required>City / Location</FieldLabel>
                <div className="space-y-3">
                  {formData.cities.map((city, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          name={`city_${index + 1}`}
                          type="text"
                          value={city}
                          onChange={(e) =>
                            handleCityChange(index, e.target.value)
                          }
                          disabled={isSubmitting}
                          placeholder={`City / Location ${index === 0 ? "" : `#${index + 1}`}`}
                          className={`${inputClass} pl-9`}
                        />
                      </div>

                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCity(index)}
                          disabled={isSubmitting}
                          aria-label="Remove city"
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-400 transition hover:border-red-300 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddCity}
                  disabled={isSubmitting}
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#D88900] hover:text-[#F5A623] hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add another city
                </button>
              </div>

              {/* Dates + age */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <FieldLabel required>Publication Date</FieldLabel>
                  <input
                    id="publication_date"
                    name="publication_date"
                    type="date"
                    value={formData.publication_date}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={inputClass}
                  />
                </div>

                <div>
                  <FieldLabel required>Deadline</FieldLabel>
                  <input
                    id="deadline"
                    name="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={inputClass}
                  />
                </div>

                <div>
                  <FieldLabel>Age</FieldLabel>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Rich text sections */}
            <div className="space-y-5">
              <SectionDivider
                title="Position Details"
                subtitle="Describe the qualifications, skills, and responsibilities for this role."
              />

              <div>
                <FieldLabel required>Qualification &amp; Experience</FieldLabel>
                <RichTextEditor
                  value={formData.qualification}
                  onChange={(v) => handleRichText("qualification", v)}
                  placeholder="Type or paste your content here!"
                />
              </div>

              <div>
                <FieldLabel>Skills</FieldLabel>
                <RichTextEditor
                  value={formData.skills}
                  onChange={(v) => handleRichText("skills", v)}
                  placeholder="Type or paste your content here!"
                />
              </div>

              <div>
                <FieldLabel>Responsibilities</FieldLabel>
                <RichTextEditor
                  value={formData.responsibilities}
                  onChange={(v) => handleRichText("responsibilities", v)}
                  placeholder="Type or paste your content here!"
                />
              </div>

              <div>
                <FieldLabel>Special / Misc. Info</FieldLabel>
                <RichTextEditor
                  value={formData.special_info}
                  onChange={(v) => handleRichText("special_info", v)}
                  placeholder="Type or paste your content here!"
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-5">
              <SectionDivider
                title="Attachments"
                subtitle="Optional supporting documents for internal reference or the job listing."
              />

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-3 text-sm font-semibold text-[#0B2E63]">
                  Attachment Document #1
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Document Title</FieldLabel>
                    <input
                      name="attachment_1_title"
                      type="text"
                      value={formData.attachment_1_title}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      maxLength={200}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel>Attach File</FieldLabel>
                    <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
                      <label className="cursor-pointer whitespace-nowrap bg-[#F5A623] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#D88900]">
                        Choose File
                        <input
                          type="file"
                          name="attachment_1_doc"
                          className="hidden"
                          disabled={isSubmitting}
                          onChange={(e) =>
                            handleFileChange("attachment_1_doc", e)
                          }
                        />
                      </label>
                      <span className="truncate px-3 text-xs text-gray-500">
                        {formData.attachment_1_doc?.name ?? "No file chosen"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-3 text-sm font-semibold text-[#0B2E63]">
                  Attachment Document #2
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Document Title</FieldLabel>
                    <input
                      name="attachment_2_title"
                      type="text"
                      value={formData.attachment_2_title}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      maxLength={200}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel>Attach File</FieldLabel>
                    <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
                      <label className="cursor-pointer whitespace-nowrap bg-[#F5A623] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#D88900]">
                        Choose File
                        <input
                          type="file"
                          name="attachment_2_doc"
                          className="hidden"
                          disabled={isSubmitting}
                          onChange={(e) =>
                            handleFileChange("attachment_2_doc", e)
                          }
                        />
                      </label>
                      <span className="truncate px-3 text-xs text-gray-500">
                        {formData.attachment_2_doc?.name ?? "No file chosen"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Requested docs from applicant */}
            <div className="space-y-5">
              <SectionDivider
                title="Documents Requested From Applicant"
                subtitle="Applicants will be asked to upload these when applying."
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel>Request Document from Applicant - 1</FieldLabel>
                  <input
                    name="request_doc_1_title"
                    type="text"
                    value={formData.request_doc_1_title}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={200}
                    placeholder="Document title"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Request Document from Applicant - 2</FieldLabel>
                  <input
                    name="request_doc_2_title"
                    type="text"
                    value={formData.request_doc_2_title}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={200}
                    placeholder="Document title"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Job type */}
            <div className="space-y-5">
              <SectionDivider title="Application Method" />

              <div>
                <FieldLabel required>Job Type</FieldLabel>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {(["Permanent", "Staff", "Trainee", "Email"] as const).map(
                    (type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 text-sm text-[#333333]"
                      >
                        <input
                          type="radio"
                          name="job_type"
                          value={type}
                          checked={formData.job_type === type}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className="h-4 w-4 accent-[#F5A623]"
                        />
                        {type}
                      </label>
                    ),
                  )}
                </div>
              </div>

              {/* Email — shown only when "Email" job type is selected */}
              {formData.job_type === "Email" && (
                <div>
                  <FieldLabel required>Email Address</FieldLabel>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={30}
                    placeholder="applications@example.com"
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 border-t border-gray-100 pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[#0E7C7B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B6564] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Adding Job…" : "＋ Add New Job"}
              </button>
              <Link
                href="/jobs"
                className="rounded-lg bg-[#F5A623] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D88900]"
              >
                ← Back
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
