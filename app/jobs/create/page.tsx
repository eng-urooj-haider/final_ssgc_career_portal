// app/jobs/create/page.tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import JobForm, { JobFormData } from "../../components/jobs/JobForm";
import JobPageShell from "../../components/jobs/JobPageShell";
import { createJob } from "../../lib/jobs";

export default function AddNewJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      router.push("/jobs");
    },
  });

  return (
    <JobPageShell
      title="Add New Job"
      subtitle="Fill in the details below to publish a new opening."
    >
      <JobForm
        onSubmit={(data: JobFormData) => mutation.mutate(data)}
        isSubmitting={mutation.isPending}
        submitError={
          mutation.isError ? "Failed to create job. Please try again." : null
        }
        heading="Job details"
        submitLabel="Add New Job"
        submitLoadingLabel="Adding Job…"
      />
    </JobPageShell>
  );
}