"use client";

import React, {
  useState,
  useRef,
  type ReactNode,
  type ChangeEvent,
} from "react";
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
  Flame,
  type LucideIcon,
} from "lucide-react";
import axios from "axios";
import {
  GetCities,
  GetCountries,
  GetExperiences,
  getInstitutes,
  getQualificationGroups,
  getQualifications,
} from "@/app/lib/dashboard";
import { useQuery } from "@tanstack/react-query";
import useUserProfile from "@/app/lib/fetchUserProfile";
import { useSearchParams } from "next/navigation";
import { findId } from "@/app/action/job";

type TabId =
  | "photo"
  | "personal"
  | "experience"
  | "education"
  | "certificates"
  | "memberships";

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const flame = {
  core: "#1C6FD9",
  mid: "#2E8FD6",
  edge: "#F0862E",
  tip: "#FBB03B",
  ink: "#0B1F33",
  paper: "#FAFAF8",
};

const flameGradient = `linear-gradient(90deg, ${flame.core} 0%, ${flame.mid} 45%, ${flame.edge} 78%, ${flame.tip} 100%)`;

const TABS: TabDef[] = [
  { id: "photo", label: "Profile photo", icon: Camera },
  { id: "personal", label: "Personal details", icon: User },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "memberships", label: "Memberships", icon: Users },
];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const NAME_REGEX = /^[A-Za-z\s.'-]+$/;
const CNIC_REGEX = /^\d{13}$/;
// Local Pakistani dialing code, e.g. "021" (landline) or "0300" (mobile network).
const PREFIX_REGEX = /^0\d{2,3}$/;
// 7-digit subscriber number that follows the mobile prefix (e.g. 0300-1234567).
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
}

function Field({ label, children, required, error, className }: FieldProps) {
  return (
    <label className={`block ${className || ""}`}>
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
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors";

function FlameInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={inputClass}
      onFocus={(e) => {
        e.target.style.boxShadow = `0 0 0 3px ${flame.core}33`;
        e.target.style.borderColor = flame.core;
      }}
      onBlur={(e) => {
        e.target.style.boxShadow = "none";
        e.target.style.borderColor = "#cbd5e1";
      }}
    />
  );
}
const inputBaseClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1C6FD9] focus:ring-2 focus:ring-[#1C6FD9]/20 transition-all";
function FlameTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={inputClass}
      onFocus={(e) => {
        e.target.style.boxShadow = `0 0 0 3px ${flame.core}33`;
        e.target.style.borderColor = flame.core;
      }}
      onBlur={(e) => {
        e.target.style.boxShadow = "none";
        e.target.style.borderColor = "#cbd5e1";
      }}
    />
  );
}
interface FormSelectFieldProps extends FieldProps {
  options: { label: string; value: string | number; disabled?: boolean }[];
  placeholder?: string;
  isLoading?: boolean;
}

