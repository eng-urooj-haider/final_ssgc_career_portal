// app/lib/jobs.ts   (renamed — lowercase "jobs" to match the import)
import axios from "axios";

interface FetchJobsParams {
  pageIndex: number;
  pageSize: number;
  search: string;
}

interface JobsResponse {
  data: Array<{
    id: number;
    job_code: string;
    title: string;
    job_type: string;
    created_at_formatted: string;
  }>;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

export const getJobs = async ({
  pageIndex,
  pageSize,
  search,
}: FetchJobsParams): Promise<JobsResponse> => {
  const response = await axios.get("/api/jobs", {
    params: {
      page: pageIndex + 1, // your API is 1-indexed, TanStack Table is 0-indexed
      limit: pageSize,
      search,
    },
  });
  return response.data;
};