// app/register/page.tsx
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { GradientButton } from "../components/GradientButton";
import { getSafeRedirect, redirectQuery } from "../lib/redirect";

interface RegisterCredentials {
  email: string;
  password: string;
  confirmedPassword: string;
  firstName: string;
  lastName: string;
  gender: string;
  cnic: string;
}

interface RegisterResponse {
  message: string;
  data: { id: number; email: string; role: string };
}

type ApiErrorResponse = { message?: string; fields?: Record<string, string[]> };
type FieldName = keyof RegisterCredentials;
type FormErrors = Partial<Record<FieldName, string>>;

const registerUser = async (
  credential: RegisterCredentials,
): Promise<RegisterResponse> => {
  // confirmedPassword is a client-side-only check
  const { confirmedPassword, ...payload } = credential;
  const response = await axios.post<RegisterResponse>(
    "/api/auth/register",
    payload,
    { withCredentials: true },
  );
  return response.data;
};

// ---------------------------------------------------------------------------
// Validation (keep in sync with the server schema)
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the server: min 8, max 72, lower, upper, number, symbol
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  {
    label: "One symbol (e.g. ! @ # $)",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];
const PASSWORD_MAX = 72;

function formatCnic(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

function validateField(
  name: FieldName,
  value: string,
  all: RegisterCredentials,
): string | undefined {
  switch (name) {
    case "email":
      if (!value.trim()) return "Email is required.";
      if (!EMAIL_REGEX.test(value.trim())) return "Enter a valid email address.";
      return undefined;

    case "password": {
      if (!value) return "Password is required.";
      if (value.length > PASSWORD_MAX)
        return `Password must be at most ${PASSWORD_MAX} characters.`;
      const missing = PASSWORD_RULES.filter((r) => !r.test(value));
      if (missing.length) {
        return `Password still needs: ${missing
          .map((r) => r.label.toLowerCase())
          .join(", ")}.`;
      }
      return undefined;
    }

    case "confirmedPassword":
      if (!value) return "Please confirm your password.";
      if (value !== all.password) return "Passwords do not match.";
      return undefined;

    case "firstName":
      if (!value.trim()) return "First name is required.";
      if (value.trim().length < 2) return "First name is too short.";
      if (value.trim().length > 30) return "First name is too long.";
      return undefined;

    case "lastName":
      if (!value.trim()) return "Last name is required.";
      if (value.trim().length < 2) return "Last name is too short.";
      if (value.trim().length > 30) return "Last name is too long.";
      return undefined;

    case "gender":
      if (!value) return "Please select a gender.";
      return undefined;

    case "cnic":
      if (!value) return "CNIC is required.";
      if (!/^\d{13}$/.test(value)) return "Enter a valid 13-digit CNIC.";
      return undefined;

    default:
      return undefined;
  }
}

function validateAll(data: RegisterCredentials): FormErrors {
  const errors: FormErrors = {};
  (Object.keys(data) as FieldName[]).forEach((key) => {
    const message = validateField(key, data[key], data);
    if (message) errors[key] = message;
  });
  return errors;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Page() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formDetail, setFormDetail] = useState<RegisterCredentials>({
    email: "",
    password: "",
    confirmedPassword: "",
    firstName: "",
    lastName: "",
    gender: "",
    cnic: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );

  const registerMutation = useMutation<
    RegisterResponse,
    AxiosError<ApiErrorResponse>,
    RegisterCredentials
  >({
    mutationFn: registerUser,
    onSuccess: () => {
      window.location.assign(getSafeRedirect());
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    // Clear the previous server error as soon as the user edits anything
    if (registerMutation.isError) registerMutation.reset();

    const key = e.target.name as FieldName;
    const value =
      key === "cnic"
        ? e.target.value.replace(/\D/g, "").slice(0, 13)
        : e.target.value;

    const updated = { ...formDetail, [key]: value };
    setFormDetail(updated);

    // Validate live once the field was touched (password always, for the checklist)
    if (touched[key] || key === "password") {
      setErrors((prev) => ({
        ...prev,
        [key]: validateField(key, value, updated),
        ...(key === "password" && touched.confirmedPassword
          ? {
              confirmedPassword: validateField(
                "confirmedPassword",
                updated.confirmedPassword,
                updated,
              ),
            }
          : {}),
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const key = e.target.name as FieldName;
    const value =
      key === "cnic" ? e.target.value.replace(/\D/g, "") : e.target.value;

    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({
      ...prev,
      [key]: validateField(key, value, formDetail),
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateAll(formDetail);
    setErrors(validationErrors);
    setTouched({
      email: true,
      password: true,
      confirmedPassword: true,
      firstName: true,
      lastName: true,
      gender: true,
      cnic: true,
    });

    if (Object.keys(validationErrors).length > 0) return;
    registerMutation.mutate(formDetail);
  };

  // Server errors: per-field messages go under their input,
  // general ones (network, 409, 500) go in the banner.
  const responseData = registerMutation.isError
    ? registerMutation.error.response?.data
    : undefined;
  const serverFieldErrors: Record<string, string[]> = responseData?.fields ?? {};
  const hasServerFieldErrors = Object.keys(serverFieldErrors).length > 0;

  const bannerMessage = registerMutation.isError
    ? hasServerFieldErrors
      ? null
      : (responseData?.message ?? "Something went wrong. Please try again.")
    : null;

  // Client error first, then the server error for the same field
  const shownError = (name: FieldName): string | undefined =>
    errors[name] ?? serverFieldErrors[name]?.[0];

  const fieldClass = (hasError?: string) =>
    `w-full rounded-lg border px-4 py-3 text-sm text-black outline-none transition focus:ring-2 disabled:bg-gray-100 ${
      hasError
        ? "border-red-400 focus:border-red-400 focus:ring-red-200"
        : "border-gray-300 focus:border-[#F5A623] focus:ring-[#F5A623]/20"
    }`;

  const labelClass = "mb-2 block text-sm font-medium text-[#333333]";
  const pending = registerMutation.isPending;

  return (
    <main className="min-h-screen bg-[#FFF9F0] px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-lg items-center justify-center">
        <div className="w-full rounded-2xl bg-white p-8 shadow-lg">
          {/* Header */}
          <div className="mb-8 flex items-center justify-center text-center">
            <img
              src="/assests/logo-full.png"
              className="h-20 w-auto"
              alt="SSGC logo"
            />
          </div>

          {/* General (non-field) error */}
          {bannerMessage && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
            >
              {bannerMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formDetail.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your email address"
                className={fieldClass(shownError("email"))}
                disabled={pending}
                aria-invalid={!!shownError("email")}
              />
              {shownError("email") && (
                <p className="mt-1 text-xs text-red-600">
                  {shownError("email")}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formDetail.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your password"
                  className={`${fieldClass(shownError("password"))} pr-16`}
                  disabled={pending}
                  aria-invalid={!!shownError("password")}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#D88900] hover:text-[#F5A623]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Live checklist */}
              <ul className="mt-2 space-y-1 text-xs" aria-live="polite">
                {PASSWORD_RULES.map((r) => {
                  const ok = r.test(formDetail.password);
                  return (
                    <li
                      key={r.label}
                      className={ok ? "text-emerald-600" : "text-gray-500"}
                    >
                      {ok ? "✓" : "○"} {r.label}
                    </li>
                  );
                })}
              </ul>

              {shownError("password") && (
                <p className="mt-1 text-xs text-red-600">
                  {shownError("password")}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmedPassword" className={labelClass}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmedPassword"
                  name="confirmedPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formDetail.confirmedPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Re-enter your password"
                  className={`${fieldClass(shownError("confirmedPassword"))} pr-16`}
                  disabled={pending}
                  aria-invalid={!!shownError("confirmedPassword")}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#D88900] hover:text-[#F5A623]"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              {shownError("confirmedPassword") && (
                <p className="mt-1 text-xs text-red-600">
                  {shownError("confirmedPassword")}
                </p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formDetail.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your first name"
                className={fieldClass(shownError("firstName"))}
                disabled={pending}
                aria-invalid={!!shownError("firstName")}
              />
              {shownError("firstName") && (
                <p className="mt-1 text-xs text-red-600">
                  {shownError("firstName")}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formDetail.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your last name"
                className={fieldClass(shownError("lastName"))}
                disabled={pending}
                aria-invalid={!!shownError("lastName")}
              />
              {shownError("lastName") && (
                <p className="mt-1 text-xs text-red-600">
                  {shownError("lastName")}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className={labelClass}>
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formDetail.gender}
                onChange={handleChange}
                onBlur={handleBlur}
                className={fieldClass(shownError("gender"))}
                disabled={pending}
                aria-invalid={!!shownError("gender")}
              >
                <option value="">Select Gender</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </select>
              {shownError("gender") && (
                <p className="mt-1 text-xs text-red-600">
                  {shownError("gender")}
                </p>
              )}
            </div>

            {/* CNIC */}
            <div>
              <label htmlFor="cnic" className={labelClass}>
                CNIC
              </label>
              <input
                id="cnic"
                name="cnic"
                type="text"
                inputMode="numeric"
                value={formatCnic(formDetail.cnic)}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter CNIC"
                className={fieldClass(shownError("cnic"))}
                disabled={pending}
                aria-invalid={!!shownError("cnic")}
              />
              {shownError("cnic") && (
                <p className="mt-1 text-xs text-red-600">
                  {shownError("cnic")}
                </p>
              )}
            </div>

            <GradientButton
              type="submit"
              disabled={pending}
              className="w-full !rounded-lg !px-6 !py-3 !font-semibold"
            >
              {pending ? "Creating account..." : "Create Account"}
            </GradientButton>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push(`/login${redirectQuery()}`)}
              className="cursor-pointer font-semibold text-[#D88900] hover:text-[#F5A623] hover:underline"
            >
              Log In
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}