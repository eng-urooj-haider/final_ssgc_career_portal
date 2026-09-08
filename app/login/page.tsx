"use client";

import { useState } from "react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface LoginFormData {
  email: string;
  password: string;
}
interface LoginResponse {
  message: string;
  data: {
    id: number;
    email: string;
    role: string;
  };
}
interface ApiErrorResponse {
  message: string;
}

type FormErrors = Partial<Record<keyof LoginFormData, string>>;
type Touched = Partial<Record<keyof LoginFormData, boolean>>;

const LoginUser = async (credential: LoginFormData): Promise<LoginResponse> => {
  const response = await axios.post<LoginResponse>("/api/login", credential, {
    withCredentials: true,
  });
  return response.data;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(
  name: keyof LoginFormData,
  value: string,
): string | undefined {
  switch (name) {
    case "email":
      if (!value.trim()) return "Email is required.";
      if (!EMAIL_REGEX.test(value)) return "Enter a valid email address.";
      return undefined;

    case "password":
      if (!value) return "Password is required.";
      return undefined;

    default:
      return undefined;
  }
}

function validateAll(data: LoginFormData): FormErrors {
  const errors: FormErrors = {};
  (Object.keys(data) as (keyof LoginFormData)[]).forEach((key) => {
    const message = validateField(key, data[key]);
    if (message) errors[key] = message;
  });
  return errors;
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Touched>({});

  const LoginMutation = useMutation({
    mutationFn: LoginUser,
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (err: AxiosError<ApiErrorResponse>) => {
      console.log("Login error:", err.response?.data?.message ?? err.message);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof LoginFormData;
    const updated = { ...formData, [key]: value };
    setFormData(updated);

    // Live re-validate only once this field has already been touched
    if (touched[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: validateField(key, value),
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof LoginFormData;

    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({
      ...prev,
      [key]: validateField(key, value),
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateAll(formData);
    setErrors(validationErrors);
    setTouched({ email: true, password: true });

    const hasErrors = Object.values(validationErrors).some(Boolean);
    if (hasErrors) return;

    LoginMutation.mutate(formData);
  };

  const apiErrorMessage = LoginMutation.isError
    ? (LoginMutation.error.response?.data?.message ??
      "Invalid email or password.")
    : null;

  const fieldClass = (hasError?: string) =>
    `w-full rounded-lg border px-4 py-3 text-sm text-black outline-none transition focus:ring-2 disabled:bg-gray-100 ${
      hasError
        ? "border-red-400 focus:border-red-400 focus:ring-red-200"
        : "border-gray-300 focus:border-[#F5A623] focus:ring-[#F5A623]/20"
    }`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF9F0] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#F5A623] text-lg font-bold text-white shadow-md">
              SSGC
            </div>

            <h1 className="text-2xl font-bold text-[#333333]">Welcome Back</h1>

            <p className="mt-2 text-sm text-gray-500">
              Login to your SSGC Careers Portal account
            </p>
          </div>

          {/* API Error Message */}
          {apiErrorMessage && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {apiErrorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#333333]"
              >
                Email Address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your email address"
                disabled={LoginMutation.isPending}
                className={fieldClass(errors.email)}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[#333333]"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-[#D88900] hover:text-[#F5A623] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your password"
                  disabled={LoginMutation.isPending}
                  className={`${fieldClass(errors.password)} pr-16`}
                  aria-invalid={!!errors.password}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#D88900] hover:text-[#F5A623]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={LoginMutation.isPending}
              className="w-full rounded-lg bg-[#F5A623] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#D88900] focus:outline-none focus:ring-4 focus:ring-[#F5A623]/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {LoginMutation.isPending ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Register */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#D88900] hover:text-[#F5A623] hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}