"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";

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
  data: {
    id: number;
    email: string;
    role: string;
  };
}

interface ApiErrorResponse {
  message: string;
}

type FormErrors = Partial<Record<keyof RegisterCredentials, string>>;
// partial ?
// keyof union
// record [key , type]

const RegisterUser = async (
  credential: RegisterCredentials,
): Promise<RegisterResponse> => {
  // Don't send confirmedPassword to the API — it's a client-side-only check
  const { confirmedPassword, ...payload } = credential;
  const response = await axios.post<RegisterResponse>(
    "/api/register",
    payload,
    { withCredentials: true },
  );
  return response.data;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// At least 8 chars, one uppercase, one lowercase, one number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validateField(
  name: keyof RegisterCredentials,
  value: string,
  all: RegisterCredentials,
): string | undefined {
  switch (name) {
    case "email":
      if (!value.trim()) return "Email is required.";
      if (!EMAIL_REGEX.test(value)) return "Enter a valid email address.";
      return undefined;

    case "password":
      if (!value) return "Password is required.";
      if (!PASSWORD_REGEX.test(value))
        return "Password must be 8+ characters with an uppercase letter, a lowercase letter, and a number.";
      return undefined;

    case "confirmedPassword":
      if (!value) return "Please confirm your password.";
      if (value !== all.password) return "Passwords do not match.";
      return undefined;

    case "firstName":
      if (!value.trim()) return "First name is required.";
      if (value.trim().length < 2) return "First name is too short.";
      if (value.trim().length > 25) return "First name is too large.";
      return undefined;

    case "lastName":
      if (!value.trim()) return "Last name is required.";
      if (value.trim().length < 2) return "Last name is too short.";
      if (value.trim().length > 25) return "Last name is too large.";

      return undefined;

    case "gender":
      if (!value) return "Please select a gender.";
      return undefined;

    case "cnic":
      if (!value) return "CNIC is required.";
      return undefined;

    default:
      return undefined;
  }
}

function validateAll(data: RegisterCredentials): FormErrors {
  const errors: FormErrors = {};
  (Object.keys(data) as (keyof RegisterCredentials)[]).forEach((key) => {
    const message = validateField(key, data[key], data);
    if (message) errors[key] = message;
  });
  return errors;
}

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
  const [touched, setTouched] = useState<
    Partial<Record<keyof RegisterCredentials, boolean>>
  >({});

  const RegisterMutation = useMutation({
    mutationFn: RegisterUser,
    onSuccess: () => {
      router.push("/user/dashboard");
    },
    onError: (err: AxiosError<ApiErrorResponse>) => {
      console.log(
        "Register error:",
        err.response?.data?.message ?? err.message,
      );
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const key = name as keyof RegisterCredentials;
    const updated = { ...formDetail, [key]: value };
    setFormDetail(updated);

    // Re-validate this field (and confirm-password if password changed) live once touched
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
    const { name, value } = e.target;
    const key = name as keyof RegisterCredentials;
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
    });

    if (Object.keys(validationErrors).length > 0) return;

    RegisterMutation.mutate(formDetail);
  };

  const apiErrorMessage = RegisterMutation.isError
    ? (RegisterMutation.error.response?.data?.message ??
      "Something went wrong. Please try again.")
    : null;

  const fieldClass = (hasError?: string) =>
    `w-full rounded-lg border px-4 py-3 text-sm text-black outline-none transition focus:ring-2 disabled:bg-gray-100 ${
      hasError
        ? "border-red-400 focus:border-red-400 focus:ring-red-200"
        : "border-gray-300 focus:border-[#F5A623] focus:ring-[#F5A623]/20"
    }`;

  return (
    <main className="min-h-screen bg-[#FFF9F0] px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-lg items-center justify-center">
        <div className="w-full rounded-2xl bg-white p-8 shadow-lg">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#F5A623] text-lg font-bold text-white shadow-md">
              SSGC
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Create your SSGC Careers Portal account
            </p>
          </div>

          {/* Error Message */}
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
                value={formDetail.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your email address"
                className={fieldClass(errors.email)}
                disabled={RegisterMutation.isPending}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#333333]"
              >
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
                  className={`${fieldClass(errors.password)} pr-16`}
                  disabled={RegisterMutation.isPending}
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

            {/* Confirmed Password */}
            <div>
              <label
                htmlFor="confirmedPassword"
                className="mb-2 block text-sm font-medium text-[#333333]"
              >
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
                  className={`${fieldClass(errors.confirmedPassword)} pr-16`}
                  disabled={RegisterMutation.isPending}
                  aria-invalid={!!errors.confirmedPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#D88900] hover:text-[#F5A623]"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.confirmedPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.confirmedPassword}
                </p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label
                htmlFor="firstName"
                className="mb-2 block text-sm font-medium text-[#333333]"
              >
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
                className={fieldClass(errors.firstName)}
                disabled={RegisterMutation.isPending}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label
                htmlFor="lastName"
                className="mb-2 block text-sm font-medium text-[#333333]"
              >
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
                className={fieldClass(errors.lastName)}
                disabled={RegisterMutation.isPending}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label
                htmlFor="gender"
                className="mb-2 block text-sm font-medium text-[#333333]"
              >
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formDetail.gender}
                onChange={handleChange}
                onBlur={handleBlur}
                className={fieldClass(errors.gender)}
                disabled={RegisterMutation.isPending}
                aria-invalid={!!errors.gender}
              >
                <option value="">Select Gender</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-xs text-red-600">{errors.gender}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="mb-2 block text-sm font-medium text-[#333333]"
              >
                CNIC
              </label>
              <input
                id="cnic"
                name="cnic"
                type="text"
                value={formDetail.cnic}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter cnic"
                className={fieldClass(errors.cnic)}
                disabled={RegisterMutation.isPending}
                aria-invalid={!!errors.cnic}
              />
              {errors.cnic && (
                <p className="mt-1 text-xs text-red-600">{errors.cnic}</p>
              )}
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={RegisterMutation.isPending}
              className="w-full rounded-lg bg-[#F5A623] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#D88900] focus:outline-none focus:ring-4 focus:ring-[#F5A623]/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {RegisterMutation.isPending
                ? "Creating account..."
                : "Create Account"}
            </button>
          </form>

          {/* Login */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-semibold text-[#D88900] hover:text-[#F5A623] hover:underline"
            >
              Log In
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
