// app/jobs/[id]/edit/page.tsx
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import JobForm, { JobFormData } from "../../../components/jobs/JobForm";
import { updateJob, getJob } from "../../../lib/jobs";

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: (data: JobFormData) => updateJob(id, data),
    onSuccess: () => {
      router.push("/jobs");
    },
  });

  const handleSubmit = (data: JobFormData) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FFF9F0] px-4 py-8">
        <div className="mx-auto max-w-5xl text-sm text-gray-500">Loading job…</div>
      </main>
    );
  }

  if (isError || !apiData) {
    return (
      <main className="min-h-screen bg-[#FFF9F0] px-4 py-8">
        <div className="mx-auto max-w-5xl text-sm text-red-500">
          Failed to load job. It may not exist.
        </div>
      </main>
    );
  }

  const job = apiData.data;

  return (
    <JobForm
      initialData={{
        job_code: job.job_code,
        title: job.title,
        cities: Array.isArray(job.city) && job.city.length > 0 ? job.city : [""],
        publication_date: job.publication_date?.slice(0, 10) ?? "",
        deadline: job.deadline?.slice(0, 10) ?? "",
        age: job.age != null ? String(job.age) : "",
        qualification: job.qualification ?? "",
        skills: job.skill ?? "",
        responsibilities: job.responsibility ?? "",
        special_info: job.special_info ?? "",
        attachment_1_title: job.doc1_title ?? "",
        attachment_2_title: job.doc2_title ?? "",
        request_doc_1_title: job.req1_doc_title ?? "",
        request_doc_2_title: job.req2_doc_title ?? "",
        job_type: job.job_type as JobFormData["job_type"],
        email: job.email ?? "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
      submitError={mutation.isError ? "Failed to update job. Please try again." : null}
      heading="Edit Job"
      submitLabel="Save Changes"
      submitLoadingLabel="Saving…"
    />
  );
}