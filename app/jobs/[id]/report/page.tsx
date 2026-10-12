// app/jobs/page.tsx
"use client";

import Link from "next/link";
import { Briefcase, Plus, FileText, Paperclip, ArrowLeft } from "lucide-react";
import DataTable from "@/app/components/ui/DataTable";
import { getJob, getJobs, getReport } from "../../../lib/jobs";
import { flame, flameGradient } from "../../../lib/flameTheme";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
const columns = [
  {
    id: "index",
    header: "#",
    meta: { width: "6%" },
    enableSorting: false,
    cell: ({ row }) => <div className="text-slate-500">{row.index + 1}</div>,
  },
  {
    accessorKey: "firstName", // was "job_code"
    header: "Applicant Name",
    meta: { width: "16%" },
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-slate-700">
        {row.original.firstName} {row.original.lastName}
      </span>
    ),
  },
  {
    accessorKey: "cnic", // was "job_code"
    header: "CNIC",
    meta: { width: "16%" },
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-slate-700">
        {row.original.cnic}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Applied On",
    meta: { width: "14%" },
    cell: ({ row }) => (
      <span className="text-slate-600">{row.original.createdAt}</span>
    ),
  },
  {
    accessorKey: "cv",
    header: "Resume",
    meta: { width: "14%" },
    cell: ({ row }) => {
      const cv = row.original.cv;

      if (!cv) return <span className="text-slate-400">-</span>;

      return (
        <a
          href={cv}
          target="_blank"
          rel="noopener noreferrer"
          title="View resume"
          aria-label="View resume (PDF)"
          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
        >
          <FileText className="h-4 w-4" />
          PDF
        </a>
      );
    },
  },
  {
    accessorKey: "doc1",
    header: "Doc1",
    meta: { width: "14%" },
    cell: ({ row }) => {
      const doc1 = row.original.doc1;

      if (!doc1) return <span className="text-slate-400">-</span>;

      return (
        <a
          href={doc1}
          target="_blank"
          rel="noopener noreferrer"
          title="View resume"
          aria-label="View resume (PDF)"
          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
        >
          <Paperclip className="h-4 w-4" />
          Doc1
        </a>
      );
    },
  },
  {
    accessorKey: "doc2",
    header: "Doc2",
    meta: { width: "14%" },
    cell: ({ row }) => {
      const doc2 = row.original.doc2;

      if (!doc2) return <span className="text-slate-400">-</span>;

      return (
        <a
          href={doc2}
          target="_blank"
          rel="noopener noreferrer"
          title="View resume"
          aria-label="View resume (PDF)"
          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
        >
          <Paperclip className="h-4 w-4" />
          Doc2
        </a>
      );
    },
  },
];
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
export default function JobsList() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
    enabled: !!id, // don't run until id exists
    retry: (count, err) => err.message !== "NOT_FOUND" && count < 1,
    refetchOnWindowFocus: false,
  });
  const jobCode = data?.jobCode
  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{ background: flame.paper }}
    >
      <div className="mx-auto max-w-6xl">
        <BackLink />

        {/* Logo */}
        <div className="mb-4">
          <img
            src="/assests/logo-full.png"
            className="h-16 w-auto"
            alt="SSGC logo"
          />
        </div>

        {/* Text on the left, button on the right */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">View and manage all jobs.</p>

          <Link
            href="/jobs/create"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto"
            style={{ background: flameGradient }}
          >
            <Plus className="h-4 w-4" />
            Add New Job
          </Link>
        </div>

        {/* Table card (unchanged) */}
        <div
          className="overflow-hidden rounded-xl bg-white"
          style={{
            border: "1px solid #E7E5E1",
            boxShadow: "0 1px 2px rgba(11,31,51,0.04)",
          }}
        >
          <div className="h-1" style={{ background: flameGradient }} />
          {jobCode && (<h1 className="text-center mt-2 text-slate-500 text-3xl ">
            Report for Job Code {jobCode}
          </h1>)}
          <div className="overflow-x-auto p-6">
            <DataTable
              columns={columns}
              fetchData={getReport}
              queryKey="report"
              pageSize={10}
              searchPlaceholder="Search jobs.."
              showExportButtons={false}
              id={id}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
