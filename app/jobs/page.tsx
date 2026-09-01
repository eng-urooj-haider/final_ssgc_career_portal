// app/jobs/new/page.tsx
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-[#333333]">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-t border-gray-100 pt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0B2E63]">
        {title}
      </h3>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

export default function AddNewJobPage() {
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

        {/* Form card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <form className="space-y-8" noValidate>
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
                    maxLength={250}
                    placeholder="e.g. Senior Network Engineer"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Cities */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <FieldLabel required>City / Location #1</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      🏢
                    </span>
                    <input
                      id="city_1"
                      name="city_1"
                      type="text"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>City / Location #2</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      🏢
                    </span>
                    <input
                      id="city_2"
                      name="city_2"
                      type="text"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>City / Location #3</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      🏢
                    </span>
                    <input
                      id="city_3"
                      name="city_3"
                      type="text"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
              </div>

              {/* Dates + age */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <FieldLabel required>Publication Date</FieldLabel>
                  <input
                    id="publication_date"
                    name="publication_date"
                    type="date"
                    className={inputClass}
                  />
                </div>

                <div>
                  <FieldLabel required>Deadline</FieldLabel>
                  <input
                    id="deadline"
                    name="deadline"
                    type="date"
                    className={inputClass}
                  />
                </div>

                <div>
                  <FieldLabel>Age</FieldLabel>
                  <input
                    id="age"
                    name="age"
                    type="number"
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
                  value=""
                  onChange={() => {}}
                  placeholder="Type or paste your content here!"
                />
              </div>

              <div>
                <FieldLabel>Skills</FieldLabel>
                <RichTextEditor
                  value=""
                  onChange={() => {}}
                  placeholder="Type or paste your content here!"
                />
              </div>

              <div>
                <FieldLabel>Responsibilities</FieldLabel>
                <RichTextEditor
                  value=""
                  onChange={() => {}}
                  placeholder="Type or paste your content here!"
                />
              </div>

              <div>
                <FieldLabel>Special / Misc. Info</FieldLabel>
                <RichTextEditor
                  value=""
                  onChange={() => {}}
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
                      maxLength={200}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel>Attach File</FieldLabel>
                    <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
                      <label className="cursor-pointer whitespace-nowrap bg-[#F5A623] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#D88900]">
                        Choose File
                        <input type="file" name="attachment_1_doc" className="hidden" />
                      </label>
                      <span className="truncate px-3 text-xs text-gray-500">
                        No file chosen
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
                      maxLength={200}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel>Attach File</FieldLabel>
                    <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
                      <label className="cursor-pointer whitespace-nowrap bg-[#F5A623] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#D88900]">
                        Choose File
                        <input type="file" name="attachment_2_doc" className="hidden" />
                      </label>
                      <span className="truncate px-3 text-xs text-gray-500">
                        No file chosen
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
                  <label className="flex items-center gap-2 text-sm text-[#333333]">
                    <input type="radio" name="job_type" value="Permanent" className="h-4 w-4 accent-[#F5A623]" />
                    Permanent
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#333333]">
                    <input type="radio" name="job_type" value="Staff" className="h-4 w-4 accent-[#F5A623]" />
                    Staff
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#333333]">
                    <input type="radio" name="job_type" value="Trainee" className="h-4 w-4 accent-[#F5A623]" />
                    Trainee
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#333333]">
                    <input type="radio" name="job_type" value="Email" className="h-4 w-4 accent-[#F5A623]" />
                    Email
                  </label>
                </div>
              </div>

              {/* Email — shown conditionally in the real form when "Email" job type is selected */}
              <div>
                <FieldLabel>Email Address</FieldLabel>
                <input
                  name="email"
                  type="email"
                  maxLength={30}
                  placeholder="applications@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 border-t border-gray-100 pt-6">
              <button
                type="submit"
                className="rounded-lg bg-[#0E7C7B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B6564]"
              >
                ＋ Add New Job
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