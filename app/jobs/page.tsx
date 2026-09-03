// app/cities/page.tsx
"use client";

import Link from "next/link";
import DataTable from "../components/ui/DataTable";

const columns = [
  {
    id: "index",
    header: "#",
    meta: { width: "6%" },
    enableSorting: false,
    cell: ({ row }) => <div>{row.index + 1}</div>,
  },
  {
    accessorKey: "title",
    header: "City Name",
    meta: { width: "30%" },
    cell: ({ getValue }) => {
      const value = getValue();
      if (!value) return "";
      return value.charAt(0).toUpperCase() + value.slice(1);
    },
  },
  {
    accessorKey: "created_at_formatted",
    header: "Created At",
    meta: { width: "16%" },
  },
  {
    id: "actions",
    header: "Actions",
    meta: { width: "14%" },
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/cities/${row.original.id}`}
          className="rounded-lg border border-[#F5A623]/40 bg-[#FFF9F0] px-2.5 py-1 text-xs font-medium text-[#D88900] transition hover:bg-[#F5A623] hover:text-white"
        >
          View
        </Link>
        <Link
          href={`/cities/${row.original.id}/edit`}
          className="rounded-lg border border-[#0B2E63]/20 px-2.5 py-1 text-xs font-medium text-[#0B2E63] transition hover:border-[#0B2E63] hover:bg-[#0B2E63] hover:text-white"
        >
          Edit
        </Link>
      </div>
    ),
  },
];

export default function CityList() {
  return (
    <main className="min-h-screen bg-[#FFF9F0] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/jobs" className="hover:text-[#F5A623] hover:underline">
                Jobs Portal
              </Link>
              <span>/</span>
              <span className="text-gray-700">Cities</span>
            </div>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[#0B2E63]">
              <span className="text-[#F5A623]">▶</span> Cities
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage all cities.
            </p>
          </div>

          <Link
            href="/cities/new"
            className="rounded-lg bg-[#0E7C7B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B6564]"
          >
            ＋ Add New City
          </Link>
        </div>

        {/* Table card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <DataTable
            columns={columns}
            queryKey="cities"
            pageSize={10}
            searchPlaceholder="Search cities.."
            showExportButtons={false}
          />
        </div>
      </div>
    </main>
  );
}