// FIX: props were previously untyped (implicit `any`), which silently
// swallowed type errors on every usage of this component.
function FlameSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputBaseClass} ${props.className || ""}`}
    />
  );
}
function FormSelectField({
  label,
  required,
  error,
  className,
  options,
  placeholder,
  isLoading,
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
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
        {label !== "Country" && (
          <option key="other" value="other">
            Other
          </option>
        )}
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
    staleTime: 1000 * 60 * 60, // Cache for 1 hour to eliminate redundant re-fetches
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

  const countryOptions = countries.map(
    (c: { id: number; countryName: string }) => ({
      label: c.countryName,
      value: c.id,
    }),
  );

  const cityOptions = cities.map((c: { id: number; cityName: string }) => ({
    label: c.cityName,
    value: c.id,
  }));

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
}

function PhotoTab({ image, onChange, error }: PhotoTabProps) {
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

  // const fetchUserProfile = async () => {
  //   const res = await axios.get("/api/user_profile", { withCredentials: true });
  //   return res.data.profile;
  // };

  // const {
  //   data: profile,
  //   isLoading: isLoadingProfile,
  //   isError: isProfileError,
  // } = useQuery({
  //   queryKey: ["profile_pic"],
  //   queryFn: fetchUserProfile,
  // });
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
  } = useUserProfile();
  React.useEffect(() => {
    if (profile?.userPic && !hasLocalSelection) {
      setPreview(profile.userPic);
    }
  }, [profile, hasLocalSelection]);
  React.useEffect(() => {
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
        description="A clear, recent photo helps recruiters recognise you at interview."
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
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
              JPG or PNG. Square image, at least 400×400px.
            </p>
            {isLoadingProfile && !hasLocalSelection && (
              <p className="mt-1 text-xs text-slate-400">
                Loading current photo…
              </p>
            )}
            {/* {isProfileError && !hasLocalSelection && (
              <p className="mt-1 text-xs text-red-400">
                Couldn't load your current photo.
              </p>
            )} */}
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
}

interface PersonalTabProps {
  formData: PersonalFormData;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
  // FIX: this prop was used in the component body but never declared here.
  setFormData: React.Dispatch<React.SetStateAction<any>>;
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
function PersonalTab({
  formData,
  onChange,
  errors,
  setFormData,
}: PersonalTabProps) {
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
  } = useUserProfile();

  React.useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        father_name: profile.fatherName ?? "",
        marital_status: profile.maritalStatus ?? "",
        children: profile.childrenCount ?? 0,
        date_of_birth: profile.dateOfBirth ?? "",
        birth_country: profile.birthCountryId ?? "",
        birth_city: profile.birthCityId ?? "",
        birth_city_other: profile.birthCityOther ?? "",
        passport_no: profile.passportNo ?? "",
        domicile: profile.domicile ?? "",
        mobile_prefix: profile.mobilePrefix ?? "",
        mobile_number: profile.mobileNumber ?? "",
        home_prefix: profile.homePrefix ?? "",
        home_number: profile.homeNumber ?? "",
        office_prefix: profile.officePrefix ?? "",
        office_number: profile.officeNumber ?? "",
        current_address: profile.currentAddress ?? "",
        permanent_address: profile.permanentAddress ?? "",
        already_worked_ssgc: profile.alreadyWorkedSsgc == true ? "Yes" : "No",
        ssgc_employee_name: profile.ssgcEmployeeName ?? "",
        ssgc_employee_number: profile.ssgcEmployeeNumber ?? "",
      }));
    }
  }, [profile]);
  return (
    <div>
      {jobId && !isLoading && !exists && (
        <p className="mb-4 text-sm font-medium text-red-600">
          This job link is invalid.
        </p>
      )}
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
          <select
            name="marital_status"
            value={formData.marital_status || ""}
            onChange={onChange}
            className="w-full rounded-md border text-black border-gray-300 p-2 text-sm"
          >
            <option value="">Select status</option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
          </select>
        </Field>

        <Field label="No. of Children" required error={errors.children}>
          <select
            name="children"
            value={formData.children || 0}
            onChange={onChange}
            className="w-full rounded-md border text-black border-gray-300 p-2 text-sm"
          >
            <option value="">Select</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5+">5+</option>
          </select>
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

        <Field label="Passport Number" required error={errors.passport_no}>
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
              value={formData.mobile_prefix}
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
              value={formData.home_prefix}
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

        {/* Office Number Group */}
        <div className="flex gap-2">
          <Field
            label="Code"
            className="w-1/3"
            required
            error={errors.office_prefix}
          >
            <FlameInput
              name="office_prefix"
              value={formData.office_prefix}
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
            required
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
          <select
            name="already_worked_ssgc"
            value={formData.already_worked_ssgc || ""}
            onChange={onChange}
            className="w-full rounded-md border border-gray-300 p-2 text-sm text-black"
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
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
                placeholder="Employee Name"
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
                placeholder="Employee Number"
                maxLength={10}
                type="tel"
                inputMode="numeric"
              />
            </Field>
          </>
        )}
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
      className="relative rounded-lg p-5"
      style={{ background: "#FBFBFA", border: "1px solid #E7E5E1" }}
    >
      {!removeDisabled && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: "#94A3B8" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = flame.edge)}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
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
// Experience tab (lifted into shared state)
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
  // FIX: this prop was used in the component body but never declared here.
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

function ExperienceTab({
  entries,
  onFieldChange,
  setFormData,
  onAdd,
  onRemove,
  errors,
}: ExperienceTabProps) {
  console.log("entries", entries);
  const { data: profile } = useUserProfile();
  const experience = profile?.experiences;
  function toMonthInput(date: string | Date | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  React.useEffect(() => {
    if (experience && experience.length > 0) {
      setFormData((prev) => ({
        ...prev,
        experience: experience.map((exp: any, index: number) => ({
          id: exp.id ?? index + 1,
          job_title: exp.jobTitle ?? "",
          company: exp.company ?? "",
          country: exp.country ?? "",
          city: exp.city ?? "",
          start_date: toMonthInput(exp.startDate ?? ""),
          end_date: toMonthInput(exp.endDate ?? ""),
          salary: exp.salary ?? "",
          responsibilities: exp.responsibility ?? "",
          reason: exp.reasonForLeave ?? "",
          city_other: exp.cityOther ?? "",
        })),
      }));
    }
  }, [experience]);
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
            removeDisabled={entries.length === 1}
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
                <Field label="City (Other)" required error={errors.city_other}>
                  <FlameInput
                    name="city_other"
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

              <Field label="End date" error={errors[`${entry.id}_end_date`]}>
                <FlameInput
                  type="month"
                  value={entry.end_date || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "end_date", e.target.value)
                  }
                />
              </Field>

              <Field label="Salary" error={errors[`${entry.id}_salary`]}>
                <FlameInput
                  type="number"
                  value={entry.salary || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "salary", e.target.value)
                  }
                  placeholder="80000"
                />
              </Field>

              <Field
                label="Responsibilities"
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
                label="Reason of leaving"
                error={errors[`${entry.id}_reason`]}
              >
                <FlameTextarea
                  rows={3}
                  value={entry.reason || ""}
                  onChange={(e) =>
                    onFieldChange(entry.id, "reason", e.target.value)
                  }
                  placeholder="Reason of leaving"
                />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      <div className="mt-4">
        <AddButton label="Add another position" onClick={onAdd} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Education tab (lifted into shared state)
// ---------------------------------------------------------------------------

export interface EducationEntry {
  id: number;
  qualification_group_id?: string | number;
  qualification_group_other?: string;
  qualification_id?: string | number;
  qualification_other?: string;
  country?: string;
  city?: string;
  city_other?: string;
  from?: string;
  to?: string;
  institute_id: string;
  institute_other?: string;
  major_subject: string;
  passing_year: string;
  obtained_marks_gpa: string;
  division_grade: string;
  total_marks_gpa: string;
}

export const emptyEducation = (id: number): EducationEntry => ({
  id,
  qualification_group_id: "",
  qualification_group_other: "",
  qualification_id: "",
  qualification_other: "",
  country: "",
  city: "",
  city_other: "",
  from: "",
  to: "",
  institute_id: "",
  institute_other: "",
  major_subject: "",
  passing_year: "",
  obtained_marks_gpa: "",
  division_grade: "",
  total_marks_gpa: "",
});

interface EducationRowProps {
  entry: EducationEntry;
  onFieldChange: (
    id: number,
    field: keyof EducationEntry,
    value: string,
  ) => void;
  onRemove: () => void;
  removeDisabled: boolean;
  errors: Record<string, string>;
  qualificationGroups: any[];
  institutes: any[];
  isLoadingGroups: boolean;
  isLoadingInstitutes: boolean;
}

function EducationRow({
  entry,
  onFieldChange,
  onRemove,
  removeDisabled,
  errors,
  qualificationGroups,
  institutes,
  isLoadingGroups,
  isLoadingInstitutes,
}: EducationRowProps) {
  const { data: qualifications = [], isLoading: isLoadingQualifications } =
    useQuery({
      queryKey: ["qualifications", entry.qualification_group_id],
      queryFn: () => getQualifications(entry.qualification_group_id),
      enabled: !!entry.qualification_group_id,
      staleTime: 1000 * 60 * 60,
    });

  const groupOptions = qualificationGroups.map((g: any) => ({
    label: g.groupName || g.title,
    value: g.id,
  }));

  const qualificationOptions = qualifications.map((q: any) => ({
    label: q.name || q.title,
    value: q.id,
  }));

  const instituteOptions = [
    ...institutes.map((i: any) => ({
      label: i.name || i.institute_name,
      value: i.id,
    })),
    { label: "Other", value: "other" },
  ];

  return (
    <RepeatableCard onRemove={onRemove} removeDisabled={removeDisabled}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
        <FormSelectField
          label="Qualification Level"
          required
          error={errors[`${entry.id}_qualification_group_id`]}
          value={entry.qualification_group_id}
          onChange={(e) => {
            onFieldChange(entry.id, "qualification_group_id", e.target.value);
            onFieldChange(entry.id, "qualification_id", ""); // Reset dependent selection
          }}
          isLoading={isLoadingGroups}
          placeholder="Select qualification level"
          options={groupOptions}
        />

        <FormSelectField
          label="Degree / Qualification"
          required
          error={errors[`${entry.id}_qualification_id`]}
          value={entry.qualification_id}
          onChange={(e) =>
            onFieldChange(entry.id, "qualification_id", e.target.value)
          }
          disabled={!entry.qualification_group_id || isLoadingQualifications}
          isLoading={isLoadingQualifications}
          placeholder={
            !entry.qualification_group_id
              ? "Select level first"
              : "Select degree"
          }
          options={qualificationOptions}
        />

        <FormSelectField
          label="Institute / Board"
          required
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
              value={entry.institute_other || ""}
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
          // FIX: this previously called onFieldChange(entry.id, "country", ...)
          // so selecting a city silently overwrote the country field instead.
          onCityChange={(e) => onFieldChange(entry.id, "city", e.target.value)}
          // FIX: these read the flat `errors.country` / `errors.city` keys,
          // but validate() stores per-row errors as `${entry.id}_country` /
          // `${entry.id}_city`, so the messages never rendered.
          countryError={errors[`${entry.id}_country`]}
          cityError={errors[`${entry.id}_city`]}
        />

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
              onFieldChange(entry.id, "passing_year", e.target.value)
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
              onFieldChange(entry.id, "obtained_marks_gpa", e.target.value)
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
              onFieldChange(entry.id, "total_marks_gpa", e.target.value)
            }
            placeholder="e.g. 4.00 or 1100"
          />
        </Field>

        <Field
          label="Division / Grade"
          required
          error={errors[`${entry.id}_division_grade`]}
        >
          <select
            value={entry.division_grade}
            onChange={(e) =>
              onFieldChange(entry.id, "division_grade", e.target.value)
            }
            className="w-full rounded-md border text-black border-slate-300 p-2 text-sm focus:outline-none focus:border-[#1C6FD9] focus:ring-2 focus:ring-[#1C6FD9]/20 transition-all"
          >
            <option value="">Select Division / Grade</option>
            <option value="1st Division / A+">1st Division / A+</option>
            <option value="1st Division / A">1st Division / A</option>
            <option value="1st Division / B">1st Division / B</option>
            <option value="2nd Division / C">2nd Division / C</option>
            <option value="3rd Division / D">3rd Division / D</option>
          </select>
        </Field>
      </div>
    </RepeatableCard>
  );
}

interface EducationTabProps {
  entries: EducationEntry[];
  onFieldChange: (
    id: number,
    field: keyof EducationEntry,
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  errors: Record<string, string>;
}

export function EducationTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  setFormData,
  errors,
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

  const { data: profile } = useUserProfile();
  const profileEducation = profile?.education;

  React.useEffect(() => {
    if (profileEducation && profileEducation.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        education: profileEducation.map((edu: any, index: number) => ({
          id: edu.id ?? index + 1,
          qualification_group_id: String(edu.qualificationGroupId ?? ""),
          qualification_id: String(edu.qualificationId ?? ""),
          institute_id: String(edu.institutionId ?? ""),
          institute_other: edu.instituteOther ?? "",
          major_subject: edu.majorSubject ?? "",
          // FIX: country/city were previously dropped when reloading a
          // saved profile, silently clearing fields that had been filled in.
          country: edu.countryId ?? "",
          city: edu.cityId ?? "",
          city_other: edu.cityOther ?? "",
          passing_year: String(edu.passingYear ?? ""),
          obtained_marks_gpa: String(edu.obtainedMarks ?? ""),
          total_marks_gpa: String(edu.totalMarks ?? ""),
          division_grade: edu.divisionGrade ?? "",
        })),
      }));
    }
  }, [profileEducation, setFormData]);

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
            onRemove={() => onRemove(entry.id)}
            removeDisabled={entries.length === 1}
            errors={errors}
            qualificationGroups={qualificationGroups}
            institutes={institutes}
            isLoadingGroups={isLoadingGroups}
            isLoadingInstitutes={isLoadingInstitutes}
          />
        ))}

        <div className="pt-2">
          <AddButton onClick={onAdd} label="Add another education" />
        </div>
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// Certificates tab (lifted into shared state)
// ---------------------------------------------------------------------------

interface CertificateEntry {
  id: number;
  name: string;
  organisation: string;
  document?: File | null;
  issue_date: string;
}

const emptyCertificate = (id: number): CertificateEntry => ({
  id,
  name: "",
  organisation: "",
  document: null,
  issue_date: "",
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
}

export function CertificatesTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  setFormData,
  errors,
}: CertificatesTabProps) {
  const { data: profile } = useUserProfile();
  const profileCertificates = profile?.certificates;

  React.useEffect(() => {
    if (profileCertificates && profileCertificates?.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        certificates: profileCertificates.map((cert: any, index: number) => ({
          id: cert.id ?? index + 1,
          name: cert.certificateName || "",
          organisation: cert.organisation || "",
          // Formats "2026-09-01T00:00:00.000Z" to "2026-09-01" for <input type="date" />
          issue_date: cert.issueDate ? cert.issueDate.split("T")[0] : "",
          document: cert.document || null,
        })),
      }));
    }
  }, [profileCertificates, setFormData]);

  // Helper function to extract and display file name from string path or File object
  const getDocumentName = (doc: any) => {
    if (!doc) return "Choose file...";
    if (typeof doc === "string") {
      return doc.split("/").pop();
    }
    if (doc instanceof File) {
      return doc.name;
    }
    return "File attached";
  };

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
            removeDisabled={entries.length === 1}
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

              <Field
                label="Attach Document"
                error={errors[`${entry.id}_document`]}
              >
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50 flex items-center justify-between">
                    <span className="truncate">
                      {getDocumentName(entry.document)}
                    </span>
                    <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
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

                  {entry.document && (
                    <button
                      type="button"
                      onClick={() => onFieldChange(entry.id, "document", null)}
                      className="rounded p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                      title="Remove attachment"
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
      <div className="mt-4">
        <AddButton label="Add another certification" onClick={onAdd} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Memberships tab (lifted into shared state)
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
}

function MembershipsTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
  setFormData,
}: MembershipsTabProps) {
  const { data: profile } = useUserProfile();
  const memberships = profile?.memberships;
  React.useEffect(() => {
    if (memberships && memberships.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        memberships: memberships.map((edu: any, index: number) => ({
          id: edu.id ?? index + 1,
          membership_type: edu.membershipType ?? "",
          organisation: edu.organisation ?? "",
          member_since: edu.memberSince ?? "",
        })),
      }));
    }
  }, [memberships, setFormData]);
  console.log(entries);
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
            removeDisabled={entries.length === 1}
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
                  placeholder="Pakistan Engineering Council"
                />
              </Field>
              <Field
                label="Membership type"
                error={errors[`${entry.id}_membership_type`]}
              >
                <FlameInput
                  value={entry.membership_type}
                  onChange={(e) =>
                    onFieldChange(entry.id, "membership_type", e.target.value)
                  }
                  placeholder="Associate Member"
                />
              </Field>
              <Field
                label="Member since"
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
      <div className="mt-4">
        <AddButton label="Add another membership" onClick={onAdd} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

interface ProfileFormData extends PersonalFormData {
  image: File | string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certificates: CertificateEntry[];
  memberships: MembershipEntry[];
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
  experience: [emptyExperience(1)],
  education: [emptyEducation(1)],
  certificates: [emptyCertificate(1)],
  memberships: [emptyMembership(1)],
};

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("photo");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // -------------------------------------------------------------------------
  // Validation — every field on the currently active tab is checked.
  // -------------------------------------------------------------------------

  function validate() {
    const newErrors: Record<string, string> = {};

    if (activeTab === "photo") {
      if (!(formData.image instanceof File) && !formData.image) {
        newErrors.image = "Image is required";
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

      // Home phone is optional. Only validate format once the person has
      // started filling either half of it in.
      const homePrefixTrimmed = formData.home_prefix?.trim() || "";
      const homeNumberTrimmed = formData.home_number?.trim() || "";
      if (homePrefixTrimmed || homeNumberTrimmed) {
        if (!homePrefixTrimmed) {
          newErrors.home_prefix = "Area code is required";
        } else if (!PREFIX_REGEX.test(homePrefixTrimmed)) {
          newErrors.home_prefix = "Use format 021";
        }
        if (!homeNumberTrimmed) {
          newErrors.home_number = "Home phone number is required";
        } else if (!LANDLINE_REGEX.test(homeNumberTrimmed)) {
          newErrors.home_number = "Enter a valid phone number";
        }
      }
      if (formData.office_prefix || formData.office_number) {
        if (!formData.office_prefix?.trim()) {
          newErrors.office_prefix = "Area code is required";
        } else if (!PREFIX_REGEX.test(formData.office_prefix.trim())) {
          newErrors.office_prefix = "Use format 021";
        }
        if (!formData.office_number?.trim()) {
          newErrors.office_number = "Office phone number is required";
        } else if (!LANDLINE_REGEX.test(formData.office_number.trim())) {
          newErrors.office_number = "Enter a valid phone number";
        }
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
        if (
          entry.start_date &&
          entry.end_date &&
          entry.end_date < entry.start_date
        ) {
          newErrors[`${entry.id}_end_date`] =
            "End date can't be before the start date";
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
        if (!entry.responsibilities) {
          newErrors[`${entry.id}_responsibilities`] =
            "Responsibilities is required";
        }
        if (!entry.reason) {
          newErrors[`${entry.id}_reason`] = "Reason is required";
        }
        if (entry.city === "other" && !entry.city_other?.trim()) {
          newErrors.city_other = "Please specify your experience city";
        }
      });
    }

    if (activeTab === "education") {
      const currentYear = new Date().getFullYear();

      const getSafeString = (val: unknown): string => {
        if (val === null || val === undefined) return "";
        return String(val).trim();
      };

      if (!formData.education || formData.education.length === 0) {
        newErrors["education_general"] =
          "At least one education entry is required";
      } else {
        formData.education.forEach((entry, index) => {
          const keyPrefix = `${entry.id ?? index}_`;

          if (!getSafeString(entry.qualification_group_id)) {
            newErrors[`${keyPrefix}qualification_group_id`] =
              "Qualification level is required";
          }

          if (!getSafeString(entry.qualification_id)) {
            newErrors[`${keyPrefix}qualification_id`] =
              "Degree/Qualification is required";
          }

          const instituteIdStr = getSafeString(entry.institute_id);

          if (!instituteIdStr) {
            newErrors[`${keyPrefix}institute_id`] =
              "Institute or Board is required";
          } else if (
            instituteIdStr.toLowerCase() === "other" &&
            !getSafeString(entry.institute_other)
          ) {
            newErrors[`${keyPrefix}institute_other`] =
              "Please specify institute name";
          }

          if (!getSafeString(entry.major_subject)) {
            newErrors[`${keyPrefix}major_subject`] =
              "Major subject / Specialization is required";
          }

          if (!getSafeString(entry.country)) {
            newErrors[`${keyPrefix}country`] = "Country is required";
          }

          if (!getSafeString(entry.city)) {
            newErrors[`${keyPrefix}city`] = "City is required";
          }

          const passingYearStr = getSafeString(entry.passing_year);

          if (!passingYearStr) {
            newErrors[`${keyPrefix}passing_year`] = "Passing year is required";
          } else if (!YEAR_REGEX.test(passingYearStr)) {
            newErrors[`${keyPrefix}passing_year`] =
              "Enter a valid 4-digit year";
          } else {
            const year = parseInt(passingYearStr, 10);

            if (year < 1950 || year > currentYear) {
              newErrors[`${keyPrefix}passing_year`] =
                `Year must be between 1950 and ${currentYear}`;
            }
          }

          const obtainedStr = getSafeString(entry.obtained_marks_gpa);
          const obtainedNum = parseFloat(obtainedStr);

          if (!obtainedStr) {
            newErrors[`${keyPrefix}obtained_marks_gpa`] =
              "Obtained marks/CGPA is required";
          } else if (isNaN(obtainedNum) || obtainedNum < 0) {
            newErrors[`${keyPrefix}obtained_marks_gpa`] =
              "Enter a valid positive number";
          }

          const totalStr = getSafeString(entry.total_marks_gpa);
          const totalNum = parseFloat(totalStr);

          if (!totalStr) {
            newErrors[`${keyPrefix}total_marks_gpa`] =
              "Total marks/CGPA is required";
          } else if (isNaN(totalNum) || totalNum <= 0) {
            newErrors[`${keyPrefix}total_marks_gpa`] =
              "Total marks/CGPA must be greater than 0";
          }

          if (
            obtainedStr &&
            totalStr &&
            !isNaN(obtainedNum) &&
            !isNaN(totalNum) &&
            obtainedNum >= 0 &&
            totalNum > 0 &&
            obtainedNum > totalNum
          ) {
            newErrors[`${keyPrefix}obtained_marks_gpa`] =
              "Obtained cannot exceed total";
          }

          if (!getSafeString(entry.division_grade)) {
            newErrors[`${keyPrefix}division_grade`] =
              "Division / Grade is required";
          }
        });
      }
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
          // FIX: this previously wrote to `${entry.id}_issue_date`, which
          // clobbered any real issue-date error and never showed under the
          // document field (which reads `${entry.id}_document`).
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
            "Membership Type is required";
        }
        if (!entry.member_since.trim()) {
          newErrors[`${entry.id}_member_since`] = "Member Since  is required";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Fields where only digits should ever be typeable — this stops a person
  // from pasting/typing letters into a phone number in the first place,
  // rather than only flagging it after they hit Save.
  const DIGITS_ONLY_FIELDS = new Set([
    "mobile_prefix",
    "mobile_number",
    "home_prefix",
    "home_number",
    "office_prefix",
    "office_number",
    "ssgc_employee_number",
  ]);

  // Fields restricted to human-name characters as the person types.
  const NAME_ONLY_FIELDS = new Set(["father_name", "ssgc_employee_name"]);

  function sanitizeValue(name: string, value: string): string {
    if (DIGITS_ONLY_FIELDS.has(name)) {
      return value.replace(/\D+/g, "");
    }
    if (NAME_ONLY_FIELDS.has(name)) {
      return value.replace(/[^A-Za-z\s.'-]+/g, "");
    }
    return value;
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name } = e.target;
    const value = sanitizeValue(name, e.target.value);
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "birth_city" && value !== "other") {
        updated.birth_city_other = "";
      }
      if (name === "already_worked_ssgc" && value !== "Yes") {
        updated.ssgc_employee_name = "";
        updated.ssgc_employee_number = "";
      }
      return updated;
    });
    setErrors((prev) => {
      if (!prev[name]) {
        if (name === "already_worked_ssgc") {
          const dependentKeys = ["ssgc_employee_name", "ssgc_employee_number"];
          const hasDependentError = dependentKeys.some((k) => prev[k]);
          if (!hasDependentError) return prev;
          const updated = { ...prev };
          dependentKeys.forEach((k) => delete updated[k]);
          return updated;
        }
        return prev;
      }
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  }

  function handleImageChange(file: File | null) {
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setErrors((prev) => ({ ...prev, image: "" }));
    }
  }

  const { jobId, job, exists, isLoading } = useFindingId();
   if(!jobId && !job){
    return "jrijeoj"
   }

  // Generic helpers for the four repeatable-entry tabs -----------------------

  // FIX: previously always hit "/api/experiences/${id}" regardless of which
  // tab's entry was being deleted, so removing a saved education,
  // certificate, or membership record never actually deleted it server-side.
  const DELETE_ENDPOINTS: Record<
    "experience" | "education" | "certificates" | "memberships",
    string
  > = {
    experience: "/api/experiences",
    education: "/api/education",
    certificates: "/api/certificates",
    memberships: "/api/memberships",
  };

  function makeEntryHandlers<
    K extends "experience" | "education" | "certificates" | "memberships",
  >(key: K, makeEmpty: (id: number) => ProfileFormData[K][number]) {
    return {
      onFieldChange: (
        id: number,
        field: keyof ProfileFormData[K][number],
        value: string,
      ) => {
        setFormData((prev) => ({
          ...prev,
          [key]: (prev[key] as any[]).map((entry) =>
            entry.id === id ? { ...entry, [field]: value } : entry,
          ),
        }));
        setErrors((prev) => {
          const errKey = `${id}_${String(field)}`;
          if (!prev[errKey]) return prev;
          const updated = { ...prev };
          delete updated[errKey];
          return updated;
        });
      },
      onAdd: () => {
        setFormData((prev) => ({
          ...prev,
          [key]: [...(prev[key] as any[]), makeEmpty(Date.now())],
        }));
      },
      onRemove: async (id: number) => {
        const confirmed = window.confirm(
          `Are you sure you want to delete this ${key.slice(0, -1)}?`,
        );
        if (!confirmed) return;

        setFormData((prev) => {
          const list = prev[key] as any[];
          if (list.length === 1) return prev;
          return { ...prev, [key]: list.filter((entry) => entry.id !== id) };
        });

        // Only call the API if this was a persisted (existing) record.
        // Freshly added local-only entries use Date.now() as their id and
        // were never saved, so there's nothing to delete on the server.
        const isPersistedId = id < 10_000_000_000; // adjust threshold as needed, or track this explicitly
        if (!isPersistedId) return;

        try {
          await axios.delete(`${DELETE_ENDPOINTS[key]}/${id}`, {
            withCredentials: true,
          });
        } catch (err) {
          console.error(`Failed to delete ${key} entry`, err);
          alert("Something went wrong while deleting. Please try again.");
          // Optionally: re-fetch or re-add the entry back to formData here,
          // since the local state and DB are now out of sync.
        }
      },
    };
  }

  const experienceHandlers = makeEntryHandlers("experience", emptyExperience);
  const educationHandlers = makeEntryHandlers("education", emptyEducation);
  const certificatesHandlers = makeEntryHandlers(
    "certificates",
    emptyCertificate,
  );
  const membershipsHandlers = makeEntryHandlers("memberships", emptyMembership);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSubmitError(null);

    try {
      switch (activeTab) {
        case "photo": {
          if (!(formData.image instanceof File)) {
            setErrors((prev) => ({
              ...prev,
              image: "Please select a photo first",
            }));
            return;
          }
          const photoPayload = new FormData();
          photoPayload.append("pic", formData.image);
          await axios.post("/api/user_profile", photoPayload, {
            withCredentials: true,
          });
          break;
        }

        case "personal": {
          const {
            image,
            experience,
            education,
            certificates,
            memberships,
            ...personalData
          } = formData;
          await axios.patch("/api/profile", personalData, {
            withCredentials: true,
          });
          break;
        }

        case "experience": {
          await axios.patch(
            "/api/profile",
            { experience: formData.experience },
            {
              withCredentials: true,
            },
          );
          break;
        }
        case "education": {
          await axios.patch(
            "/api/profile",
            { education: formData.education },
            {
              withCredentials: true,
            },
          );
          break;
        }

        case "certificates": {
          const payload = new FormData();

          const certificatesMeta = formData.certificates.map((cert) => ({
            id: cert.id,
            name: cert.name,
            organisation: cert.organisation,
            issue_date: cert.issue_date,
            document: cert.document instanceof File ? null : cert.document,
          }));

          payload.append("certificates", JSON.stringify(certificatesMeta));
          formData.certificates.forEach((cert, index) => {
            if (cert.document instanceof File) {
              payload.append(`document_${index}`, cert.document);
            }
          });

          const res = await axios.patch("/api/profile", payload, {
            withCredentials: true,
          });

          setFormData((prev) => ({
            ...prev,
            certificates: res.data.certificates,
          }));
          break;
        }
        case "memberships": {
          await axios.patch(
            "/api/profile",
            { memberships: formData.memberships },
            {
              withCredentials: true,
            },
          );
          break;
        }

        default:
          break;
      }

      alert("Saved successfully!");
    } catch (err) {
      console.error("Submission failed", err);
      setSubmitError("Something went wrong while saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ background: flame.paper }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: flameGradient }}
          >
            <Flame
              className="w-5 h-5 text-white"
              fill="white"
              fillOpacity={0.25}
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: flame.ink }}>
              Candidate profile
            </h1>
            <p className="text-sm text-slate-500">
              Keep your profile up to date to be considered for new openings.
            </p>
          </div>
        </div>

        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{
            border: "1px solid #E7E5E1",
            boxShadow: "0 1px 2px rgba(11,31,51,0.04)",
          }}
        >
          <div className="h-1" style={{ background: flameGradient }} />

          <div
            className="border-b overflow-x-auto"
            style={{ borderColor: "#E7E5E1" }}
          >
            <nav
              className="flex min-w-max gap-1 px-2"
              role="tablist"
              aria-label="Profile sections"
            >
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    disabled={saving}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex items-center gap-2 px-5 py-3.5 mt-1.5 rounded-t-md text-sm whitespace-nowrap transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      color: isActive ? flame.core : "#334155",
                      fontWeight: isActive ? 700 : 600,
                      background: isActive ? "#F8FAFC" : "transparent",
                      borderRight:
                        index !== TABS.length - 1
                          ? "1px solid #E2E8F0"
                          : "none",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {isActive && (
                      <span
                        className="absolute left-0 right-0 -bottom-px h-0.5"
                        style={{ background: flameGradient }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === "photo" && (
              <PhotoTab
                image={typeof formData.image === "string" ? formData.image : ""}
                onChange={handleImageChange}
                error={errors.image}
              />
            )}
            {activeTab === "personal" && (
              <PersonalTab
                formData={formData}
                onChange={handleChange}
                errors={errors}
                setFormData={setFormData}
              />
            )}
            {activeTab === "experience" && (
              <ExperienceTab
                entries={formData.experience}
                errors={errors}
                setFormData={setFormData}
                {...experienceHandlers}
              />
            )}
            {activeTab === "education" && (
              <EducationTab
                entries={formData.education}
                errors={errors}
                setFormData={setFormData}
                {...educationHandlers}
              />
            )}
            {activeTab === "certificates" && (
              <CertificatesTab
                entries={formData.certificates}
                errors={errors}
                setFormData={setFormData}
                {...certificatesHandlers}
              />
            )}
            {activeTab === "memberships" && (
              <MembershipsTab
                entries={formData.memberships}
                errors={errors}
                setFormData={setFormData}
                {...membershipsHandlers}
              />
            )}
          </div>

          <div
            className="flex items-center justify-between gap-3 border-t px-6 sm:px-8 py-4"
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
              <button
                type="button"
                disabled={saving}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: flameGradient }}
                onClick={handleSubmit}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
