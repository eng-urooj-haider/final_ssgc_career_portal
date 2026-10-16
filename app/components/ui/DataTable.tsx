"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useTable,
  tableFeatures,
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createSortedRowModel,
  createPaginatedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

interface FetchDataParams {
  pageIndex: number;
  pageSize: number;
  search: string;
  id: any;
}

interface ApiResponse<TData> {
  data?: TData[];
  total?: number;
  from?: number;
  to?: number;
  last_page?: number;
}

interface DataTableProps<TData = any> {
  columns: any[];   // was ColumnDef<any, any>[]
  fetchData: (params: FetchDataParams) => Promise<ApiResponse<TData>>;
  queryKey: string;
  pageSize?: number;
  searchPlaceholder?: string;
  showExportButtons?: boolean;
  id?: any;
}

const DataTable = <TData = any,>({
  columns,
  fetchData,
  queryKey,
  pageSize = 10,
  searchPlaceholder = "Search…",
  showExportButtons = false,
  id = null,
  // handleExportExcel = () => {},
  // handleExportPdf = () => {},
}: DataTableProps<TData>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  const isSearchAction = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      isSearchAction.current = true;
      setDebouncedSearch(globalFilter);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 400);

    return () => clearTimeout(timeout);
  }, [globalFilter]);

  const {
    data: apiData,
    isFetching,
    isError,
    isPending,
  } = useQuery({
    queryKey: [queryKey, pagination, debouncedSearch, id],
    queryFn: () =>
      fetchData({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: debouncedSearch,
        id,
      }),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const data = apiData?.data ?? [];
  const totalRows = apiData?.total ?? 0;
  const from = apiData?.from ?? 0;
  const to = apiData?.to ?? 0;
  const resolvedPageCount = apiData?.last_page ?? -1;

  const table = useTable({
    features,
    data: data as any,
    columns: columns as any,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualFiltering: true,
    pageCount: resolvedPageCount,
  });

  const rows = table.getRowModel().rows;
  const pageIndex = pagination.pageIndex;

  return (
    <div className="relative w-full min-w-0 overflow-x-auto overflow-y-visible rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
        <div className="flex w-full min-w-0 max-w-sm flex-1 items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 transition-all duration-200 focus-within:border-[#F5821F] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#F5821F]/15 sm:w-auto sm:min-w-[240px]">
          <svg
            className="size-4 shrink-0 text-gray-400"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.167 15.833a6.667 6.667 0 1 0 0-13.333 6.667 6.667 0 0 0 0 13.333ZM17.5 17.5l-3.625-3.625"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <label htmlFor="datatable-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <input
            id="datatable-search"
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        {showExportButtons && (
          <div className="flex flex-wrap items-center gap-2">
            {/* <button
              onClick={handleExportExcel}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Export Excel
            </button> */}
            {/* <button
              onClick={handleExportPdf}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50"
            >
              Download PDF
            </button> */}
            <span className="shrink-0 text-xs text-gray-500">
              {totalRows} {totalRows === 1 ? "result" : "results"}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            {columns.map((col, idx) => (
              <col
                key={col.id ?? (col as any).accessorKey ?? idx}
                style={{ width: (col.meta as any)?.width ?? "auto" }}
              />
            ))}
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-gray-100 bg-gray-50/60"
              >
                {headerGroup.headers.map((header) => {
                  const sortDir = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`min-w-0 truncate px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 ${
                        canSort
                          ? "cursor-pointer select-none transition-colors hover:text-[#F5821F]"
                          : ""
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {canSort && (
                          <span className="flex flex-col leading-none text-[8px]">
                            <span
                              className={
                                sortDir === "asc"
                                  ? "text-[#F5821F]"
                                  : "text-gray-300"
                              }
                            >
                              ▲
                            </span>
                            <span
                              className={
                                sortDir === "desc"
                                  ? "text-[#F5821F]"
                                  : "text-gray-300"
                              }
                            >
                              ▼
                            </span>
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {isPending &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-gray-100">
                  {columns.map((col, j) => (
                    <td
                      key={col.id ?? (col as any).accessorKey ?? j}
                      className="px-4 py-3"
                    >
                      <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}

            {isError && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-red-500"
                >
                  Failed to load data, job not found
                </td>
              </tr>
            )}

            {!isPending && !isError && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  No results found.
                </td>
              </tr>
            )}

            {!isPending &&
              !isError &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-sm font-medium text-gray-700"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3.5">
        <span className="text-xs text-gray-500">
          {totalRows === 0
            ? "0 results"
            : `Showing ${from}–${to} of ${totalRows}`}
          {isFetching && " · Updating…"}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="flex size-8 items-center justify-center rounded-lg text-gray-400 ring-1 ring-gray-200 transition-colors duration-150 hover:bg-gray-50 hover:text-[#F5821F] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            aria-label="First page"
          >
            «
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex size-8 items-center justify-center rounded-lg text-gray-400 ring-1 ring-gray-200 transition-colors duration-150 hover:bg-gray-50 hover:text-[#F5821F] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            aria-label="Previous page"
          >
            ‹
          </button>

          <span className="px-2 text-xs text-gray-500 whitespace-nowrap">
            Page{" "}
            <span className="font-semibold text-gray-800">{pageIndex + 1}</span>{" "}
            of{" "}
            <span className="font-semibold text-gray-800">
              {resolvedPageCount > 0 ? resolvedPageCount : 1}
            </span>
          </span>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex size-8 items-center justify-center rounded-lg text-gray-400 ring-1 ring-gray-200 transition-colors duration-150 hover:bg-gray-50 hover:text-[#F5821F] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            aria-label="Next page"
          >
            ›
          </button>
          <button
            onClick={() => table.setPageIndex(resolvedPageCount - 1)}
            disabled={!table.getCanNextPage() || resolvedPageCount <= 0}
            className="flex size-8 items-center justify-center rounded-lg text-gray-400 ring-1 ring-gray-200 transition-colors duration-150 hover:bg-gray-50 hover:text-[#F5821F] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;