// app/components/jobs/JobForm.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Building2, Plus, X } from "lucide-react";
import {
  capitalizeFirst,
  capitalizeWords,
  TITLE_MAX,
} from "../../lib/textFormat";
import { flame, flameGradient } from "../../lib/flameTheme";

const RichTextEditor = dynamic(() => import("../RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="rounded-md border border-slate-300 bg-slate-50 p-4 text-sm text-slate-400">
      Loading editor…
    </div>
  ),
});

/* -------------------------------------------------------------------------- */
/*  Styling helpers                                                            */
/* -------------------------------------------------------------------------- */

const baseInput =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2 disabled:bg-slate-100";

const fieldClass = (error?: string) =>
  `${baseInput} ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-300 focus:border-[#1C6FD9] focus:ring-[#1C6FD9]/20"
  }`;

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-semibold text-slate-800"
    >
      {children}
      {required && (
        <span className="ml-0.5" style={{ color: flame.edge }}>
          *
        </span>
      )}
    </label>
  );
}

function FieldError({ name, message }: { name: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`error-${name}`} role="alert" className="mt-1 text-xs text-red-500">
      {message}
    </p>
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
    <div className="border-t border-slate-200 pt-6">
      <h3
        className="text-sm font-bold uppercase tracking-wide"
        style={{ color: flame.ink }}
      >
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Types & defaults                                                           */
/* -------------------------------------------------------------------------- */

export interface JobFormData {
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

export const emptyJobFormData: JobFormData = {
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
};

/* -------------------------------------------------------------------------- */
/*  Validation                                                                 */
/* -------------------------------------------------------------------------- */

export type JobFormErrors = Record<string, string | undefined>;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
// Must match the API route, which only accepts PDF / PNG / JPEG
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Rich text editors return HTML even when "empty" (e.g. "<p><br></p>")
const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

export function validateJobForm(d: JobFormData): JobFormErrors {
  const e: JobFormErrors = {};

  // Job code
  const jobCode = d.job_code.trim();
  if (!jobCode) e.job_code = "Job code is required.";
  else if (jobCode.length > 15)
    e.job_code = "Job code must be 15 characters or less.";
  else if (!/^[A-Za-z0-9_-]+$/.test(jobCode))
    e.job_code = "Use only letters, numbers, hyphens or underscores.";

  // Title
  const title = d.title.trim();
  if (!title) e.title = "Title is required.";
  else if (title.length > TITLE_MAX)
    e.title = `Title must be ${TITLE_MAX} characters or less.`;

  // Cities (empty extra rows are ignored on submit)
  const cities = d.cities.map((c) => c.trim()).filter(Boolean);
  if (cities.length === 0) e.cities = "Add at least one city.";
  else if (new Set(cities.map((c) => c.toLowerCase())).size !== cities.length)
    e.cities = "Duplicate cities are not allowed.";

  // Dates
  if (!d.publication_date) e.publication_date = "Publication date is required.";
  if (!d.deadline) e.deadline = "Deadline is required.";
  else if (d.publication_date && d.deadline < d.publication_date)
    e.deadline = "Deadline cannot be before the publication date.";

  // Age (optional)
  if (d.age !== "") {
    const n = Number(d.age);
    if (!Number.isInteger(n) || n < 18 || n > 65)
      e.age = "Enter a whole number between 18 and 65.";
  }

  // Rich text
  if (!stripHtml(d.qualification))
    e.qualification = "Qualification & experience is required.";

  // Attachments
  [
    { n: 1, title: d.attachment_1_title.trim(), file: d.attachment_1_doc },
    { n: 2, title: d.attachment_2_title.trim(), file: d.attachment_2_doc },
  ].forEach(({ n, title: t, file }) => {
    if (file && !t)
      e[`attachment_${n}_title`] = "Enter a title for this document.";
    // Remove this rule in edit mode if the file already exists on the server
    if (t && !file)
      e[`attachment_${n}_doc`] = "Attach a file or clear the title.";
    if (file) {
      if (!ALLOWED_FILE_TYPES.includes(file.type))
        e[`attachment_${n}_doc`] = "Only PDF, JPG or PNG files are allowed.";
      else if (file.size > MAX_FILE_SIZE)
        e[`attachment_${n}_doc`] = "File must be 5 MB or smaller.";
    }
  });

  // Job type + conditional email
  if (!d.job_type) e.job_type = "Select a job type.";
  if (d.job_type === "Email") {
    const email = d.email.trim();
    if (!email) e.email = "Email address is required.";
    else if (!EMAIL_REGEX.test(email)) e.email = "Enter a valid email address.";
    else if (email.length > 254) e.email = "Email address is too long.";
  }

  return e;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

interface JobFormProps {
  /** Pre-fill values for edit mode. Omit for create mode. */
  initialData?: Partial<JobFormData>;
  /** Called with the validated, trimmed form values when submitted. */
  onSubmit: (data: JobFormData) => void;
  /** Disables inputs and shows a loading label on the submit button. */
  isSubmitting: boolean;
  /** Server-side error message to display above the form, if any. */
  submitError?: string | null;
  /** Section heading shown at the top of the form. */
  heading: string;
  submitLabel: string;
  submitLoadingLabel: string;
}

export default function JobForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitError = null,
  heading,
  submitLabel,
  submitLoadingLabel,
}: JobFormProps) {
  const [formData, setFormData] = useState<JobFormData>({
    ...emptyJobFormData,
    ...initialData,
  });
  const [errors, setErrors] = useState<JobFormErrors>({});

  const clearError = (key: string) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  // Generic handler for plain text/date/number/email/radio inputs
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name } = e.target;
    let value = e.target.value;

    // Title: no leading spaces, first letter capital, hard 50-char cap
    if (name === "title") {
      value = capitalizeFirst(value.replace(/^\s+/, "")).slice(0, TITLE_MAX);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // don't keep a stale email when switching away from "Email"
      ...(name === "job_type" && value !== "Email" ? { email: "" } : {}),
    }));
    clearError(name);
    if (name === "job_type") clearError("email");
    if (name === "publication_date") clearError("deadline");
  };

  // Dynamic city list handlers — first letter of every word is capitalised
  const handleCityChange = (index: number, value: string) => {
    const formatted = capitalizeWords(value.replace(/^\s+/, ""));
    setFormData((prev) => ({
      ...prev,
      cities: prev.cities.map((city, i) => (i === index ? formatted : city)),
    }));
    clearError("cities");
  };

  const handleAddCity = () => {
    setFormData((prev) => ({ ...prev, cities: [...prev.cities, ""] }));
    clearError("cities");
  };

  const handleRemoveCity = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      cities: prev.cities.filter((_, i) => i !== index),
    }));
    clearError("cities");
  };

  // Rich text editors
  const handleRichText = (field: keyof JobFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  // File inputs
  const handleFileChange = (
    field: "attachment_1_doc" | "attachment_2_doc",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, [field]: file }));
    clearError(field);
    clearError(field.replace("_doc", "_title"));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const found = validateJobForm(formData);
    setErrors(found);

    const firstKey = Object.keys(found).find((k) => found[k]);
    if (firstKey) {
      requestAnimationFrame(() =>
        document
          .getElementById(`error-${firstKey}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    onSubmit({
      ...formData,
      job_code: formData.job_code.trim(),
      title: capitalizeFirst(formData.title.trim()).slice(0, TITLE_MAX),
      cities: formData.cities
        .map((c) => capitalizeWords(c.trim()))
        .filter(Boolean),
      attachment_1_title: formData.attachment_1_title.trim(),
      attachment_2_title: formData.attachment_2_title.trim(),
      request_doc_1_title: formData.request_doc_1_title.trim(),
      request_doc_2_title: formData.request_doc_2_title.trim(),
      email: formData.email.trim(),
    });
  };

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-lg font-bold" style={{ color: flame.ink }}>
          {heading}
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Please provide the job / position details.
        </p>
      </div>

      {submitError && (
        <div
          role="alert"
          className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600"
        >
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* Basic details */}
        <div className="space-y-5">
          <SectionDivider title="Basic Details" />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel required htmlFor="job_code">
                Job Code
              </FieldLabel>
              <input
                id="job_code"
                name="job_code"
                type="text"
                value={formData.job_code}
                onChange={handleChange}
                disabled={isSubmitting}
                maxLength={15}
                placeholder="e.g. SSGC-2026-001"
                aria-invalid={!!errors.job_code}
                className={fieldClass(errors.job_code)}
              />
              <FieldError name="job_code" message={errors.job_code} />
            </div>

            <div>
              <FieldLabel required htmlFor="title">
                Title
              </FieldLabel>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                disabled={isSubmitting}
                maxLength={TITLE_MAX}
                placeholder="e.g. Senior Network Engineer"
                aria-invalid={!!errors.title}
                className={fieldClass(errors.title)}
              />
              <div className="mt-1 flex items-start justify-between gap-2">
                <FieldError name="title" message={errors.title} />
                <span className="ml-auto text-xs text-slate-400">
                  {formData.title.length}/{TITLE_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* Cities — dynamic add/remove */}
          <div>
            <FieldLabel required>City / Location</FieldLabel>
            <div className="space-y-3">
              {formData.cities.map((city, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name={`city_${index + 1}`}
                      type="text"
                      value={city}
                      onChange={(e) => handleCityChange(index, e.target.value)}
                      disabled={isSubmitting}
                      maxLength={TITLE_MAX}
                      placeholder={`City / Location ${index === 0 ? "" : `#${index + 1}`}`}
                      aria-invalid={index === 0 && !!errors.cities}
                      className={`${fieldClass(index === 0 ? errors.cities : undefined)} pl-9`}
                    />
                  </div>

                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCity(index)}
                      disabled={isSubmitting}
                      aria-label="Remove city"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-400 transition hover:border-[#F0862E] hover:text-[#F0862E]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <FieldError name="cities" message={errors.cities} />

            <button
              type="button"
              onClick={handleAddCity}
              disabled={isSubmitting}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1C6FD9] transition-opacity hover:opacity-80"
            >
              <Plus className="h-4 w-4" />
              Add another city
            </button>
          </div>

          {/* Dates + age */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <FieldLabel required htmlFor="publication_date">
                Publication Date
              </FieldLabel>
              <input
                id="publication_date"
                name="publication_date"
                type="date"
                value={formData.publication_date}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-invalid={!!errors.publication_date}
                className={fieldClass(errors.publication_date)}
              />
              <FieldError
                name="publication_date"
                message={errors.publication_date}
              />
            </div>

            <div>
              <FieldLabel required htmlFor="deadline">
                Deadline
              </FieldLabel>
              <input
                id="deadline"
                name="deadline"
                type="date"
                value={formData.deadline}
                onChange={handleChange}
                disabled={isSubmitting}
                min={formData.publication_date || undefined}
                aria-invalid={!!errors.deadline}
                className={fieldClass(errors.deadline)}
              />
              <FieldError name="deadline" message={errors.deadline} />
            </div>

            <div>
              <FieldLabel htmlFor="age">Age</FieldLabel>
              <input
                id="age"
                name="age"
                type="number"
                min={18}
                max={65}
                step={1}
                inputMode="numeric"
                value={formData.age}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-invalid={!!errors.age}
                className={fieldClass(errors.age)}
              />
              <FieldError name="age" message={errors.age} />
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
            <FieldError name="qualification" message={errors.qualification} />
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
            subtitle="Optional supporting documents (PDF, JPG or PNG, up to 5 MB each)."
          />

          {([1, 2] as const).map((n) => {
            const titleKey = `attachment_${n}_title` as const;
            const docKey = `attachment_${n}_doc` as const;
            return (
              <div
                key={n}
                className="rounded-lg p-4"
                style={{ background: "#FBFBFA", border: "1px solid #E7E5E1" }}
              >
                <p
                  className="mb-3 text-sm font-semibold"
                  style={{ color: flame.ink }}
                >
                  Attachment Document #{n}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor={titleKey}>Document Title</FieldLabel>
                    <input
                      id={titleKey}
                      name={titleKey}
                      type="text"
                      value={formData[titleKey]}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      maxLength={200}
                      aria-invalid={!!errors[titleKey]}
                      className={fieldClass(errors[titleKey])}
                    />
                    <FieldError name={titleKey} message={errors[titleKey]} />
                  </div>
                  <div>
                    <FieldLabel>Attach File</FieldLabel>
                    <div
                      className={`flex items-center overflow-hidden rounded-md border bg-white ${
                        errors[docKey] ? "border-red-400" : "border-slate-300"
                      }`}
                    >
                      <label
                        className="cursor-pointer whitespace-nowrap px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: flameGradient }}
                      >
                        Choose File
                        <input
                          type="file"
                          name={docKey}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          disabled={isSubmitting}
                          onChange={(e) => handleFileChange(docKey, e)}
                        />
                      </label>
                      <span className="truncate px-3 text-xs text-slate-500">
                        {formData[docKey]?.name ?? "No file chosen"}
                      </span>
                    </div>
                    <FieldError name={docKey} message={errors[docKey]} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Requested docs from applicant */}
        <div className="space-y-5">
          <SectionDivider
            title="Documents Requested From Applicant"
            subtitle="Applicants will be asked to upload these when applying."
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="request_doc_1_title">
                Request Document from Applicant - 1
              </FieldLabel>
              <input
                id="request_doc_1_title"
                name="request_doc_1_title"
                type="text"
                value={formData.request_doc_1_title}
                onChange={handleChange}
                disabled={isSubmitting}
                maxLength={200}
                placeholder="Document title"
                className={fieldClass()}
              />
            </div>
            <div>
              <FieldLabel htmlFor="request_doc_2_title">
                Request Document from Applicant - 2
              </FieldLabel>
              <input
                id="request_doc_2_title"
                name="request_doc_2_title"
                type="text"
                value={formData.request_doc_2_title}
                onChange={handleChange}
                disabled={isSubmitting}
                maxLength={200}
                placeholder="Document title"
                className={fieldClass()}
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
                    className="flex items-center gap-2 text-sm font-medium text-slate-700"
                  >
                    <input
                      type="radio"
                      name="job_type"
                      value={type}
                      checked={formData.job_type === type}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="h-4 w-4 accent-[#1C6FD9]"
                    />
                    {type}
                  </label>
                ),
              )}
            </div>
            <FieldError name="job_type" message={errors.job_type} />
          </div>

          {/* Email — shown only when "Email" job type is selected */}
          {formData.job_type === "Email" && (
            <div>
              <FieldLabel required htmlFor="email">
                Email Address
              </FieldLabel>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                maxLength={254}
                placeholder="applications@example.com"
                aria-invalid={!!errors.email}
                className={fieldClass(errors.email)}
              />
              <FieldError name="email" message={errors.email} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: flameGradient }}
          >
            {isSubmitting ? submitLoadingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}