// app/lib/jobs.ts
import axios from "axios";
import type { JobFormData } from "../components/jobs/JobForm";

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

interface JobResponse {
  message: string;
  data: {
    id: number;
  };
}

// Shared FormData-building logic used by both create and update
function buildJobFormData(data: JobFormData): FormData {
  const body = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (key === "cities") {
      body.append(key, JSON.stringify(value));
    } else if (value !== null) {
      body.append(key, value as string | Blob);
    }
  });
  return body;
}

export const createJob = async (data: JobFormData): Promise<JobResponse> => {
  const body = buildJobFormData(data);
  const response = await axios.post("/api/jobs", body, {
    withCredentials: true,
  });
  return response.data;
};

export const updateJob = async (
  id: string | number,
  data: JobFormData,
): Promise<JobResponse> => {
  const body = buildJobFormData(data);
  const response = await axios.put(`/api/jobs/${id}`, body, {
    withCredentials: true,
  });
  return response.data;
};
export const getJob = async (id: string): Promise<JobsResponse> => {
  const response = await axios.get(`/api/jobs/${id}`);
  return response.data;
};

interface JobResponse {
  message: string;
  data: {
    id: number;
  };
}
