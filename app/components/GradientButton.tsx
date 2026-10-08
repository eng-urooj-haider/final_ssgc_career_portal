// app/components/GradientButton.tsx
import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";

const base =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed";
// app/lib/theme.ts
const flame = {
  core: "#1C6FD9",
  mid: "#2E8FD6",
  edge: "#F0862E",
  tip: "#FBB03B",
  ink: "#0B1F33",
  paper: "#FAFAF8",
};

const flameGradient = `linear-gradient(90deg, ${flame.core} 0%, ${flame.mid} 45%, ${flame.edge} 78%, ${flame.tip} 100%)`;
// A normal button
export function GradientButton({
  className = "",
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`${base} ${className}`}
      style={{ background: flameGradient, ...style }}
    />
  );
}

// The same look as a link
export function GradientLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${base} ${className}`}
      style={{ background: flameGradient }}
    >
      {children}
    </Link>
  );
}
