// app/components/jobs/JobPageShell.tsx
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { flame, flameGradient } from "../../lib/flameTheme";

export default function JobPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-10" style={{ background: flame.paper }}>
      <div className="mx-auto max-w-4xl">
        <Link
          href="/jobs"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: flameGradient }}
          >
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: flame.ink }}>
              {title}
            </h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div
          className="overflow-hidden rounded-xl bg-white"
          style={{
            border: "1px solid #E7E5E1",
            boxShadow: "0 1px 2px rgba(11,31,51,0.04)",
          }}
        >
          <div className="h-1" style={{ background: flameGradient }} />
          <div className="p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}