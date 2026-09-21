// app/jobs/[id]/edit/page.tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import JobForm, { JobFormData } from "../../../components/jobs/JobForm";
import JobPageShell from "../../../components/jobs/JobPageShell";
import { updateJob, getJob } from "../../../lib/jobs";

export default function EditJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const id = params.id as string;

  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
    staleTime: 0, // always load fresh values when opening the edit form
  });

  const mutation = useMutation({
    mutationFn: (data: JobFormData) => updateJob(id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["job", id] }),
      ]);
      router.push("/jobs");
    },
  });

  if (isLoading) {
    return (
      <JobPageShell title="Edit Job" subtitle="Loading job details…">
        <p className="text-sm text-slate-500">Loading job…</p>
      </JobPageShell>
    );
  }

  // Adjust if getJob returns the job directly instead of { data }
  const job = apiData?.data ?? apiData;

  if (isError || !job) {
    return (
      <JobPageShell title="Edit Job" subtitle="Something went wrong.">
        <p className="text-sm font-medium text-red-500">
          Failed to load job. It may not exist.
        </p>
      </JobPageShell>
    );
  }

  return (
    <JobPageShell
      title="Edit Job"
      subtitle="Update the details below and save your changes."
    >
      <JobForm
        key={job.id} // remount if a different job is loaded
        initialData={{
          job_code: job.jobCode ?? "",
          title: job.title ?? "",
          cities:
            Array.isArray(job.cities) && job.cities.length > 0
              ? job.cities
              : [""],
          publication_date: job.publicationDate?.slice(0, 10) ?? "",
          deadline: job.deadline?.slice(0, 10) ?? "",
          age: job.maxAge != null ? String(job.maxAge) : "",
          qualification: job.qualification ?? "",
          skills: job.skill ?? "",
          responsibilities: job.responsibility ?? "",
          special_info: job.specialInfo ?? "",
          attachment_1_title: job.doc1Title ?? "",
          attachment_2_title: job.doc2Title ?? "",
          request_doc_1_title: job.req1DocTitle ?? "",
          request_doc_2_title: job.req2DocTitle ?? "",
          job_type: job.jobType as JobFormData["job_type"],
          email: job.email ?? "",
        }}
        existingDocs={{
          attachment_1_doc: job.doc1Attachment ?? null,
          attachment_2_doc: job.doc2Attachment ?? null,
        }}
        onSubmit={(data) => mutation.mutate(data)}
        isSubmitting={mutation.isPending}
        submitError={
          mutation.isError ? "Failed to update job. Please try again." : null
        }
        heading="Job details"
        submitLabel="Save Changes"
        submitLoadingLabel="Saving…"
      />
    </JobPageShell>
  );
}