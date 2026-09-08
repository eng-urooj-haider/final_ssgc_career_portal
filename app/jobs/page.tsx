// app/jobs/page.tsx  — no changes needed here, this file was already correct
"use client";

import Link from "next/link";
import DataTable from "../components/ui/DataTable";
import { getJobs } from "../lib/jobs";

const columns = [
  {
    id: "index",
    header: "#",
    meta: { width: "6%" },
    enableSorting: false,
    cell: ({ row }) => <div>{row.index + 1}</div>,
  },
  {
    accessorKey: "job_code",
    header: "Job Code",
    meta: { width: "16%" },
  },
  {
    accessorKey: "title",
    header: "Title",
    meta: { width: "28%" },
    cell: ({ row }) => (
      <Link
        href={`/jobs/${row.original.id}`}
        className="font-medium text-[#0B2E63] text-[#F5A623] underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "deadline_formatted",
    header: "Deadline",
    meta: { width: "14%" },
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
          className="rounded-lg border border-[#F5A623]/40 bg-[#FFF9F0] px-2.5 py-1 text-xs font-medium text-[#D88900] transition hover:bg-[#F5A623] hover:text-white"
        >
          View
        </Link>
        <Link
          href={`jobs/${row.original.id}/edit`}
          className="rounded-lg border border-[#0B2E63]/20 px-2.5 py-1 text-xs font-medium text-[#0B2E63] transition hover:border-[#0B2E63] hover:bg-[#0B2E63] hover:text-white"
        >
          Edit
        </Link>
      </div>
    ),
  },
];

export default function JobsList() {
  return (
    <main className="min-h-screen bg-[#FFF9F0] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2E63]">Jobs</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage all jobs.
            </p>
          </div>

          <Link
            href="/jobs/create"
            className="rounded-lg bg-[#0E7C7B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B6564]"
          >
            ＋ Add New Job
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
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
    </main>
  );
}
