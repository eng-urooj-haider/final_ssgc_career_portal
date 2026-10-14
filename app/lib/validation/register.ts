// app/lib/validation/register.ts
import { z } from "zod";

const NAME = /^[A-Za-z\s.'-]+$/;

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(
      z
        .email("Enter a valid email")
        .max(191)
        .refine((e) => !/(.)\1{4,}/.test(e), "Email looks invalid") // 5+ same character in a row
        .refine(
          (e) => e.split("@")[1].split(".")[0].length <= 30,
          "Email domain is too long",
        ),
    ),

  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(72, "At most 72 characters") // bcrypt ignores bytes after 72
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/\d/, "Add a number")
    .regex(/[^A-Za-z0-9]/, "Add a symbol"),
  // Optional rule: .refine((p) => !/(.)\1/.test(p), "No repeating characters")

  firstName: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(30)
    .regex(NAME, "First Name Letters only"),

  lastName: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(30)
    .regex(NAME, "Last Name Letters only"),

  cnic: z.string().regex(/^\d{13}$/, "CNIC must be exactly 13 digits"),

  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
});
// No `role` field: Zod strips unknown keys, so it can never come from the client
