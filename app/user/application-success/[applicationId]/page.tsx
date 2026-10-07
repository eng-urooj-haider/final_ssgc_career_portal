// app/user/application-success/[applicationId]/page.tsx
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";

export default async function ApplicationSuccessPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const id = Number(applicationId);
  if (!id) notFound();

  // who is logged in
  const token = (await cookies()).get("token")?.value;
  let userId: number | null = null;
  try {
    userId = token ? verifyToken(token).userId : null;
  } catch {
    userId = null;
  }
  if (!userId) redirect("/login");

  // only the owner of the application can see this page
  const application = await prisma.jobApplication.findFirst({
    where: { id, userId },
    select: { job: { select: { title: true } } },
  });
  if (!application) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
          ✓
        </div>
        <h1 className="mb-3 text-xl font-bold text-slate-900">
          Application submitted
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          You have successfully submitted your application for the position of{" "}
          <strong>{application.job.title}</strong>. You will be contacted soon
          if you are shortlisted.
        </p>
        <Link
          href="/user/dashboard"
          className="mt-6 inline-block rounded-md bg-[#1C6FD9] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}