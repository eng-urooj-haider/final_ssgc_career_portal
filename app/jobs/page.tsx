// app/jobs/page.tsx
"use client";

import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import DataTable from "../components/ui/DataTable";
import { getJobs } from "../lib/jobs";
import { flame, flameGradient } from "../lib/flameTheme";

const columns = [
  {
    id: "index",
    header: "#",
    meta: { width: "6%" },
    enableSorting: false,
    cell: ({ row }) => <div className="text-slate-500">{row.index + 1}</div>,
  },
  {
    accessorKey: "jobCode", // was "job_code"
    header: "Job Code",
    meta: { width: "16%" },
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-slate-700">
        {row.original.jobCode}
      </span>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    meta: { width: "28%" },
    cell: ({ row }) => (
      <Link
        href={`/jobs/${row.original.id}`}
        className="font-semibold text-[#1C6FD9] transition-colors hover:text-[#F0862E] hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "deadline_formatted",
    header: "Deadline",
    meta: { width: "14%" },
    cell: ({ row }) => (
      <span className="text-slate-600">{row.original.deadline_formatted}</span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    meta: { width: "14%" },
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/jobs/${row.original.id}`}
          className="rounded-md border border-[#1C6FD9]/30 bg-[#1C6FD9]/5 px-2.5 py-1 text-xs font-semibold text-[#1C6FD9] transition hover:bg-[#1C6FD9] hover:text-white"
        >
          View
        </Link>
        <Link
          href={`/jobs/${row.original.id}/edit`} // was relative: "jobs/..."
          className="rounded-md border border-[#F0862E]/40 bg-[#F0862E]/5 px-2.5 py-1 text-xs font-semibold text-[#D96F12] transition hover:bg-[#F0862E] hover:text-white"
        >
          Edit
        </Link>
      </div>
    ),
  },
];

export default function JobsList() {
  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{ background: flame.paper }}
    >
      <div className="mx-auto max-w-5xl">
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
          <div className="overflow-x-auto p-6">
            <DataTable
              columns={columns}
              fetchData={getJobs}
              queryKey="jobs"
              pageSize={10}
              searchPlaceholder="Search jobs.."
              showExportButtons={false}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
