// app/lib/jobs.ts
import type { JobFormData } from "../components/jobs/JobForm";
import api from "./api";

interface FetchJobsParams {
  pageIndex: number;
  pageSize: number;
  search: string;
}

interface FetchReportParams {
  pageIndex: number;
  pageSize: number;
  search: string;
  uuid: string;
}

export interface JobRecord {
  id: number;
  jobCode: string;
  title: string;
  cities: string[];
  publicationDate: string;
  deadline: string;
  maxAge: number | null;
  qualification: string;
  skill: string;
  responsibility: string;
  specialInfo: string;
  doc1Title: string;
  doc2Title: string;
  req1DocTitle: string;
  req2DocTitle: string;
  jobType: string;
  email: string;
  doc1Attachment: string | null;
  doc2Attachment: string | null;
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

interface SingleJobResponse {
  message?: string;
  data: JobRecord;
}
export interface ReportRow {
  id: number;
  firstName: string;
  lastName: string;
  cnic: string;
  createdAt: string;
  cv: string | null;
  doc1Path: string | null;
  doc2Path: string | null;
}

interface PagedResponse<T> {
  data: T[];
  total: number;
  last_page: number;
  from: number;
  to: number;
}

// Axios throws on 404, so a status check after the call never runs.
// Convert the error here so the page can show "not found".
function toAppError(err: unknown): never {
  if ((err as any)?.response?.status === 404) throw new Error("NOT_FOUND");
  throw err;
}

export const getJobs = async ({
  pageIndex,
  pageSize,
  search,
}: FetchJobsParams): Promise<JobsResponse> => {
  const response = await api.get("/api/jobs", {
    params: {
      page: pageIndex + 1,
      limit: pageSize,
      search,
    },
  });
  return response.data;
};

export const getReport = async ({
  pageIndex,
  pageSize,
  search,
  uuid,
}: FetchReportParams): Promise<PagedResponse<ReportRow>> => {
  try {
    const response = await api.get("/api/reports", {
      params: { page: pageIndex + 1, limit: pageSize, search, uuid },
    });
    return response.data;
  } catch (err) {
    return toAppError(err);
  }
};

interface MutationResponse {
  message: string;
  data: {
    id: number;
  };
}

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

export const createJob = async (
  data: JobFormData,
): Promise<MutationResponse> => {
  const body = buildJobFormData(data);
  const response = await api.post("/api/jobs", body, {
    withCredentials: true,
  });
  return response.data;
};

export const updateJob = async (
  id: string | number,
  data: JobFormData,
): Promise<MutationResponse> => {
  const body = buildJobFormData(data);
  const response = await api.put(`/api/jobs/${id}`, body, {
    withCredentials: true,
  });
  return response.data;
};

export const getJob = async (uuid: string): Promise<SingleJobResponse> => {
  try {
    const response = await api.get(`/api/jobs/${uuid}`);
    return response.data;
  } catch (err) {
    return toAppError(err);
  }
};
