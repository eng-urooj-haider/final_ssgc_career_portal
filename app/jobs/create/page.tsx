// app/jobs/create/page.tsx
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import JobForm, { JobFormData } from "../../components/jobs/JobForm";
import { createJob } from "../../lib/jobs";

export default function AddNewJobPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      router.push("/jobs");
    },
  });

  const handleSubmit = (data: JobFormData) => {
    mutation.mutate(data);
  };

  return (
    <JobForm
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
      submitError={mutation.isError ? "Failed to create job. Please try again." : null}
      heading="Add New Job"
      submitLabel="＋ Add New Job"
      submitLoadingLabel="Adding Job…"
    />
  );
}