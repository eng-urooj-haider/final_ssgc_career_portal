// app/lib/redirect.ts
export function getSafeRedirect(fallback = "/user/dashboard"): string {
  if (typeof window === "undefined") return fallback;
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  return redirect && redirect.startsWith("/") && !redirect.startsWith("//")
    ? redirect
    : fallback;
}

// builds "?redirect=..." only when there is one
export function redirectQuery(): string {
  if (typeof window === "undefined") return "";
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
}