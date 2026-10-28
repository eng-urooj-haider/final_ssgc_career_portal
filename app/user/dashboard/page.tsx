"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  Suspense,
  type ReactNode,
  type ChangeEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  User,
  Briefcase,
  GraduationCap,
  Award,
  Users,
  Camera,
  Upload,
  Plus,
  Trash2,
  type LucideIcon,
  Wrench,
  Trophy,
  FolderGit2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GetCities,
  GetCountries,
  getInstitutes,
  getQualificationGroups,
  getQualifications,
} from "@/app/lib/dashboard";
import useUserProfile from "@/app/lib/fetchUserProfile";
import { findId } from "@/app/action/job";
import { ProgressBar } from "@/app/components/ProgressBar";
import LogoutButton from "@/app/components/LogoutButton";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { flame } from "../../lib/flameTheme";
import api from "../../lib/api";
import Link from "next/link";

type TabId =
  | "photo"
  | "personal"
  | "experience"
  | "education"
  | "certificates"
  | "memberships"
  | "skills"
  | "achievements"
  | "projects"
  | "references";

type EntryKey =
  | "experience"
  | "education"
  | "certificates"
  | "memberships"
  | "achievements"
  | "projects"
  | "references";

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const flameGradient = `linear-gradient(90deg, ${flame.core} 0%, ${flame.mid} 45%, ${flame.edge} 78%, ${flame.tip} 100%)`;

const TABS: TabDef[] = [
  { id: "photo", label: "Profile photo", icon: Camera },
  { id: "personal", label: "Personal details", icon: User },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "memberships", label: "Memberships", icon: Users },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "projects", label: "Projects & Research", icon: FolderGit2 },
  { id: "references", label: "References", icon: BookOpen },
];

const SECTION_LABELS: Record<string, string> = {
  photo: "Profile photo",
  personal: "Personal information",
  experience: "Work experience",
  education: "Education",
  certificates: "Certificates",
  memberships: "Memberships",
  skills: "Technical & Professional skills",
  achievements: "Achievements & Awards",
  projects: "Projects & Research",
  references: "References",
};
const ENTRY_LABELS: Record<EntryKey, string> = {
  experience: "experience",
  education: "education",
  certificates: "certificate",
  memberships: "membership",
  achievements: "achievement",
  projects: "project",
  references: "reference",
};

// ---------------------------------------------------------------------------
// Temporary ids
// ---------------------------------------------------------------------------

let tempIdCounter = 0;
const nextTempId = () => --tempIdCounter;
const isSavedId = (id: number) => id > 0;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const NAME_REGEX = /^[A-Za-z\s.'-]+$/;
const PREFIX_REGEX = /^0\d{2,3}$/;
const MOBILE_REGEX = /^\d{7}$/;
const LANDLINE_REGEX = /^\d{6,8}$/;
const YEAR_REGEX = /^(19|20)\d{2}$/;

function calculateAge(dobString: string): number {
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// ---------------------------------------------------------------------------
// Profile -> form mapping
// ---------------------------------------------------------------------------

const toMonthInput = (date: unknown): string => {
  if (!date) return "";
  const d = new Date(date as string);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const mapPersonal = (p: any) => ({
  father_name: p.fatherName ?? "",
  marital_status: p.maritalStatus ?? "",
  children: p.childrenCount != null ? String(p.childrenCount) : "",
  date_of_birth: p.dateOfBirth ? String(p.dateOfBirth).split("T")[0] : "",
  birth_country: p.birthCountryId != null ? String(p.birthCountryId) : "",
  birth_city:
    p.birthCityId != null
      ? String(p.birthCityId)
      : p.birthCityOther
        ? "other"
        : "",
  birth_city_other: p.birthCityOther ?? "",
  passport_no: p.passportNo ?? "",
  domicile: p.domicile ?? "",
  mobile_prefix: p.mobilePrefix ?? "",
  mobile_number: p.mobileNumber ?? "",
  home_prefix: p.homePrefix ?? "",
  home_number: p.homeNumber ?? "",
  office_prefix: p.officePrefix ?? "",
  office_number: p.officeNumber ?? "",
  current_address: p.currentAddress ?? "",
  permanent_address: p.permanentAddress ?? "",
  already_worked_ssgc: p.alreadyWorkedSsgc ? "Yes" : "No",
  ssgc_employee_name: p.ssgcEmployeeName ?? "",
  ssgc_employee_number: p.ssgcEmployeeNumber ?? "",
  is_pakistani: p.isPakistani != null ? (p.isPakistani ? "1" : "0") : "1",
  professional_summary: p.professionalSummary ?? "",
});

const mapExperience = (list: any[]): ExperienceEntry[] =>
  list.map((e, i) => ({
    id: e.id ?? i + 1,
    job_title: e.jobTitle ?? "",
    company: e.company ?? "",
    country: e.country != null ? String(e.country) : "",
    city: e.city != null ? String(e.city) : e.cityOther ? "other" : "",
    start_date: toMonthInput(e.startDate),
    end_date: toMonthInput(e.endDate),
    salary: e.salary != null ? String(e.salary) : "",
    responsibilities: e.responsibility ?? "",
    reason: e.reasonForLeave ?? "",
    city_other: e.cityOther ?? "",
  }));

const mapEducation = (list: any[]): EducationEntry[] =>
  list.map((e, i) => ({
    id: e.id ?? i + 1,
    qualification_group_id:
      e.qualificationGroupId != null
        ? String(e.qualificationGroupId)
        : e.qualificationGroupOther
          ? "other"
          : "",
    qualification_group_other: e.qualificationGroupOther ?? "",
    qualification_id:
      e.qualificationId != null
        ? String(e.qualificationId)
        : e.qualificationOther
          ? "other"
          : "",
    qualification_other: e.qualificationOther ?? "",
    institute_id:
      e.institutionId != null
        ? String(e.institutionId)
        : e.instituteOther
          ? "other"
          : "",
    institute_other: e.instituteOther ?? "",
    major_subject: e.majorSubject ?? "",
    country: e.countryId != null ? String(e.countryId) : "",
    city: e.cityId != null ? String(e.cityId) : e.cityOther ? "other" : "",
    city_other: e.cityOther ?? "",
    passing_year: String(e.passingYear ?? ""),
    obtained_marks_gpa: String(e.obtainedMarks ?? ""),
    total_marks_gpa: String(e.totalMarks ?? ""),
    division_grade: e.divisionGrade ?? "",
  }));

const mapCertificates = (list: any[]): CertificateEntry[] =>
  list.map((c, i) => ({
    id: c.id ?? i + 1,
    name: c.certificateName || "",
    organisation: c.organisation || "",
    issue_date: c.issueDate ? String(c.issueDate).split("T")[0] : "",
    document: c.document || null,
    duration_value: c.durationValue != null ? String(c.durationValue) : "",
    duration_unit: c.durationUnit ?? "",
  }));

const mapMemberships = (list: any[]): MembershipEntry[] =>
  list.map((m, i) => ({
    id: m.id ?? i + 1,
    membership_type: m.membershipType ?? "",
    organisation: m.organisation ?? "",
    member_since: m.memberSince ?? "",
  }));

const mapAchievements = (list: any[]): AchievementEntry[] =>
  list.map((a, i) => ({
    id: a.id ?? i + 1,
    title: a.title || "",
    issuer: a.issuer || "",
    date_received: a.dateReceived ? String(a.dateReceived).split("T")[0] : "",
    description: a.description || "",
  }));

const mapProjects = (list: any[]): ProjectEntry[] =>
  list.map((p, i) => ({
    id: p.id ?? i + 1,
    project_title: p.projectTitle || "",
    role: p.role || "",
    project_url: p.projectUrl || "",
    description: p.description || "",
  }));

const mapReferences = (list: any[]): ReferenceEntry[] =>
  list.map((r, i) => ({
    id: r.id ?? i + 1,
    name: r.name || "",
    designation: r.designation || "",
    organisation: r.organisation || "",
    email: r.email || "",
    phone: r.phone || "",
  }));

export interface SkillsFormData {
  core_skills: string[];
  software_tools: string[];
  languages_known: {
    language: string;
    proficiency: "BASIC" | "INTERMEDIATE" | "PROFICIENT" | "NATIVE";
  }[];
}

const mapSkills = (p: any): SkillsFormData => {
  // API returns skills as an array with one row per profile
  const s = Array.isArray(p?.skills) ? p.skills[0] : p?.skills;

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const rawLanguages = s?.languagesKnown ?? s?.languages_known;
  const languages: SkillsFormData["languages_known"] = Array.isArray(
    rawLanguages,
  )
    ? rawLanguages
        .map((l: any) =>
          typeof l === "string"
            ? { language: l, proficiency: "INTERMEDIATE" as const }
            : {
                language: l?.language ?? "",
                proficiency: l?.proficiency ?? ("INTERMEDIATE" as const),
              },
        )
        .filter((l) => l.language !== "")
    : [];

  return {
    core_skills: toStringArray(s?.coreSkills ?? s?.core_skills),
    software_tools: toStringArray(s?.softwareTools ?? s?.software_tools),
    // keep one blank row so the form always has a language input
    languages_known: languages.length ? languages : [],
    // : [{ language: "", proficiency: "INTERMEDIATE" }],
  };
};
// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

interface SectionHeadingProps {
  title: string;
  description?: string;
}

function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="mb-6 pb-4 border-b border-slate-200">
      <h2 className="text-lg font-bold" style={{ color: flame.ink }}>
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
  as?: "label" | "div";
}

function Field({
  label,
  children,
  required,
  error,
  className,
  as: Tag = "label",
}: FieldProps) {
  return (
    <Tag className={`block ${className || ""}`}>
      {label && (
        <span className="block text-sm font-semibold text-slate-800 mb-1.5">
          {label}
          {required && (
            <span className="ml-0.5" style={{ color: flame.edge }}>
              *
            </span>
          )}
        </span>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </Tag>
  );
}

const controlBase =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:border-[#1C6FD9] focus:ring-2 focus:ring-[#1C6FD9]/20 disabled:bg-slate-50 disabled:text-slate-500";

const FlameInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input ref={ref} className={`${controlBase} ${className}`} {...props} />
));
FlameInput.displayName = "FlameInput";

const FlameTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea ref={ref} className={`${controlBase} ${className}`} {...props} />
));
FlameTextarea.displayName = "FlameTextarea";

const FlameSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className = "", ...props }, ref) => (
  <select ref={ref} className={`${controlBase} ${className}`} {...props} />
));
FlameSelect.displayName = "FlameSelect";

interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

interface FormSelectFieldProps
  extends
    Omit<FieldProps, "children" | "as">,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  placeholder?: string;
  isLoading?: boolean;
  allowOther?: boolean;
}

function FormSelectField({
  label,
  required,
  error,
  className,
  options,
  placeholder,
  isLoading,
  allowOther = false,
  ...selectProps
}: FormSelectFieldProps) {
  return (
    <Field
      label={label}
      required={required}
      error={error}
      className={className}
    >
      <FlameSelect
        {...selectProps}
        disabled={isLoading || selectProps.disabled}
      >
        {placeholder && (
          <option value="">{isLoading ? "Loading..." : placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
        {allowOther && <option value="other">Other</option>}
      </FlameSelect>
    </Field>
  );
}

interface LocationSelectsProps {
  countryValue: string;
  cityValue: string;
  onCountryChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onCityChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  countryError?: string;
  cityError?: string;
  countryName?: string;
  cityName?: string;
  required?: boolean;
}

function LocationSelects({
  countryValue,
  cityValue,
  onCountryChange,
  onCityChange,
  countryError,
  cityError,
  countryName = "country",
  cityName = "city",
  required = false,
}: LocationSelectsProps) {
  const {
    data: countries = [],
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useQuery({
    queryKey: ["countries"],
    queryFn: GetCountries,
    staleTime: 1000 * 60 * 60,
  });

  const {
    data: cities = [],
    isLoading: isLoadingCities,
    error: citiesError,
  } = useQuery({
    queryKey: ["cities"],
    queryFn: GetCities,
    staleTime: 1000 * 60 * 60,
  });

  const countryOptions = useMemo(
    () =>
      countries.map((c: { id: number; countryName: string }) => ({
        label: c.countryName,
        value: c.id,
      })),
    [countries],
  );

  const cityOptions = useMemo(
    () =>
      cities.map((c: { id: number; cityName: string }) => ({
        label: c.cityName,
        value: c.id,
      })),
    [cities],
  );

  return (
    <>
      <FormSelectField
        label="Country"
        name={countryName}
        required={required}
        error={
          countryError ||
          (countriesError ? "Failed to load countries" : undefined)
        }
        value={countryValue || ""}
        onChange={onCountryChange}
        isLoading={isLoadingCountries}
        placeholder="Select country"
        options={countryOptions}
      />
      <FormSelectField
        label="City"
        name={cityName}
        required={required}
        error={cityError || (citiesError ? "Failed to load cities" : undefined)}
        value={cityValue || ""}
        onChange={onCityChange}
        isLoading={isLoadingCities}
        placeholder="Select city"
        options={cityOptions}
        allowOther
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Photo tab
// ---------------------------------------------------------------------------

interface PhotoTabProps {
  image: string;
  onChange: (file: File | null) => void;
  error?: string;
  canAdd?: boolean;
}

function PhotoTab({ image, onChange, error, canAdd = true }: PhotoTabProps) {
  const [preview, setPreview] = useState<string | null>(image || null);
  const [hasLocalSelection, setHasLocalSelection] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (file) {
      setHasLocalSelection(true);
      setPreview(URL.createObjectURL(file));
      onChange(file);
    }
  }

  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();

  useEffect(() => {
    if (profile?.userPic && !hasLocalSelection) {
      setPreview(profile.userPic);
    }
  }, [profile, hasLocalSelection]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  return (
    <div>
      <SectionHeading
        title="Profile photo"
        description="Upload a clear, recent photo"
      />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-6">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center overflow-hidden shrink-0"
            style={{
              background: preview ? "transparent" : "#F1F5F9",
              border: `2px solid ${preview ? flame.core : "#E2E8F0"}`,
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-slate-300" />
            )}
          </div>
          <div>
            {canAdd && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ background: flameGradient }}
                >
                  <Upload className="w-4 h-4" />
                  Upload photo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                  aria-label="Upload profile photo"
                />
                <p className="mt-2 text-xs text-slate-500">
                  JPG or PNG, at least 400×400px.
                </p>
              </>
            )}

            {isLoadingProfile && !hasLocalSelection && (
              <p className="mt-1 text-xs text-slate-400">
                Loading current photo…
              </p>
            )}
          </div>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personal tab
// ---------------------------------------------------------------------------

interface PersonalFormData {
  father_name: string;
  marital_status: string;
  children: string;
  date_of_birth: string;
  birth_country: string;
  birth_city: string;
  birth_city_other: string;
  passport_no: string;
  domicile: string;
  mobile_prefix: string;
  mobile_number: string;
  home_prefix: string;
  home_number: string;
  office_prefix: string;
  office_number: string;
  current_address: string;
  permanent_address: string;
  already_worked_ssgc: string;
  ssgc_employee_name: string;
  ssgc_employee_number: string;
  is_pakistani: string;
  professional_summary: string;
}

interface PersonalTabProps {
  formData: PersonalFormData;
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  errors: Record<string, string>;
}

function useFindingId() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const { data: job, isLoading } = useQuery({
    queryKey: ["loading_id", jobId],
    queryFn: () => findId(jobId as string),
    enabled: Boolean(jobId),
  });

  const exists = job != null;
  return { jobId, job, exists, isLoading };
}

function PersonalTab({ formData, onChange, errors }: PersonalTabProps) {
  return (
    <div>
      <SectionHeading
        title="Personal details"
        description="This information is used across your applications."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Field
          label="Father / Husband's Name"
          required
          error={errors.father_name}
        >
          <FlameInput
            name="father_name"
            value={formData.father_name || ""}
            onChange={onChange}
            placeholder="Father's full name"
            maxLength={60}
          />
        </Field>

        <Field label="Marital Status" required error={errors.marital_status}>
          <FlameSelect
            name="marital_status"
            value={formData.marital_status || ""}
            onChange={onChange}
          >
            <option value="">Select status</option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
          </FlameSelect>
        </Field>

        <Field label="No. of Children" required error={errors.children}>
          <FlameSelect
            name="children"
            value={formData.children || ""}
            onChange={onChange}
          >
            <option value="">Select children</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5+">5+</option>
          </FlameSelect>
        </Field>

        <Field label="Date of Birth" required error={errors.date_of_birth}>
          <FlameInput
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth || ""}
            onChange={onChange}
          />
        </Field>

        <LocationSelects
          required
          countryName="birth_country"
          cityName="birth_city"
          countryValue={formData.birth_country}
          cityValue={formData.birth_city}
          onCountryChange={onChange}
          onCityChange={onChange}
          countryError={errors.birth_country}
          cityError={errors.birth_city}
        />

        {formData.birth_city === "other" && (
          <Field
            label="Birth City (Other)"
            required
            error={errors.birth_city_other}
          >
            <FlameInput
              name="birth_city_other"
              value={formData.birth_city_other || ""}
              onChange={onChange}
              placeholder="Enter your city"
            />
          </Field>
        )}

        <Field label="Is Pakistani" required error={errors.is_pakistani}>
          <FlameSelect
            name="is_pakistani"
            value={formData.is_pakistani || ""}
            onChange={onChange}
          >
            <option value="">Select nationality</option>
            <option value="0">No</option>
            <option value="1">Yes</option>
          </FlameSelect>
        </Field>

        <Field label="Passport Number" error={errors.passport_no}>
          <FlameInput
            name="passport_no"
            value={formData.passport_no || ""}
            onChange={onChange}
            placeholder="AB1234567"
            maxLength={15}
          />
        </Field>

        <Field label="Province of Domicile" required error={errors.domicile}>
          <FlameInput
            name="domicile"
            value={formData.domicile || ""}
            onChange={onChange}
            placeholder="e.g. Sindh / Karachi"
            maxLength={20}
          />
        </Field>

        {/* Mobile Number Group */}
        <div className="flex gap-2">
          <Field
            label="Code"
            className="w-1/3"
            required
            error={errors.mobile_prefix}
          >
            <FlameInput
              name="mobile_prefix"
              value={formData.mobile_prefix || ""}
              onChange={onChange}
              maxLength={4}
              placeholder="03xx"
              type="tel"
              inputMode="numeric"
            />
          </Field>
          <Field
            label="Mobile Number"
            className="w-2/3"
            required
            error={errors.mobile_number}
          >
            <FlameInput
              name="mobile_number"
              value={formData.mobile_number || ""}
              onChange={onChange}
              placeholder="xxxxxxx"
              maxLength={7}
              type="tel"
              inputMode="numeric"
            />
          </Field>
        </div>

        {/* Home Number Group (optional) */}
        <div className="flex gap-2">
          <Field label="Code" className="w-1/3" error={errors.home_prefix}>
            <FlameInput
              name="home_prefix"
              value={formData.home_prefix || ""}
              onChange={onChange}
              maxLength={4}
              placeholder="021"
              type="tel"
              inputMode="numeric"
            />
          </Field>
          <Field
            label="Home Phone"
            className="w-2/3"
            error={errors.home_number}
          >
            <FlameInput
              name="home_number"
              value={formData.home_number || ""}
              onChange={onChange}
              placeholder="xxxxxxx"
              maxLength={8}
              type="tel"
              inputMode="numeric"
            />
          </Field>
        </div>

        {/* Office Number Group (optional) */}
        <div className="flex gap-2">
          <Field label="Code" className="w-1/3" error={errors.office_prefix}>
            <FlameInput
              name="office_prefix"
              value={formData.office_prefix || ""}
              onChange={onChange}
              placeholder="021"
              maxLength={4}
              type="tel"
              inputMode="numeric"
            />
          </Field>
          <Field
            label="Office Phone"
            className="w-2/3"
            error={errors.office_number}
          >
            <FlameInput
              name="office_number"
              value={formData.office_number || ""}
              onChange={onChange}
              placeholder="xxxxxxx"
              maxLength={8}
              type="tel"
              inputMode="numeric"
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Current Address" required error={errors.current_address}>
          <FlameTextarea
            rows={3}
            name="current_address"
            value={formData.current_address || ""}
            onChange={onChange}
            placeholder="Street, area, city"
            maxLength={150}
          />
        </Field>
        <Field
          label="Permanent Address"
          required
          error={errors.permanent_address}
        >
          <FlameTextarea
            rows={3}
            name="permanent_address"
            value={formData.permanent_address || ""}
            onChange={onChange}
            placeholder="Street, area, city"
            maxLength={150}
          />
        </Field>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Field
          label="Already worked at SSGC?"
          required
          error={errors.already_worked_ssgc}
        >
          <FlameSelect
            name="already_worked_ssgc"
            value={formData.already_worked_ssgc || ""}
            onChange={onChange}
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </FlameSelect>
        </Field>

        {formData.already_worked_ssgc === "Yes" && (
          <>
            <Field
              label="SSGC Employee Name"
              required
              error={errors.ssgc_employee_name}
            >
              <FlameInput
                name="ssgc_employee_name"
                value={formData.ssgc_employee_name || ""}
                onChange={onChange}
                placeholder="Employee name"
                maxLength={60}
              />
            </Field>
            <Field
              label="SSGC Employee Number"
              required
              error={errors.ssgc_employee_number}
            >
              <FlameInput
                name="ssgc_employee_number"
                value={formData.ssgc_employee_number || ""}
                onChange={onChange}
                placeholder="Employee number"
                maxLength={10}
                type="tel"
                inputMode="numeric"
              />
            </Field>
          </>
        )}
      </div>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Professional Summary"
          required
          error={errors.professional_summary}
        >
          <FlameTextarea
            rows={3}
            maxLength={150}
            name="professional_summary"
            value={formData.professional_summary || ""}
            onChange={onChange}
            placeholder="Briefly describe your professional Summary"
          />
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Repeatable-entry shared bits
// ---------------------------------------------------------------------------

interface RepeatableCardProps {
  children: ReactNode;
  onRemove: () => void;
  removeDisabled?: boolean;
}

function RepeatableCard({
  children,
  onRemove,
  removeDisabled,
}: RepeatableCardProps) {
  return (
    <div
      className="relative rounded-lg p-4 sm:p-5"
      style={{ background: "#FBFBFA", border: "1px solid #E7E5E1" }}
    >
      {!removeDisabled && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-4 right-4 text-slate-400 transition-colors hover:text-red-500"
          aria-label="Remove entry"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
}

interface AddButtonProps {
  onClick: () => void;
  label: string;
}

function AddButton({ onClick, label }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
      style={{ color: flame.core }}
    >
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Experience tab
// ---------------------------------------------------------------------------

interface ExperienceEntry {
  id: number;
  job_title: string;
  company: string;
  country: string;
  city: string;
  start_date: string;
  end_date: string;
  salary: string;
  responsibilities: string;
  reason: string;
  city_other: string;
}

const emptyExperience = (id: number): ExperienceEntry => ({
  id,
  job_title: "",
  company: "",
  country: "",
  city: "",
  start_date: "",
  end_date: "",
  salary: "",
  responsibilities: "",
  reason: "",
  city_other: "",
});

interface ExperienceTabProps {
  entries: ExperienceEntry[];
  onFieldChange: (
    id: number,
    field: keyof ExperienceEntry,
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  errors: Record<string, string>;
  canAdd?: boolean;
}

function ExperienceTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
  canAdd = true,
}: ExperienceTabProps) {
  return (
    <div>
      <SectionHeading
        title="Experience"
        description="List your work history, most recent first."
      />
      <div className="space-y-4">
        {entries.map((entry) => (
          <RepeatableCard
            key={entry.id}
            onRemove={() => onRemove(entry.id)}
            removeDisabled={entries.length === 1 || !canAdd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field
                label="Job title"
                required
                error={errors[`${entry.id}_job_title`]}
              >
                <FlameInput
                  value={entry.job_title || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "job_title", e.target.value)
                  }
                  placeholder="Software Engineer"
                />
              </Field>

              <Field
                label="Company"
                required
                error={errors[`${entry.id}_company`]}
              >
                <FlameInput
                  value={entry.company || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "company", e.target.value)
                  }
                  placeholder="SSGC"
                />
              </Field>

              <LocationSelects
                required
                countryName={`experience[${entry.id}].country`}
                cityName={`experience[${entry.id}].city`}
                countryValue={entry.country || ""}
                cityValue={entry.city || ""}
                onCountryChange={(e) =>
                  onFieldChange(entry.id, "country", e.target.value)
                }
                onCityChange={(e) =>
                  onFieldChange(entry.id, "city", e.target.value)
                }
                countryError={errors[`${entry.id}_country`]}
                cityError={errors[`${entry.id}_city`]}
              />

              {entry.city === "other" && (
                <Field
                  label="City (Other)"
                  required
                  error={errors[`${entry.id}_city_other`]}
                >
                  <FlameInput
                    value={entry.city_other || ""}
                    onChange={(e) =>
                      onFieldChange(entry.id, "city_other", e.target.value)
                    }
                    placeholder="Enter your city"
                  />
                </Field>
              )}

              <Field
                label="Start date"
                required
                error={errors[`${entry.id}_start_date`]}
              >
                <FlameInput
                  type="month"
                  value={entry.start_date || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "start_date", e.target.value)
                  }
                />
              </Field>

              <Field
                label="End date"
                required
                error={errors[`${entry.id}_end_date`]}
              >
                <FlameInput
                  type="month"
                  value={entry.end_date || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "end_date", e.target.value)
                  }
                />
              </Field>

              <Field
                label="Salary"
                required
                error={errors[`${entry.id}_salary`]}
              >
                <FlameInput
                  type="number"
                  min={0}
                  value={entry.salary || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "salary", e.target.value)
                  }
                  placeholder="80000"
                />
              </Field>

              <Field
                label="Responsibilities"
                required
                error={errors[`${entry.id}_responsibilities`]}
              >
                <FlameTextarea
                  rows={3}
                  value={entry.responsibilities || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "responsibilities", e.target.value)
                  }
                  placeholder="Briefly describe your role and achievements"
                />
              </Field>

              <Field
                label="Reason for leaving"
                required
                error={errors[`${entry.id}_reason`]}
              >
                <FlameTextarea
                  rows={3}
                  value={entry.reason || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "reason", e.target.value)
                  }
                  placeholder="Reason for leaving"
                />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      {canAdd && (
        <div className="mt-4">
          <AddButton label="Add another experience" onClick={onAdd} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Education tab
// ---------------------------------------------------------------------------

export interface EducationEntry {
  id: number;
  qualification_group_id: string;
  qualification_group_other: string;
  qualification_id: string;
  qualification_other: string;
  institute_id: string;
  institute_other: string;
  major_subject: string;
  country: string;
  city: string;
  city_other: string;
  passing_year: string;
  obtained_marks_gpa: string;
  total_marks_gpa: string;
  division_grade: string;
}

export const emptyEducation = (id: number): EducationEntry => ({
  id,
  qualification_group_id: "",
  qualification_group_other: "",
  qualification_id: "",
  qualification_other: "",
  institute_id: "",
  institute_other: "",
  major_subject: "",
  country: "",
  city: "",
  city_other: "",
  passing_year: "",
  obtained_marks_gpa: "",
  total_marks_gpa: "",
  division_grade: "",
});

interface EducationRowProps {
  entry: EducationEntry;
  onFieldChange: (
    id: number,
    field: keyof EducationEntry,
    value: string,
  ) => void;
  onRemove: (id: number) => void;
  removeDisabled: boolean;
  errors: Record<string, string>;
  groupOptions: SelectOption[];
  instituteOptions: SelectOption[];
  qualifications: any[];
  isLoadingGroups: boolean;
  isLoadingInstitutes: boolean;
  isLoadingQualifications: boolean;
}

const EducationRow = React.memo(function EducationRow({
  entry,
  onFieldChange,
  onRemove,
  removeDisabled,
  errors,
  groupOptions,
  instituteOptions,
  qualifications,
  isLoadingGroups,
  isLoadingInstitutes,
  isLoadingQualifications,
}: EducationRowProps) {
  const qualificationOptions = useMemo(
    () =>
      qualifications
        .filter(
          (q: any) =>
            String(q.qualificationGroupId) ===
            String(entry.qualification_group_id),
        )
        .map((q: any) => ({ label: q.name, value: q.id })),
    [qualifications, entry.qualification_group_id],
  );

  const isGroupOther = entry.qualification_group_id === "other";
  const isQualOther = entry.qualification_id === "other";

  return (
    <RepeatableCard
      onRemove={() => onRemove(entry.id)}
      removeDisabled={removeDisabled}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
        <FormSelectField
          label="Qualification Level"
          required
          allowOther
          error={errors[`${entry.id}_qualification_group_id`]}
          value={entry.qualification_group_id}
          onChange={(e) => {
            const v = e.target.value;
            onFieldChange(entry.id, "qualification_group_id", v);
            onFieldChange(
              entry.id,
              "qualification_id",
              v === "other" ? "other" : "",
            );
          }}
          isLoading={isLoadingGroups}
          placeholder="Select qualification level"
          options={groupOptions}
        />

        {isGroupOther && (
          <Field
            label="Qualification Level (Other)"
            required
            error={errors[`${entry.id}_qualification_group_other`]}
          >
            <FlameInput
              value={entry.qualification_group_other}
              onChange={(e) =>
                onFieldChange(
                  entry.id,
                  "qualification_group_other",
                  e.target.value,
                )
              }
              placeholder="e.g. Diploma of Associate Engineer"
              maxLength={100}
            />
          </Field>
        )}

        <FormSelectField
          label="Degree / Qualification"
          required
          allowOther
          error={errors[`${entry.id}_qualification_id`]}
          value={entry.qualification_id}
          onChange={(e) =>
            onFieldChange(entry.id, "qualification_id", e.target.value)
          }
          disabled={
            !entry.qualification_group_id ||
            isGroupOther ||
            isLoadingQualifications
          }
          isLoading={isLoadingQualifications}
          placeholder={
            !entry.qualification_group_id
              ? "Select level first"
              : "Select degree"
          }
          options={qualificationOptions}
        />

        {isQualOther && (
          <Field
            label="Degree / Qualification (Other)"
            required
            error={errors[`${entry.id}_qualification_other`]}
          >
            <FlameInput
              value={entry.qualification_other}
              onChange={(e) =>
                onFieldChange(entry.id, "qualification_other", e.target.value)
              }
              placeholder="Enter degree name"
              maxLength={150}
            />
          </Field>
        )}

        <FormSelectField
          label="Institute / Board"
          required
          allowOther
          error={errors[`${entry.id}_institute_id`]}
          value={entry.institute_id}
          onChange={(e) =>
            onFieldChange(entry.id, "institute_id", e.target.value)
          }
          isLoading={isLoadingInstitutes}
          placeholder="Select institute or board"
          options={instituteOptions}
        />

        {entry.institute_id === "other" && (
          <Field
            label="Institute Name (Other)"
            required
            error={errors[`${entry.id}_institute_other`]}
          >
            <FlameInput
              value={entry.institute_other}
              onChange={(e) =>
                onFieldChange(entry.id, "institute_other", e.target.value)
              }
              placeholder="Enter institute / board name"
            />
          </Field>
        )}

        <Field
          label="Major Subject / Specialization"
          required
          error={errors[`${entry.id}_major_subject`]}
        >
          <FlameInput
            value={entry.major_subject}
            onChange={(e) =>
              onFieldChange(entry.id, "major_subject", e.target.value)
            }
            placeholder="e.g. Computer Science, Pre-Engineering"
          />
        </Field>

        <LocationSelects
          required
          countryName="country"
          cityName="city"
          countryValue={entry.country}
          cityValue={entry.city}
          onCountryChange={(e) =>
            onFieldChange(entry.id, "country", e.target.value)
          }
          onCityChange={(e) => onFieldChange(entry.id, "city", e.target.value)}
          countryError={errors[`${entry.id}_country`]}
          cityError={errors[`${entry.id}_city`]}
        />

        {entry.city === "other" && (
          <Field
            label="City (Other)"
            required
            error={errors[`${entry.id}_city_other`]}
          >
            <FlameInput
              value={entry.city_other}
              onChange={(e) =>
                onFieldChange(entry.id, "city_other", e.target.value)
              }
              placeholder="Enter your city"
            />
          </Field>
        )}

        <Field
          label="Passing Year"
          required
          error={errors[`${entry.id}_passing_year`]}
        >
          <FlameInput
            type="text"
            maxLength={4}
            inputMode="numeric"
            value={entry.passing_year}
            onChange={(e) =>
              onFieldChange(
                entry.id,
                "passing_year",
                e.target.value.replace(/\D+/g, ""),
              )
            }
            placeholder="YYYY"
          />
        </Field>

        <Field
          label="Obtained Marks / CGPA"
          required
          error={errors[`${entry.id}_obtained_marks_gpa`]}
        >
          <FlameInput
            type="text"
            inputMode="decimal"
            value={entry.obtained_marks_gpa}
            onChange={(e) =>
              onFieldChange(
                entry.id,
                "obtained_marks_gpa",
                e.target.value.replace(/[^\d.]/g, ""),
              )
            }
            placeholder="e.g. 3.75 or 850"
          />
        </Field>

        <Field
          label="Total Marks / CGPA"
          required
          error={errors[`${entry.id}_total_marks_gpa`]}
        >
          <FlameInput
            type="text"
            inputMode="decimal"
            value={entry.total_marks_gpa}
            onChange={(e) =>
              onFieldChange(
                entry.id,
                "total_marks_gpa",
                e.target.value.replace(/[^\d.]/g, ""),
              )
            }
            placeholder="e.g. 4.00 or 1100"
          />
        </Field>

        <Field
          label="Division / Grade"
          required
          error={errors[`${entry.id}_division_grade`]}
        >
          <FlameSelect
            value={entry.division_grade}
            onChange={(e) =>
              onFieldChange(entry.id, "division_grade", e.target.value)
            }
          >
            <option value="">Select division / grade</option>
            <option value="1st Division / A+">1st Division / A+</option>
            <option value="1st Division / A">1st Division / A</option>
            <option value="1st Division / B">1st Division / B</option>
            <option value="2nd Division / C">2nd Division / C</option>
            <option value="3rd Division / D">3rd Division / D</option>
          </FlameSelect>
        </Field>
      </div>
    </RepeatableCard>
  );
});

interface EducationTabProps {
  entries: EducationEntry[];
  onFieldChange: (
    id: number,
    field: keyof EducationEntry,
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  errors: Record<string, string>;
  canAdd?: boolean;
}

export function EducationTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
  canAdd = true,
}: EducationTabProps) {
  const { data: qualificationGroups = [], isLoading: isLoadingGroups } =
    useQuery({
      queryKey: ["qualificationGroups"],
      queryFn: getQualificationGroups,
      staleTime: 1000 * 60 * 60,
    });

  const { data: institutes = [], isLoading: isLoadingInstitutes } = useQuery({
    queryKey: ["institutes"],
    queryFn: getInstitutes,
    staleTime: 1000 * 60 * 60,
  });

  const { data: qualifications = [], isLoading: isLoadingQualifications } =
    useQuery({
      queryKey: ["qualifications"],
      queryFn: getQualifications,
      staleTime: 1000 * 60 * 60,
    });

  const groupOptions = useMemo(
    () =>
      qualificationGroups.map((g: any) => ({
        label: g.groupName || g.title,
        value: g.id,
      })),
    [qualificationGroups],
  );

  const instituteOptions = useMemo(
    () =>
      institutes.map((i: any) => ({
        label: i.name || i.institute_name,
        value: i.id,
      })),
    [institutes],
  );

  return (
    <div>
      <SectionHeading
        title="Education & Qualifications"
        description="Provide details of your academic background starting with your highest qualification."
      />
      <div className="space-y-4">
        {entries.map((entry) => (
          <EducationRow
            key={entry.id}
            entry={entry}
            onFieldChange={onFieldChange}
            onRemove={onRemove}
            removeDisabled={entries.length === 1 || !canAdd}
            errors={errors}
            groupOptions={groupOptions}
            instituteOptions={instituteOptions}
            qualifications={qualifications}
            isLoadingGroups={isLoadingGroups}
            isLoadingInstitutes={isLoadingInstitutes}
            isLoadingQualifications={isLoadingQualifications}
          />
        ))}
        {canAdd && (
          <div className="pt-2">
            <AddButton onClick={onAdd} label="Add another education" />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Certificates tab
// ---------------------------------------------------------------------------

interface CertificateEntry {
  id: number;
  name: string;
  organisation: string;
  document?: File | string | null;
  issue_date: string;
  duration_value: string;
  duration_unit: string;
}

const emptyCertificate = (id: number): CertificateEntry => ({
  id,
  name: "",
  organisation: "",
  document: null,
  issue_date: "",
  duration_value: "",
  duration_unit: "",
});

interface CertificatesTabProps {
  entries: CertificateEntry[];
  onFieldChange: (
    id: number,
    field: keyof CertificateEntry,
    value: any,
  ) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  errors: Record<string, string>;
  canAdd?: boolean;
}

const getDocumentName = (doc: unknown) => {
  if (!doc) return "Choose file...";
  if (typeof doc === "string") return doc.split("/").pop();
  if (doc instanceof File) return doc.name;
  return "File attached";
};

export function CertificatesTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
  canAdd = true,
}: CertificatesTabProps) {
  return (
    <div>
      <SectionHeading
        title="Certifications"
        description="Add your professional certifications and attach supporting documents."
      />
      <div className="space-y-4">
        {entries.map((entry) => (
          <RepeatableCard
            key={entry.id}
            onRemove={() => onRemove(entry.id)}
            removeDisabled={entries.length === 1 || !canAdd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field
                label="Certification Name"
                required
                error={errors[`${entry.id}_name`]}
              >
                <FlameInput
                  value={entry.name || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "name", e.target.value)
                  }
                  placeholder="e.g. AWS Certified Solutions Architect"
                />
              </Field>

              <Field
                label="Issuing Organisation"
                required
                error={errors[`${entry.id}_organisation`]}
              >
                <FlameInput
                  value={entry.organisation || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "organisation", e.target.value)
                  }
                  placeholder="e.g. Amazon Web Services"
                />
              </Field>

              <Field
                label="Issue Date"
                required
                error={errors[`${entry.id}_issue_date`]}
              >
                <FlameInput
                  type="date"
                  value={entry.issue_date || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "issue_date", e.target.value)
                  }
                />
              </Field>
              <Field as="div" label="Duration (optional)">
                <div className="flex gap-2">
                  <FlameInput
                    type="number"
                    min={1}
                    max={999}
                    value={entry.duration_value}
                    onChange={(e) =>
                      onFieldChange(entry.id, "duration_value", e.target.value)
                    }
                    placeholder="e.g. 3"
                  />
                  <FlameSelect
                    value={entry.duration_unit}
                    onChange={(e) =>
                      onFieldChange(entry.id, "duration_unit", e.target.value)
                    }
                  >
                    <option value="">Unit</option>
                    <option value="HOURS">Hours</option>
                    <option value="DAYS">Days</option>
                    <option value="WEEKS">Weeks</option>
                    <option value="MONTHS">Months</option>
                    <option value="YEARS">Years</option>
                  </FlameSelect>
                </div>
              </Field>

              <Field
                as="div"
                label="Attach Document"
                required
                error={errors[`${entry.id}_document`]}
              >
                <div className="flex items-center gap-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <span className="truncate">
                      {getDocumentName(entry.document)}
                    </span>
                    <span className="ml-2 shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      Browse
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          onFieldChange(entry.id, "document", file);
                        }
                      }}
                    />
                  </label>

                  {entry.document && canAdd && (
                    <button
                      type="button"
                      onClick={() => onFieldChange(entry.id, "document", null)}
                      className="rounded p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                      title="Remove attachment"
                      aria-label="Remove attachment"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      {canAdd && (
        <div className="mt-4">
          <AddButton label="Add another certification" onClick={onAdd} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Memberships tab
// ---------------------------------------------------------------------------

interface MembershipEntry {
  id: number;
  organisation: string;
  membership_type: string;
  member_since: string;
}

const emptyMembership = (id: number): MembershipEntry => ({
  id,
  organisation: "",
  membership_type: "",
  member_since: "",
});

interface MembershipsTabProps {
  entries: MembershipEntry[];
  onFieldChange: (
    id: number,
    field: keyof MembershipEntry,
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  errors: Record<string, string>;
  canAdd?: boolean;
}

function MembershipsTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
  canAdd = true,
}: MembershipsTabProps) {
  return (
    <div>
      <SectionHeading
        title="Memberships"
        description="Professional bodies or associations you belong to."
      />
      <div className="space-y-4">
        {entries.map((entry) => (
          <RepeatableCard
            key={entry.id}
            onRemove={() => onRemove(entry.id)}
            removeDisabled={entries.length === 1 || !canAdd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field
                label="Organisation"
                required
                error={errors[`${entry.id}_organisation`]}
              >
                <FlameInput
                  value={entry.organisation}
                  onChange={(e) =>
                    onFieldChange(entry.id, "organisation", e.target.value)
                  }
                  placeholder="e.g. Pakistan Engineering Council"
                />
              </Field>
              <Field
                label="Membership type"
                required
                error={errors[`${entry.id}_membership_type`]}
              >
                <FlameInput
                  value={entry.membership_type}
                  onChange={(e) =>
                    onFieldChange(entry.id, "membership_type", e.target.value)
                  }
                  placeholder="e.g. Associate Member"
                />
              </Field>
              <Field
                label="Member since"
                required
                error={errors[`${entry.id}_member_since`]}
              >
                <FlameInput
                  type="month"
                  value={entry.member_since}
                  onChange={(e) =>
                    onFieldChange(entry.id, "member_since", e.target.value)
                  }
                />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      {canAdd && (
        <div className="mt-4">
          <AddButton label="Add another membership" onClick={onAdd} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Achievements & Awards tab
// ---------------------------------------------------------------------------

interface AchievementEntry {
  id: number;
  title: string;
  issuer: string;
  date_received: string;
  description: string;
}

const emptyAchievement = (id: number): AchievementEntry => ({
  id,
  title: "",
  issuer: "",
  date_received: "",
  description: "",
});

interface AchievementsTabProps {
  entries: AchievementEntry[];
  onFieldChange: (
    id: number,
    field: keyof AchievementEntry,
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  errors: Record<string, string>;
  canAdd?: boolean;
}

function AchievementsTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
  canAdd = true,
}: AchievementsTabProps) {
  return (
    <div>
      <SectionHeading
        title="Achievements & Awards"
        description="Highlight notable awards, recognitions, or professional accomplishments."
      />
      <div className="space-y-4">
        {entries.map((entry) => (
          <RepeatableCard
            key={entry.id}
            onRemove={() => onRemove(entry.id)}
            removeDisabled={entries.length === 1 || !canAdd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field
                label="Achievement / Award Title"
                required
                error={errors[`${entry.id}_title`]}
              >
                <FlameInput
                  value={entry.title || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "title", e.target.value)
                  }
                  placeholder="e.g. Employee of the Year"
                />
              </Field>

              <Field
                label="Issuing Organisation / Authority"
                required
                error={errors[`${entry.id}_issuer`]}
              >
                <FlameInput
                  value={entry.issuer || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "issuer", e.target.value)
                  }
                  placeholder="e.g. Company Management"
                />
              </Field>

              <Field
                label="Date Received"
                required
                error={errors[`${entry.id}_date_received`]}
              >
                <FlameInput
                  type="date"
                  value={entry.date_received || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "date_received", e.target.value)
                  }
                />
              </Field>

              <Field
                label="Description"
                className="sm:col-span-2 lg:col-span-3"
                error={errors[`${entry.id}_description`]}
              >
                <FlameTextarea
                  rows={2}
                  value={entry.description || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "description", e.target.value)
                  }
                  placeholder="Briefly describe what this achievement was awarded for"
                />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      {canAdd && (
        <div className="mt-4">
          <AddButton label="Add another achievement" onClick={onAdd} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects & Research tab
// ---------------------------------------------------------------------------

interface ProjectEntry {
  id: number;
  project_title: string;
  role: string;
  project_url: string;
  description: string;
}

const emptyProject = (id: number): ProjectEntry => ({
  id,
  project_title: "",
  role: "",
  project_url: "",
  description: "",
});

interface ProjectsTabProps {
  entries: ProjectEntry[];
  onFieldChange: (id: number, field: keyof ProjectEntry, value: string) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  errors: Record<string, string>;
  canAdd?: boolean;
}

function ProjectsTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
  canAdd = true,
}: ProjectsTabProps) {
  return (
    <div>
      <SectionHeading
        title="Projects & Research"
        description="Showcase key technical projects, applications, or academic research studies."
      />
      <div className="space-y-4">
        {entries.map((entry) => (
          <RepeatableCard
            key={entry.id}
            onRemove={() => onRemove(entry.id)}
            removeDisabled={entries.length === 1 || !canAdd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field
                label="Project / Research Title"
                required
                error={errors[`${entry.id}_project_title`]}
              >
                <FlameInput
                  value={entry.project_title || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "project_title", e.target.value)
                  }
                  placeholder="e.g. Pipeline Monitoring IoT System"
                />
              </Field>

              {/* <Field
                label="Your Role"
                required
                error={errors[`${entry.id}_role`]}
              >
                <FlameInput
                  value={entry.role || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "role", e.target.value)
                  }
                  placeholder="e.g. Lead Developer / Researcher"
                />
              </Field> */}

              {/* <Field
                label="Project Link / Repository (optional)"
                error={errors[`${entry.id}_project_url`]}
              >
                <FlameInput
                  value={entry.project_url || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "project_url", e.target.value)
                  }
                  placeholder="https://github.com/..."
                />
              </Field> */}

              <Field
                label="Description & Key Contributions"
                required
                className="sm:col-span-2 lg:col-span-3"
                error={errors[`${entry.id}_description`]}
              >
                <FlameTextarea
                  rows={3}
                  value={entry.description || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "description", e.target.value)
                  }
                  placeholder="Describe the objective, technologies used, and outcomes"
                />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      {canAdd && (
        <div className="mt-4">
          <AddButton label="Add another project" onClick={onAdd} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// References tab
// ---------------------------------------------------------------------------

interface ReferenceEntry {
  id: number;
  name: string;
  designation: string;
  organisation: string;
  // email: string;
  phone: string;
}

const emptyReference = (id: number): ReferenceEntry => ({
  id,
  name: "",
  designation: "",
  organisation: "",
  // email: "",
  phone: "",
});

interface ReferencesTabProps {
  entries: ReferenceEntry[];
  onFieldChange: (
    id: number,
    field: keyof ReferenceEntry,
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  errors: Record<string, string>;
  canAdd?: boolean;
}

function ReferencesTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
  canAdd = true,
}: ReferencesTabProps) {
  return (
    <div>
      <SectionHeading
        title="Professional References"
        description="Provide professional references who can vouch for your work history."
      />
      <div className="space-y-4">
        {entries.map((entry) => (
          <RepeatableCard
            key={entry.id}
            onRemove={() => onRemove(entry.id)}
            removeDisabled={entries.length === 1 || !canAdd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field
                label="Referee Name"
                required
                error={errors[`${entry.id}_name`]}
              >
                <FlameInput
                  value={entry.name || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "name", e.target.value)
                  }
                  placeholder="e.g. Dr. Ahmed Khan"
                />
              </Field>

              <Field
                label="Designation"
                required
                error={errors[`${entry.id}_designation`]}
              >
                <FlameInput
                  value={entry.designation || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "designation", e.target.value)
                  }
                  placeholder="e.g. General Manager"
                />
              </Field>

              <Field
                label="Organisation"
                required
                error={errors[`${entry.id}_organisation`]}
              >
                <FlameInput
                  value={entry.organisation || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "organisation", e.target.value)
                  }
                  placeholder="e.g. ABC Corporation"
                />
              </Field>

              {/* <Field
                label="Email Address"
                required
                error={errors[`${entry.id}_email`]}
              >
                <FlameInput
                  type="email"
                  value={entry.email || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "email", e.target.value)
                  }
                  placeholder="ahmed.khan@example.com"
                />
              </Field> */}

              <Field
                label="Phone Number"
                required
                error={errors[`${entry.id}_phone`]}
              >
                <FlameInput
                  type="tel"
                  value={entry.phone || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "phone", e.target.value)
                  }
                  placeholder="03001234567"
                />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      {canAdd && (
        <div className="mt-4">
          <AddButton label="Add another reference" onClick={onAdd} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skills Tab Component
// ---------------------------------------------------------------------------

interface SkillsTabProps {
  data: SkillsFormData;
  onChange: (newData: SkillsFormData) => void;
  errors: Record<string, string>;
}

function SkillsTab({ data, onChange, errors }: SkillsTabProps) {
  const [coreInput, setCoreInput] = useState("");
  const [toolInput, setToolInput] = useState("");

  const addCoreSkill = () => {
    const trimmed = coreInput.trim();
    if (trimmed && !data.core_skills.includes(trimmed)) {
      onChange({ ...data, core_skills: [...data.core_skills, trimmed] });
      setCoreInput("");
    }
  };

  const removeCoreSkill = (skillToRemove: string) => {
    onChange({
      ...data,
      core_skills: data.core_skills.filter((s) => s !== skillToRemove),
    });
  };

  const addSoftwareTool = () => {
    const trimmed = toolInput.trim();
    if (trimmed && !data.software_tools.includes(trimmed)) {
      onChange({ ...data, software_tools: [...data.software_tools, trimmed] });
      setToolInput("");
    }
  };

  const removeSoftwareTool = (toolToRemove: string) => {
    onChange({
      ...data,
      software_tools: data.software_tools.filter((t) => t !== toolToRemove),
    });
  };

  const addLanguage = () => {
    onChange({
      ...data,
      languages_known: [
        ...data.languages_known,
        { language: "", proficiency: "INTERMEDIATE" },
      ],
    });
  };

  const updateLanguage = (
    index: number,
    field: "language" | "proficiency",
    value: string,
  ) => {
    const updated = [...data.languages_known];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, languages_known: updated });
  };

  const removeLanguage = (index: number) => {
    onChange({
      ...data,
      languages_known: data.languages_known.filter((_, i) => i !== index),
    });
  };

  return (
    <div>
      <SectionHeading
        title="Technical & Professional Skills"
        description="Highlight your core competencies, software tools, and language proficiencies."
      />

      <div className="space-y-8">
        <div>
          <Field
            label="Core Professional Skills"
            required
            error={errors.core_skills}
          >
            <div className="flex gap-2 mb-3">
              <FlameInput
                value={coreInput}
                onChange={(e) => setCoreInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCoreSkill();
                  }
                }}
                placeholder="e.g. Project Management, Financial Analysis, React.js (Press Enter)"
              />
              <button
                type="button"
                onClick={addCoreSkill}
                className="px-4 py-2 rounded-md font-medium text-white text-sm shrink-0 transition-opacity hover:opacity-90"
                style={{ background: flameGradient }}
              >
                Add Skill
              </button>
            </div>
          </Field>

          <div className="flex flex-wrap gap-2">
            {data.core_skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeCoreSkill(skill)}
                  className="hover:text-red-500 transition-colors ml-1"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <Field
            label="Software & Tools"
            required
            error={errors.software_tools}
          >
            <div className="flex gap-2 mb-3">
              <FlameInput
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSoftwareTool();
                  }
                }}
                placeholder="e.g. SAP ERP, MS Excel, AutoCAD, Git (Press Enter)"
              />
              <button
                type="button"
                onClick={addSoftwareTool}
                className="px-4 py-2 rounded-md font-medium text-white text-sm shrink-0 transition-opacity hover:opacity-90"
                style={{ background: flameGradient }}
              >
                Add Tool
              </button>
            </div>
          </Field>

          <div className="flex flex-wrap gap-2">
            {data.software_tools.map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200"
              >
                {tool}
                <button
                  type="button"
                  onClick={() => removeSoftwareTool(tool)}
                  className="hover:text-red-500 transition-colors ml-1"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex justify-between items-center">
            <span className="block text-sm font-semibold text-slate-800">
              Languages Known <span style={{ color: flame.edge }}>*</span>
            </span>
            <AddButton onClick={addLanguage} label="Add Language" />
          </div>

          {errors.languages_known && (
            <p className="text-xs text-red-500 mb-3">
              {errors.languages_known}
            </p>
          )}

          <div className="space-y-3">
            {data.languages_known.map((lang, index) => (
              <RepeatableCard
                key={index}
                onRemove={() => removeLanguage(index)}
                removeDisabled={data.languages_known.length === 1}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-8">
                  <Field label="Language" required>
                    <FlameInput
                      value={lang.language}
                      onChange={(e) =>
                        updateLanguage(index, "language", e.target.value)
                      }
                      placeholder="e.g. English, Urdu, Sindhi"
                    />
                  </Field>

                  {/* <Field label="Proficiency Level" required>
                    <FlameSelect
                      value={lang.proficiency}
                      onChange={(e) =>
                        updateLanguage(index, "proficiency", e.target.value)
                      }
                    >
                      <option value="BASIC">Basic</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="PROFICIENT">Proficient</option>
                      <option value="NATIVE">Native / Fluent</option>
                    </FlameSelect>
                  </Field> */}
                </div>
              </RepeatableCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

interface ProfileFormData extends PersonalFormData, SkillsFormData {
  image: File | string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certificates: CertificateEntry[];
  memberships: MembershipEntry[];
  achievements: AchievementEntry[];
  projects: ProjectEntry[];
  references: ReferenceEntry[];
}

const initialFormData: ProfileFormData = {
  image: "",
  father_name: "",
  marital_status: "",
  children: "",
  date_of_birth: "",
  birth_country: "",
  birth_city: "",
  birth_city_other: "",
  passport_no: "",
  domicile: "",
  mobile_prefix: "",
  mobile_number: "",
  home_prefix: "",
  home_number: "",
  office_prefix: "",
  office_number: "",
  current_address: "",
  permanent_address: "",
  already_worked_ssgc: "",
  ssgc_employee_name: "",
  ssgc_employee_number: "",
  is_pakistani: "",
  professional_summary: "",
  core_skills: [],
  software_tools: [],
  languages_known: [{ language: "", proficiency: "INTERMEDIATE" }],
  experience: [emptyExperience(nextTempId())],
  education: [emptyEducation(nextTempId())],
  certificates: [emptyCertificate(nextTempId())],
  memberships: [emptyMembership(nextTempId())],
  achievements: [emptyAchievement(nextTempId())],
  projects: [emptyProject(nextTempId())],
  references: [emptyReference(nextTempId())],
};

const DIGITS_ONLY_FIELDS = new Set([
  "mobile_prefix",
  "mobile_number",
  "home_prefix",
  "home_number",
  "office_prefix",
  "office_number",
  "ssgc_employee_number",
]);

const NAME_ONLY_FIELDS = new Set(["father_name", "ssgc_employee_name"]);

function sanitizeValue(name: string, value: string): string {
  if (DIGITS_ONLY_FIELDS.has(name)) return value.replace(/\D+/g, "");
  if (NAME_ONLY_FIELDS.has(name)) return value.replace(/[^A-Za-z\s.'-]+/g, "");
  return value;
}

const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function cleanPersonal(d: ProfileFormData) {
  const {
    image,
    experience,
    education,
    certificates,
    memberships,
    achievements,
    projects,
    references,
    core_skills,
    software_tools,
    languages_known,
    ...personal
  } = d;
  const worked = personal.already_worked_ssgc === "Yes";
  return {
    ...personal,
    birth_city_other:
      personal.birth_city === "other" ? trimmed(personal.birth_city_other) : "",
    ssgc_employee_name: worked ? trimmed(personal.ssgc_employee_name) : "",
    ssgc_employee_number: worked ? trimmed(personal.ssgc_employee_number) : "",
  };
}

function cleanExperience(list: ExperienceEntry[]) {
  return list.map((e) => ({
    ...e,
    city_other: e.city === "other" ? trimmed(e.city_other) : "",
  }));
}

function cleanEducation(list: EducationEntry[]) {
  return list.map((e) => ({
    ...e,
    qualification_group_other:
      e.qualification_group_id === "other"
        ? trimmed(e.qualification_group_other)
        : "",
    qualification_other:
      e.qualification_id === "other" ? trimmed(e.qualification_other) : "",
    institute_other:
      e.institute_id === "other" ? trimmed(e.institute_other) : "",
    city_other: e.city === "other" ? trimmed(e.city_other) : "",
  }));
}

export function calculateProfileProgress(job: any, profile: any) {
  if (!job?.profileCompletion || !profile) return 0;

  const rules = job.profileCompletion;
  const totalRequired = Number(rules.count) || 0;
  if (totalRequired === 0) return 0;

  const hasItems = (v: unknown) => Array.isArray(v) && v.length > 0;

  let completedCount = 0;
  if (rules.image && Boolean(profile.userPic)) completedCount++;
  if (rules.personal && Boolean(profile.fatherName)) completedCount++;
  if (rules.experience && hasItems(profile.experiences)) completedCount++;
  if (rules.education && hasItems(profile.education)) completedCount++;
  if (rules.certificate && hasItems(profile.certificates)) completedCount++;
  if (rules.membership && hasItems(profile.memberships)) completedCount++;

  return Math.round((completedCount / totalRequired) * 100);
}

function formatDeadline(deadline: unknown): string {
  if (!deadline) return "-";
  const d = new Date(deadline as string | number | Date);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${day}-${month}-${d.getFullYear()}`;
}

type PendingDelete = { key: EntryKey; id: number } | null;

function useEntryHandlers(
  key: EntryKey,
  makeEmpty: (id: number) => any,
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setPendingDelete: React.Dispatch<React.SetStateAction<PendingDelete>>,
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>, // <--- 1. Add setIsDirty parameter here
) {
  return useMemo(
    () => ({
      onFieldChange: (id: number, field: string, value: any) => {
        setFormData((prev) => ({
          ...prev,
          [key]: (prev[key] as any[]).map((entry) =>
            entry.id === id ? { ...entry, [field]: value } : entry,
          ),
        }));
        setIsDirty(true); // <--- 2. Mark form as dirty on field change
        setErrors((prev) => {
          const errKey = `${id}_${field}`;
          if (!prev[errKey]) return prev;
          const { [errKey]: _removed, ...rest } = prev;
          return rest;
        });
      },
      onAdd: () => {
        setFormData((prev) => ({
          ...prev,
          [key]: [...(prev[key] as any[]), makeEmpty(nextTempId())],
        }));
        setIsDirty(true); // <--- 3. Mark form as dirty on adding a row
      },
      onRemove: (id: number) => {
        setPendingDelete({ key, id });
        setIsDirty(true); // <--- 4. Mark form as dirty on triggering a delete
      },
    }),
    [key, makeEmpty, setFormData, setErrors, setPendingDelete, setIsDirty],
  );
}

function ProfileTabsContent() {
  const [activeTab, setActiveTab] = useState<TabId>("photo");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { data: profile } = useUserProfile();
  const { jobId, job, exists, isLoading } = useFindingId();

  const initialized = useRef(false);
  useEffect(() => {
    if (!profile || initialized.current) return;
    initialized.current = true;
    setFormData((prev) => ({
      ...prev,
      ...mapPersonal(profile),
      ...mapSkills(profile),
      experience: profile.experiences?.length
        ? mapExperience(profile.experiences)
        : prev.experience,
      education: profile.education?.length
        ? mapEducation(profile.education)
        : prev.education,
      certificates: profile.certificates?.length
        ? mapCertificates(profile.certificates)
        : prev.certificates,
      memberships: profile.memberships?.length
        ? mapMemberships(profile.memberships)
        : prev.memberships,
      achievements: profile.achievements?.length
        ? mapAchievements(profile.achievements)
        : prev.achievements,
      projects: profile.projects?.length
        ? mapProjects(profile.projects)
        : prev.projects,
      references: profile.references?.length
        ? mapReferences(profile.references)
        : prev.references,
    }));
  }, [profile]);

  useEffect(() => {
    tabRefs.current[activeTab]?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeTab]);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // ---> 2. ADD BROWSER REFRESH / TAB CLOSE GUARD <---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // ---> 3. WRAP TAB CLICKING TO GUARD AGAINST UNSAVED CHANGES <---
  // const handleTabClick = (tabId: TabId) => {
  //   if (tabId === activeTab) return;
  //   if (isDirty) {
  //     const confirmLeave = window.confirm(
  //       "You have unsaved changes in this section. Are you sure you want to switch tabs?",
  //     );
  //     if (!confirmLeave) return;
  //   }
  //   setActiveTab(tabId);
  //   setIsDirty(false); // Reset dirty flag when successfully changing tabs
  // };

  const handleTabClick = (tabId: TabId) => {
    if (tabId === activeTab) return;
    if (isDirty) {
      if (!window.confirm("Discard unsaved changes in this section?")) return;
      if (profile) syncSection(activeTab, profile);
      setFormData((prev) => ({ ...prev, image: "" }));
      setErrors({});
      setIsDirty(false);
    }
    setActiveTab(tabId);
  };

  function syncSection(tab: TabId, p: any) {
    setFormData((prev) => {
      switch (tab) {
        case "personal":
          return { ...prev, ...mapPersonal(p) };
        case "skills":
          return { ...prev, ...mapSkills(p) };
        case "experience":
          return p.experiences?.length
            ? { ...prev, experience: mapExperience(p.experiences) }
            : prev;
        case "education":
          return p.education?.length
            ? { ...prev, education: mapEducation(p.education) }
            : prev;
        case "certificates":
          return p.certificates?.length
            ? { ...prev, certificates: mapCertificates(p.certificates) }
            : prev;
        case "memberships":
          return p.memberships?.length
            ? { ...prev, memberships: mapMemberships(p.memberships) }
            : prev;
        case "achievements":
          return p.achievements?.length
            ? { ...prev, achievements: mapAchievements(p.achievements) }
            : prev;
        case "projects":
          return p.projects?.length
            ? { ...prev, projects: mapProjects(p.projects) }
            : prev;
        case "references":
          return p.references?.length
            ? { ...prev, references: mapReferences(p.references) }
            : prev;
        default:
          return prev;
      }
    });
  }

  const { data: applied } = useQuery({
    queryKey: ["application_status", job?.id],
    queryFn: async () => {
      const res = await api.get(`/api/applications/status?jobId=${job?.id}`);
      return res.data as { applied: boolean; applicationId: number | null };
    },
    enabled: Boolean(job?.id),
  });

  const progressPercentage = useMemo(
    () => calculateProfileProgress(job, profile),
    [job, profile],
  );

  const experienceHandlers = useEntryHandlers(
    "experience",
    emptyExperience,
    setFormData,
    setErrors,
    setPendingDelete,
    setIsDirty,
  );
  const educationHandlers = useEntryHandlers(
    "education",
    emptyEducation,
    setFormData,
    setErrors,
    setPendingDelete,
    setIsDirty,
  );
  const certificatesHandlers = useEntryHandlers(
    "certificates",
    emptyCertificate,
    setFormData,
    setErrors,
    setPendingDelete,
    setIsDirty,
  );
  const membershipsHandlers = useEntryHandlers(
    "memberships",
    emptyMembership,
    setFormData,
    setErrors,
    setPendingDelete,
    setIsDirty,
  );
  const achievementsHandlers = useEntryHandlers(
    "achievements",
    emptyAchievement,
    setFormData,
    setErrors,
    setPendingDelete,
    setIsDirty,
  );
  const projectsHandlers = useEntryHandlers(
    "projects",
    emptyProject,
    setFormData,
    setErrors,
    setPendingDelete,
    setIsDirty,
  );
  const referencesHandlers = useEntryHandlers(
    "references",
    emptyReference,
    setFormData,
    setErrors,
    setPendingDelete,
    setIsDirty,
  );

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { key, id } = pendingDelete;

    if ((formData[key] as any[]).length === 1) {
      setPendingDelete(null);
      return;
    }

    setDeleting(true);
    try {
      // if (isSavedId(id)) {
      //   await api.delete(`${DELETE_ENDPOINTS[key]}/${id}`);
      //   queryClient.invalidateQueries({ queryKey: ["profile_data"] });
      // }

      setFormData((prev) => {
        const list = prev[key] as any[];
        if (list.length === 1) return prev;
        return { ...prev, [key]: list.filter((entry) => entry.id !== id) };
      });

      toast.success(`${ENTRY_LABELS[key]} removed`);
      setPendingDelete(null);
    } catch (err) {
      if ((err as any)?.response?.status === 401) return;
      toast.error("Could not delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    const str = (val: unknown): string =>
      val === null || val === undefined ? "" : String(val).trim();

    if (activeTab === "photo") {
      const hasNewFile = formData.image instanceof File;
      const hasSavedPhoto = Boolean(profile?.userPic);
      if (!hasNewFile && !hasSavedPhoto) {
        newErrors.image = "Image is required";
      }
    }

    if (activeTab === "skills") {
      if (!formData.core_skills || formData.core_skills.length === 0) {
        newErrors.core_skills = "At least one core skill is required";
      }
      if (!formData.software_tools || formData.software_tools.length === 0) {
        newErrors.software_tools = "At least one software/tool is required";
      }
      if (!formData.languages_known || formData.languages_known.length === 0) {
        newErrors.languages_known = "At least one language is required";
      }
    }

    if (activeTab === "personal") {
      const fatherName = formData.father_name?.trim() || "";
      if (!fatherName) {
        newErrors.father_name = "Father's / Husband's name is required";
      } else if (fatherName.length < 3) {
        newErrors.father_name = "Name must be at least 3 characters";
      } else if (!NAME_REGEX.test(fatherName)) {
        newErrors.father_name = "Name can only contain letters";
      }

      if (!formData.marital_status) {
        newErrors.marital_status = "Marital status is required";
      }
      if (!formData.children) {
        newErrors.children = "Number of children is required";
      }
      if (!formData.is_pakistani) {
        newErrors.is_pakistani = "Nationality is required";
      }
      if (!formData.professional_summary) {
        newErrors.professional_summary = "Professional Summary is required";
      }
      if (!formData.date_of_birth) {
        newErrors.date_of_birth = "Date of birth is required";
      } else {
        const dob = new Date(formData.date_of_birth);
        if (Number.isNaN(dob.getTime())) {
          newErrors.date_of_birth = "Enter a valid date";
        } else if (dob > new Date()) {
          newErrors.date_of_birth = "Date of birth cannot be in the future";
        } else if (calculateAge(formData.date_of_birth) < 18) {
          newErrors.date_of_birth = "You must be at least 18 years old";
        } else if (calculateAge(formData.date_of_birth) > 80) {
          newErrors.date_of_birth = "Please check the date of birth";
        }
      }

      if (!formData.birth_country) {
        newErrors.birth_country = "Birth country is required";
      }
      if (!formData.birth_city) {
        newErrors.birth_city = "Birth city is required";
      }
      if (
        formData.birth_city === "other" &&
        !formData.birth_city_other?.trim()
      ) {
        newErrors.birth_city_other = "Please specify your birth city";
      }

      const domicile = formData.domicile?.trim() || "";
      if (!domicile) {
        newErrors.domicile = "Domicile is required";
      } else if (domicile.length < 2) {
        newErrors.domicile = "Domicile looks too short";
      }

      if (!formData.mobile_prefix?.trim()) {
        newErrors.mobile_prefix = "Network code is required";
      } else if (!PREFIX_REGEX.test(formData.mobile_prefix.trim())) {
        newErrors.mobile_prefix = "Use format 03xx";
      }
      if (!formData.mobile_number?.trim()) {
        newErrors.mobile_number = "Mobile number is required";
      } else if (!MOBILE_REGEX.test(formData.mobile_number.trim())) {
        newErrors.mobile_number = "Enter a valid 7-digit mobile number";
      }

      const currentAddress = formData.current_address?.trim() || "";
      if (!currentAddress) {
        newErrors.current_address = "Current address is required";
      } else if (currentAddress.length < 10) {
        newErrors.current_address = "Please provide a more complete address";
      }

      const permanentAddress = formData.permanent_address?.trim() || "";
      if (!permanentAddress) {
        newErrors.permanent_address = "Permanent address is required";
      } else if (permanentAddress.length < 10) {
        newErrors.permanent_address = "Please provide a more complete address";
      }

      if (!formData.already_worked_ssgc) {
        newErrors.already_worked_ssgc = "Please select an option";
      }
      if (formData.already_worked_ssgc === "Yes") {
        if (!formData.ssgc_employee_name?.trim()) {
          newErrors.ssgc_employee_name = "Employee name is required";
        }
        if (!formData.ssgc_employee_number?.trim()) {
          newErrors.ssgc_employee_number = "Employee number is required";
        } else if (!/^\d+$/.test(formData.ssgc_employee_number.trim())) {
          newErrors.ssgc_employee_number = "Employee number must be numeric";
        }
      }
    }

    if (activeTab === "experience") {
      formData.experience.forEach((entry) => {
        if (!entry.job_title.trim()) {
          newErrors[`${entry.id}_job_title`] = "Job title is required";
        }
        if (!entry.company.trim()) {
          newErrors[`${entry.id}_company`] = "Company is required";
        }
        if (!entry.start_date) {
          newErrors[`${entry.id}_start_date`] = "Start date is required";
        }
        if (!entry.end_date) {
          newErrors[`${entry.id}_end_date`] = "End date is required";
        }
        if (!entry.country) {
          newErrors[`${entry.id}_country`] = "Country is required";
        }
        if (!entry.city) {
          newErrors[`${entry.id}_city`] = "City is required";
        }
        if (!entry.salary) {
          newErrors[`${entry.id}_salary`] = "Salary is required";
        }
        if (!entry.responsibilities.trim()) {
          newErrors[`${entry.id}_responsibilities`] =
            "Responsibilities are required";
        }
        if (!entry.reason.trim()) {
          newErrors[`${entry.id}_reason`] = "Reason is required";
        }
      });
    }

    if (activeTab === "education") {
      formData.education.forEach((entry) => {
        const p = `${entry.id}_`;
        if (!str(entry.qualification_group_id)) {
          newErrors[`${p}qualification_group_id`] =
            "Qualification level is required";
        }
        if (!str(entry.qualification_id)) {
          newErrors[`${p}qualification_id`] =
            "Degree/Qualification is required";
        }
        if (!str(entry.institute_id)) {
          newErrors[`${p}institute_id`] = "Institute or Board is required";
        }
        if (!str(entry.major_subject)) {
          newErrors[`${p}major_subject`] = "Major subject is required";
        }
        if (!str(entry.passing_year)) {
          newErrors[`${p}passing_year`] = "Passing year is required";
        }
        if (!str(entry.obtained_marks_gpa)) {
          newErrors[`${p}obtained_marks_gpa`] =
            "Obtained marks/CGPA is required";
        }
        if (!str(entry.total_marks_gpa)) {
          newErrors[`${p}total_marks_gpa`] = "Total marks/CGPA is required";
        }
        if (!str(entry.division_grade)) {
          newErrors[`${p}division_grade`] = "Division / Grade is required";
        }
      });
    }

    if (activeTab === "certificates") {
      formData.certificates.forEach((entry) => {
        if (!entry.name.trim()) {
          newErrors[`${entry.id}_name`] = "Certificate name is required";
        }
        if (!entry.organisation.trim()) {
          newErrors[`${entry.id}_organisation`] =
            "Issuing organisation is required";
        }
        if (!entry.issue_date) {
          newErrors[`${entry.id}_issue_date`] = "Issue date is required";
        }
        if (!entry.document) {
          newErrors[`${entry.id}_document`] = "Document is required";
        }
      });
    }

    if (activeTab === "memberships") {
      formData.memberships.forEach((entry) => {
        if (!entry.organisation.trim()) {
          newErrors[`${entry.id}_organisation`] = "Organisation is required";
        }
        if (!entry.membership_type.trim()) {
          newErrors[`${entry.id}_membership_type`] =
            "Membership type is required";
        }
        if (!entry.member_since.trim()) {
          newErrors[`${entry.id}_member_since`] = "Member since is required";
        }
      });
    }

    if (activeTab === "achievements") {
      formData.achievements.forEach((entry) => {
        if (!entry.title.trim()) {
          newErrors[`${entry.id}_title`] = "Title is required";
        }
        if (!entry.issuer.trim()) {
          newErrors[`${entry.id}_issuer`] = "Issuer is required";
        }
        if (!entry.date_received) {
          newErrors[`${entry.id}_date_received`] = "Date received is required";
        }
      });
    }

    if (activeTab === "projects") {
      formData.projects.forEach((entry) => {
        if (!entry.project_title.trim()) {
          newErrors[`${entry.id}_project_title`] = "Project title is required";
        }
        // if (!entry.role.trim()) {
        //   newErrors[`${entry.id}_role`] = "Role is required";
        // }
        if (!entry.description.trim()) {
          newErrors[`${entry.id}_description`] = "Description is required";
        }
      });
    }

    if (activeTab === "references") {
      formData.references.forEach((entry) => {
        if (!entry.name.trim()) {
          newErrors[`${entry.id}_name`] = "Referee name is required";
        }
        if (!entry.designation.trim()) {
          newErrors[`${entry.id}_designation`] = "Designation is required";
        }
        if (!entry.organisation.trim()) {
          newErrors[`${entry.id}_organisation`] = "Organisation is required";
        }
        // if (!entry.email.trim()) {
        //   newErrors[`${entry.id}_email`] = "Email address is required";
        // }
        if (!entry.phone.trim()) {
          newErrors[`${entry.id}_phone`] = "Phone number is required";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name } = e.target;
    const value = sanitizeValue(name, e.target.value);
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  }

  function handleImageChange(file: File | null) {
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setIsDirty(true);
      setErrors((prev) => {
        const { image: _removed, ...rest } = prev;
        return rest;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSubmitError(null);
    const label = SECTION_LABELS[activeTab] ?? "Profile";

    try {
      switch (activeTab) {
        case "photo": {
          if (!(formData.image instanceof File)) {
            toast.warning("No changes to save");
            return;
          }
          const photoPayload = new FormData();
          photoPayload.append("pic", formData.image);
          await api.post("/api/user_profile", photoPayload);
          break;
        }

        case "personal":
          await api.patch("/api/profile", cleanPersonal(formData));
          break;

        case "skills":
          await api.patch("/api/profile", {
            coreSkills: formData.core_skills,
            softwareTools: formData.software_tools,
            languagesKnown: formData.languages_known,
          });
          break;

        case "experience":
          await api.patch("/api/profile", {
            experience: cleanExperience(formData.experience),
          });
          break;

        case "education":
          await api.patch("/api/profile", {
            education: cleanEducation(formData.education),
          });
          break;

        case "certificates": {
          const payload = new FormData();
          const certificatesMeta = formData.certificates.map((cert) => ({
            id: cert.id,
            name: cert.name,
            organisation: cert.organisation,
            issue_date: cert.issue_date,
            duration_value: cert.duration_value,
            duration_unit: cert.duration_unit,
            document: cert.document instanceof File ? null : cert.document,
          }));

          payload.append("certificates", JSON.stringify(certificatesMeta));
          formData.certificates.forEach((cert, index) => {
            if (cert.document instanceof File) {
              payload.append(`document_${index}`, cert.document);
            }
          });

          await api.patch("/api/profile", payload);
          break;
        }

        case "memberships":
          await api.patch("/api/profile", {
            memberships: formData.memberships,
          });
          break;

        case "achievements":
          await api.patch("/api/profile", {
            achievements: formData.achievements.map((a) => ({
              id: a.id,
              title: a.title,
              issuer: a.issuer,
              dateReceived: a.date_received,
              description: a.description,
            })),
          });
          break;

        case "projects":
          await api.patch("/api/profile", {
            projects: formData.projects.map((p) => ({
              id: p.id,
              projectTitle: p.project_title,
              description: p.description,
            })),
          });
          break;

        case "references":
          await api.patch("/api/profile", {
            references: formData.references,
          });
          break;

        default:
          break;
      }

      await queryClient.invalidateQueries({ queryKey: ["profile_data"] });
      const fresh = queryClient.getQueryData<any>(["profile_data"]);
      if (fresh) syncSection(activeTab, fresh);
      setIsDirty(false);
      toast.success(`${label} saved successfully`);
    } catch (err) {
      if ((err as any)?.response?.status === 401) return;
      toast.error(`Could not save ${label.toLowerCase()}`);
      setSubmitError("Something went wrong while saving");
    } finally {
      setSaving(false);
    }
  }

  if (jobId && isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: flame.paper }}
      >
        <p className="text-slate-600 font-medium">Verifying Job ID...</p>
      </div>
    );
  }

  if (jobId && !exists) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: flame.paper }}
      >
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-md shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Invalid Job ID
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            The Job ID specified in the URL is invalid or has expired. Please
            check the link and try again.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-md text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: flameGradient }}
          >
            Go to jobs
          </a>
        </div>
      </div>
    );
  }

  const alreadyApplied = Boolean(applied?.applied);
  //is stop before move

  // end it
  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ background: flame.paper }}
    >
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete this ${
          pendingDelete ? ENTRY_LABELS[pendingDelete.key] : "entry"
        }?`}
        message="This action cannot be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="mb-6 flex items-center justify-around gap-3">
        <img
          src="/assests/logo-full.png"
          alt="Sui Southern Gas Company Limited"
          className="w-auto h-12"
        />
        <LogoutButton />
      </div>

      {jobId && exists && progressPercentage !== 0 && (
        <ProgressBar progress={progressPercentage} />
      )}
      {jobId && exists && progressPercentage === 100 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div
            className="bg-white rounded-xl p-6"
            style={{ border: "1px solid #E7E5E1" }}
          >
            <p
              className="text-sm font-semibold mb-4"
              style={{ color: flame.ink }}
            >
              {alreadyApplied
                ? "You have already applied for the following job position:"
                : "You are applying for the following job position:"}
            </p>

            <table className="w-full text-sm text-left border border-slate-200 rounded-md overflow-hidden">
              <thead style={{ background: "#F8FAFC" }}>
                <tr>
                  <th className="px-4 py-2 border-b border-slate-200 font-semibold text-slate-700">
                    Job Code
                  </th>
                  <th className="px-4 py-2 border-b border-slate-200 font-semibold text-slate-700">
                    Job Title
                  </th>
                  <th className="px-4 py-2 border-b border-slate-200 font-semibold text-slate-700">
                    Deadline
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 text-slate-600">
                    {job?.jobCode ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {job?.title ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatDeadline(job?.deadline)}
                  </td>
                </tr>
              </tbody>
            </table>

            {!alreadyApplied && (
              <>
                <p className="mt-4 text-sm text-slate-700">
                  Note: Please review your resume details below before
                  confirming your job application.
                </p>
                <Link
                  href={`/jobs/${job?.uuid}/apply/confirm`}
                  className="mt-3 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: flameGradient }}
                >
                  Confirm Your Job Application
                </Link>
              </>
            )}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{
            border: "1px solid #E7E5E1",
            boxShadow: "0 1px 2px rgba(11,31,51,0.04)",
          }}
        >
          <div className="h-1" style={{ background: flameGradient }} />

          <div
            className="border-b bg-slate-50/80 p-3 sm:p-4"
            style={{ borderColor: "#E7E5E1" }}
          >
            <nav
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5"
              role="tablist"
              aria-label="Profile sections"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    id={`tab-${tab.id}`}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    disabled={saving}
                    onClick={() => handleTabClick(tab.id)}
                    className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm transition-all duration-150 cursor-pointer text-left border ${
                      isActive
                        ? "bg-white text-blue-600 font-semibold shadow-sm border-slate-300/80"
                        : "bg-slate-100/70 text-slate-600 hover:bg-white hover:text-slate-900 border-slate-200/60 hover:border-slate-300/80"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? "text-blue-600"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span className="truncate">{tab.label}</span>

                    {/* Flame Accent Bar on Active Tab */}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
                        style={{ background: flameGradient }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="p-4 sm:p-8"
          >
            {activeTab === "photo" && (
              <PhotoTab
                image={typeof formData.image === "string" ? formData.image : ""}
                onChange={handleImageChange}
                error={errors.image}
                canAdd={!alreadyApplied}
              />
            )}
            {activeTab === "personal" && (
              <PersonalTab
                formData={formData}
                onChange={handleChange}
                errors={errors}
              />
            )}
            {activeTab === "skills" && (
              <SkillsTab
                data={{
                  core_skills: formData.core_skills,
                  software_tools: formData.software_tools,
                  languages_known: formData.languages_known,
                }}
                onChange={(newData) => {
                  setFormData((prev) => ({ ...prev, ...newData }));
                  setIsDirty(true); // <--- Mark form as dirty when skills/languages change
                }}
                errors={errors}
              />
            )}
            {activeTab === "experience" && (
              <ExperienceTab
                entries={formData.experience}
                errors={errors}
                canAdd={!alreadyApplied}
                {...experienceHandlers}
              />
            )}
            {activeTab === "education" && (
              <EducationTab
                entries={formData.education}
                errors={errors}
                canAdd={!alreadyApplied}
                {...educationHandlers}
              />
            )}
            {activeTab === "certificates" && (
              <CertificatesTab
                entries={formData.certificates}
                errors={errors}
                canAdd={!alreadyApplied}
                {...certificatesHandlers}
              />
            )}
            {activeTab === "memberships" && (
              <MembershipsTab
                entries={formData.memberships}
                errors={errors}
                canAdd={!alreadyApplied}
                {...membershipsHandlers}
              />
            )}
            {activeTab === "achievements" && (
              <AchievementsTab
                entries={formData.achievements}
                errors={errors}
                canAdd={!alreadyApplied}
                {...achievementsHandlers}
              />
            )}
            {activeTab === "projects" && (
              <ProjectsTab
                entries={formData.projects}
                errors={errors}
                canAdd={!alreadyApplied}
                {...projectsHandlers}
              />
            )}
            {activeTab === "references" && (
              <ReferencesTab
                entries={formData.references}
                errors={errors}
                canAdd={!alreadyApplied}
                {...referencesHandlers}
              />
            )}
          </div>

          <div
            className="flex items-center justify-between gap-3 border-t px-4 sm:px-8 py-4"
            style={{ borderColor: "#E7E5E1", background: "#FBFBFA" }}
          >
            <div>
              {submitError && (
                <p className="text-sm font-medium text-rose-600">
                  {submitError}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!alreadyApplied && (
                <button
                  type="button"
                  disabled={saving}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
                  style={{ background: flameGradient }}
                  onClick={handleSubmit}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileTabs() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: flame.paper }}
        >
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      }
    >
      <ProfileTabsContent />
    </Suspense>
  );
}
