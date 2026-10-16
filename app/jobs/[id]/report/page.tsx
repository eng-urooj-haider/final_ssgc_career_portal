// app/jobs/[id]/report/page.tsx
"use client";

import Link from "next/link";
import { FileText, Paperclip, ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/app/components/ui/DataTable";
import { getJob, getReport } from "../../../lib/jobs";
import { flame, flameGradient } from "../../../lib/flameTheme";

type ReportRow = {
  id: number;
  firstName: string;
  lastName: string;
  cnic: string;
  createdAt: string;
  cv: string | null;
  doc1Path: string | null;
  doc2Path: string | null;
};

const pillBase =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold transition hover:text-white";

function FileLink({
  href,
  label,
  title,
  icon: Icon,
  tone,
}: {
  href: string | null;
  label: string;
  title: string;
  icon: typeof FileText;
  tone: "red" | "blue";
}) {
  if (!href) return <span className="text-slate-400">-</span>;

  const colors =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-600"
      : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-600";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={title}
      className={`${pillBase} ${colors}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

const columns: ColumnDef<any, ReportRow>[] = [
  {
    id: "index",
    header: "#",
    meta: { width: "6%" },
    enableSorting: false,
    cell: ({ row }) => <div className="text-slate-500">{row.index + 1}</div>,
  },
  {
    id: "name",
    header: "Applicant Name",
    meta: { width: "20%" },
    enableSorting: false,
    cell: ({ row }) => {
      const name = `${row.original.firstName ?? ""} ${row.original.lastName ?? ""}`.trim();
      return (
        <span className="text-sm font-semibold text-slate-700">
          {name || "N/A"}
        </span>
      );
    },
  },
  {
    id: "cnic",
    header: "CNIC",
    meta: { width: "16%" },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-slate-700">
        {row.original.cnic || "N/A"}
      </span>
    ),
  },
  {
    id: "createdAt",
    header: "Applied On",
    meta: { width: "14%" },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-slate-600">{row.original.createdAt}</span>
    ),
  },
  {
    id: "cv",
    header: "Resume",
    meta: { width: "12%" },
    enableSorting: false,
    cell: ({ row }) => (
      <FileLink
        href={row.original.cv}
        label="PDF"
        title="View resume (PDF)"
        icon={FileText}
        tone="red"
      />
    ),
  },
  {
    id: "doc1",
    header: "Doc 1",
    meta: { width: "12%" },
    enableSorting: false,
    cell: ({ row }) => (
      <FileLink
        href={row.original.doc1Path}
        label="Doc 1"
        title="View document 1"
        icon={Paperclip}
        tone="blue"
      />
    ),
  },
  {
    id: "doc2",
    header: "Doc 2",
    meta: { width: "12%" },
    enableSorting: false,
    cell: ({ row }) => (
      <FileLink
        href={row.original.doc2Path}
        label="Doc 2"
        title="View document 2"
        icon={Paperclip}
        tone="blue"
      />
    ),
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

export default function JobReportPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isError, error } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
    enabled: !!id,
    retry: (count, err) => err.message !== "NOT_FOUND" && count < 1,
    refetchOnWindowFocus: false,
  });

  const jobCode = data?.data?.jobCode;

  // DataTable passes `id`, but the report API expects `uuid`
  const fetchReport = async (p: {
    pageIndex: number;
    pageSize: number;
    search: string;
  }): Promise<any> => getReport({ ...p, uuid: id });

  if (isError && error.message === "NOT_FOUND") {
    return (
      <main
        className="min-h-screen px-4 py-10"
        style={{ background: flame.paper }}
      >
        <div className="mx-auto max-w-6xl">
          <BackLink />
          <p className="mt-10 text-center text-slate-600">Job not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{ background: flame.paper }}
    >
      <div className="mx-auto max-w-6xl">
        <BackLink />

        <div className="mb-4">
          <img
            src="/assests/logo-full.png"
            className="h-16 w-auto"
            alt="SSGC logo"
          />
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Applicants for this job.</p>

          <a
            href={`/api/applications/export?uuid=${id}`}
            className="inline-flex w-full items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-600 hover:text-white sm:w-auto"
          >
            Export Excel
          </a>
        </div>

        <div
          className="overflow-hidden rounded-xl bg-white"
          style={{
            border: "1px solid #E7E5E1",
            boxShadow: "0 1px 2px rgba(11,31,51,0.04)",
          }}
        >
          <div className="h-1" style={{ background: flameGradient }} />
          {jobCode && (
            <h1 className="mt-2 text-center text-3xl text-slate-500">
              Report for Job Code {jobCode}
            </h1>
          )}
          <div className="overflow-x-auto p-6">
            <DataTable
              columns={columns}
              fetchData={fetchReport}
              queryKey="report"
              pageSize={10}
              searchPlaceholder="Search applicants..."
              showExportButtons={false}
              id={id}
            />
          </div>
        </div>
      </div>
    </main>
  );
}