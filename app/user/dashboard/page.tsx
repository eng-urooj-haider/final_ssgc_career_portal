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
import { GetCities, GetCountries } from "@/app/lib/dashboard";
import { useQuery } from "@tanstack/react-query";

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
// NOTE: previously this required a leading "+" (e.g. "+92"), which could never
// match the "03xx" placeholder or the 4-character maxLength on the input.
const PREFIX_REGEX = /^0\d{2,3}$/;
// 7-digit subscriber number that follows the mobile prefix (e.g. 0300-1234567).
// Previously this required exactly 10 digits while the input was capped at
// maxLength=7, so the field could never be filled in a way that validated.
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

  const fetchUserProfile = async () => {
    const res = await axios.get("/api/user_profile", { withCredentials: true });
    return res.data.profile;
  };

  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
  } = useQuery({
    queryKey: ["profile_pic"],
    queryFn: fetchUserProfile,
  });

  React.useEffect(() => {
    if (profile?.user_pic && !hasLocalSelection) {
      setPreview(profile.user_pic);
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
            {isProfileError && !hasLocalSelection && (
              <p className="mt-1 text-xs text-red-400">
                Couldn't load your current photo.
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
  // is_pakistani: string;
  // cnic: string;
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
}

function PersonalTab({
  formData,
  onChange,
  errors,
  setFormData,
}: PersonalTabProps) {
  const {
    data: cities,
    isLoading: isLoadingCities,
    error: citiesError,
  } = useQuery({
    queryKey: ["cities"],
    queryFn: GetCities,
  });

  const {
    data: countries,
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useQuery({
    queryKey: ["countries"],
    queryFn: GetCountries,
  });
  const fetchUserProfile = async () => {
    const res = await axios.get("/api/user_profile", { withCredentials: true });
    return res.data.profile;
  };
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
  } = useQuery({
    queryKey: ["profile_data"],
    queryFn: fetchUserProfile,
  });
  React.useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);
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
          <select
            name="marital_status"
            value={formData.marital_status || ""}
            onChange={onChange}
            className="w-full rounded-md border text-black border-gray-300 p-2 text-sm"
          >
            <option value="">Select status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Other">Other</option>
          </select>
        </Field>

        <Field label="No. of Children" required error={errors.children}>
          <select
            name="children"
            value={formData.children || ""}
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

        <Field label="Birth Country" required error={errors.birth_country}>
          <select
            name="birth_country"
            value={formData.birth_country || ""}
            onChange={onChange}
            disabled={isLoadingCountries}
            className="w-full rounded-md border text-black border-gray-300 p-2 text-sm"
          >
            <option value="">
              {isLoadingCountries ? "Loading countries..." : "Select country"}
            </option>
            {countriesError && (
              <option disabled>Failed to load countries</option>
            )}
            {countries?.map((country: { id: number; country: string }) => (
              <option key={country.id} value={country.country}>
                {country.country}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Birth City" required error={errors.birth_city}>
          <select
            name="birth_city"
            value={formData.birth_city || ""}
            onChange={onChange}
            disabled={isLoadingCities}
            className="w-full rounded-md border text-black border-gray-300 p-2 text-sm"
          >
            <option value="">
              {isLoadingCities ? "Loading cities..." : "Select city"}
            </option>
            {citiesError && <option disabled>Failed to load cities</option>}
            {cities?.map((city: { id: number; city: string }) => (
              <option key={city.id} value={city.city}>
                {city.city}
              </option>
            ))}
            <option value="other">Other</option>
          </select>
        </Field>

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

        {/* <Field label="Is Pakistani?" required error={errors.is_pakistani}>
          <select
            name="is_pakistani"
            value={formData.is_pakistani || ""}
            onChange={onChange}
            className="w-full rounded-md border border-gray-300 p-2 text-sm text-black"
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </Field> */}

        {/* Only one of CNIC / Passport applies, depending on citizenship. */}
        {/* {formData.is_pakistani === "Yes" && (
          <Field label="CNIC" required error={errors.cnic}>
            <FlameInput
              name="cnic"
              value={formData.cnic || ""}
              onChange={onChange}
              placeholder="0000000000000"
              maxLength={13}
              type="tel"
              inputMode="numeric"
            />
          </Field>
        )} */}

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
});

interface ExperienceTabProps {
  entries: ExperienceEntry[];
  onFieldChange: (id: number, field: keyof ExperienceEntry, value: string) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  errors: Record<string, string>;
}

function ExperienceTab({ entries, onFieldChange, onAdd, onRemove, errors }: ExperienceTabProps) {
  // Job location fields — this tab's own countries/cities lookups,
  // deliberately separate from the Personal tab's birth country/city.
  const {
    data: countries,
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useQuery({
    queryKey: ["countries"],
    queryFn: GetCountries,
  });

  const {
    data: cities,
    isLoading: isLoadingCities,
    error: citiesError,
  } = useQuery({
    queryKey: ["cities"],
    queryFn: GetCities,
  });

  return (
    <div>
      <SectionHeading title="Experience" description="List your work history, most recent first." />
      <div className="space-y-4">
        {entries.map((entry) => (
          <RepeatableCard
            key={entry.id}
            onRemove={() => onRemove(entry.id)}
            removeDisabled={entries.length === 1}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field label="Job title" required error={errors[`${entry.id}_job_title`]}>
                <FlameInput
                  value={entry.job_title}
                  onChange={(e) => onFieldChange(entry.id, "job_title", e.target.value)}
                  placeholder="Software Engineer"
                />
              </Field>

              <Field label="Company" required error={errors[`${entry.id}_company`]}>
                <FlameInput
                  value={entry.company}
                  onChange={(e) => onFieldChange(entry.id, "company", e.target.value)}
                  placeholder="SSGC"
                />
              </Field>

              <Field label="Country" error={errors[`${entry.id}_country`]}>
                <select
                  value={entry.country}
                  onChange={(e) => onFieldChange(entry.id, "country", e.target.value)}
                  disabled={isLoadingCountries}
                  className="w-full rounded-md border text-black border-gray-300 p-2 text-sm"
                >
                  <option value="">
                    {isLoadingCountries ? "Loading countries..." : "Select country"}
                  </option>
                  {countriesError && <option disabled>Failed to load countries</option>}
                  {countries?.map((country: { id: number; country: string }) => (
                    <option key={country.id} value={country.country}>
                      {country.country}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="City" error={errors[`${entry.id}_city`]}>
                <select
                  value={entry.city}
                  onChange={(e) => onFieldChange(entry.id, "city", e.target.value)}
                  disabled={isLoadingCities}
                  className="w-full rounded-md border text-black border-gray-300 p-2 text-sm"
                >
                  <option value="">
                    {isLoadingCities ? "Loading cities..." : "Select city"}
                  </option>
                  {citiesError && <option disabled>Failed to load cities</option>}
                  {cities?.map((city: { id: number; city: string }) => (
                    <option key={city.id} value={city.city}>
                      {city.city}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Start date" required error={errors[`${entry.id}_start_date`]}>
                <FlameInput
                  type="month"
                  value={entry.start_date}
                  onChange={(e) => onFieldChange(entry.id, "start_date", e.target.value)}
                />
              </Field>

              <Field label="End date" error={errors[`${entry.id}_end_date`]}>
                <FlameInput
                  type="month"
                  value={entry.end_date}
                  onChange={(e) => onFieldChange(entry.id, "end_date", e.target.value)}
                />
              </Field>

              <Field label="Salary" error={errors[`${entry.id}_salary`]}>
                <FlameInput
                  type="number"
                  value={entry.salary}
                  onChange={(e) => onFieldChange(entry.id, "salary", e.target.value)}
                  placeholder="80000"
                />
              </Field>

              <Field label="Responsibilities" error={errors[`${entry.id}_responsibilities`]}>
                <FlameTextarea
                  rows={3}
                  value={entry.responsibilities}
                  onChange={(e) => onFieldChange(entry.id, "responsibilities", e.target.value)}
                  placeholder="Briefly describe your role and achievements"
                />
              </Field>

              <Field label="Reason of leaving" error={errors[`${entry.id}_reason`]}>
                <FlameTextarea
                  rows={3}
                  value={entry.reason}
                  onChange={(e) => onFieldChange(entry.id, "reason", e.target.value)}
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

interface EducationEntry {
  id: number;
  degree: string;
  institution: string;
  year: string;
  grade: string;
}

const emptyEducation = (id: number): EducationEntry => ({
  id,
  degree: "",
  institution: "",
  year: "",
  grade: "",
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
}

function EducationTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
}: EducationTabProps) {
  return (
    <div>
      <SectionHeading
        title="Education"
        description="Add your academic qualifications, most recent first."
      />
      <div className="space-y-4">
        {entries.map((entry) => (
          <RepeatableCard
            key={entry.id}
            onRemove={() => onRemove(entry.id)}
            // removeDisabled={entries.length === 1}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field
                label="Degree / Qualification"
                required
                error={errors[`${entry.id}_degree`]}
              >
                <FlameInput
                  value={entry.degree}
                  onChange={(e) =>
                    onFieldChange(entry.id, "degree", e.target.value)
                  }
                  placeholder="BS Computer Science"
                />
              </Field>
              <Field
                label="Institution"
                required
                error={errors[`${entry.id}_institution`]}
              >
                <FlameInput
                  value={entry.institution}
                  onChange={(e) =>
                    onFieldChange(entry.id, "institution", e.target.value)
                  }
                  placeholder="NED University"
                />
              </Field>
              <Field
                label="Year of completion"
                required
                error={errors[`${entry.id}_year`]}
              >
                <FlameInput
                  value={entry.year}
                  onChange={(e) =>
                    onFieldChange(entry.id, "year", e.target.value)
                  }
                  placeholder="2024"
                  maxLength={4}
                />
              </Field>
              <Field label="Grade / CGPA" error={errors[`${entry.id}_grade`]}>
                <FlameInput
                  value={entry.grade}
                  onChange={(e) =>
                    onFieldChange(entry.id, "grade", e.target.value)
                  }
                  placeholder="3.6 / 4.0"
                />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      <div className="mt-4">
        <AddButton label="Add another qualification" onClick={onAdd} />
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
  issue_date: string;
  credential_id: string;
}

const emptyCertificate = (id: number): CertificateEntry => ({
  id,
  name: "",
  organisation: "",
  issue_date: "",
  credential_id: "",
});

interface CertificatesTabProps {
  entries: CertificateEntry[];
  onFieldChange: (
    id: number,
    field: keyof CertificateEntry,
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  errors: Record<string, string>;
}

function CertificatesTab({
  entries,
  onFieldChange,
  onAdd,
  onRemove,
  errors,
}: CertificatesTabProps) {
  return (
    <div>
      <SectionHeading
        title="Certificates"
        description="Professional certifications relevant to your field."
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
                label="Certificate name"
                required
                error={errors[`${entry.id}_name`]}
              >
                <FlameInput
                  value={entry.name}
                  onChange={(e) =>
                    onFieldChange(entry.id, "name", e.target.value)
                  }
                  placeholder="AWS Certified Developer"
                />
              </Field>
              <Field
                label="Issuing organisation"
                required
                error={errors[`${entry.id}_organisation`]}
              >
                <FlameInput
                  value={entry.organisation}
                  onChange={(e) =>
                    onFieldChange(entry.id, "organisation", e.target.value)
                  }
                  placeholder="Amazon Web Services"
                />
              </Field>
              <Field
                label="Issue date"
                required
                error={errors[`${entry.id}_issue_date`]}
              >
                <FlameInput
                  type="month"
                  value={entry.issue_date}
                  onChange={(e) =>
                    onFieldChange(entry.id, "issue_date", e.target.value)
                  }
                />
              </Field>
              <Field
                label="Credential ID"
                error={errors[`${entry.id}_credential_id`]}
              >
                <FlameInput
                  value={entry.credential_id}
                  onChange={(e) =>
                    onFieldChange(entry.id, "credential_id", e.target.value)
                  }
                  placeholder="Optional"
                />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      <div className="mt-4">
        <AddButton label="Add another certificate" onClick={onAdd} />
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
  membership_id: string;
}

const emptyMembership = (id: number): MembershipEntry => ({
  id,
  organisation: "",
  membership_type: "",
  member_since: "",
  membership_id: "",
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
              <Field
                label="Membership ID"
                error={errors[`${entry.id}_membership_id`]}
              >
                <FlameInput
                  value={entry.membership_id}
                  onChange={(e) =>
                    onFieldChange(entry.id, "membership_id", e.target.value)
                  }
                  placeholder="Optional"
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
  // is_pakistani: "",
  // cnic: "",
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

      // if (!formData.is_pakistani) {
      //   newErrors.is_pakistani = "Please select an option";
      // }

      // CNIC and passport are mutually exclusive, based on citizenship.
      // if (formData.is_pakistani === "Yes") {
      //   if (!formData.cnic?.trim()) {
      //     newErrors.cnic = "CNIC is required";
      //   } else if (!CNIC_REGEX.test(formData.cnic.trim())) {
      //     newErrors.cnic = "CNIC must be exactly 13 digits";
      //   }
      // } else if (formData.is_pakistani === "No") {
      //   if (!formData.passport_no?.trim()) {
      //     newErrors.passport_no = "Passport number is required";
      //   }
      // }

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
        if (
          entry.start_date &&
          entry.end_date &&
          entry.end_date < entry.start_date
        ) {
          newErrors[`${entry.id}_end_date`] =
            "End date can't be before the start date";
        }
      });
    }

    if (activeTab === "education") {
      formData.education.forEach((entry) => {
        if (!entry.degree.trim()) {
          newErrors[`${entry.id}_degree`] =
            "Degree / qualification is required";
        }
        if (!entry.institution.trim()) {
          newErrors[`${entry.id}_institution`] = "Institution is required";
        }
        if (!entry.year.trim()) {
          newErrors[`${entry.id}_year`] = "Year of completion is required";
        } else if (!YEAR_REGEX.test(entry.year.trim())) {
          newErrors[`${entry.id}_year`] = "Enter a valid 4-digit year";
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
      });
    }

    if (activeTab === "memberships") {
      formData.memberships.forEach((entry) => {
        if (!entry.organisation.trim()) {
          newErrors[`${entry.id}_organisation`] = "Organisation is required";
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
    // "cnic",
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
      // if (name === "is_pakistani" && value === "Yes") {
      //   updated.passport_no = "";
      // }
      // if (name === "is_pakistani" && value === "No") {
      //   updated.cnic = "";
      // }
      if (name === "already_worked_ssgc" && value !== "Yes") {
        updated.ssgc_employee_name = "";
        updated.ssgc_employee_number = "";
      }
      return updated;
    });
    setErrors((prev) => {
      if (!prev[name]) {
        // Even if this exact field has no error, switching is_pakistani or
        // already_worked_ssgc can invalidate errors on dependent fields
        // (cnic/passport_no, ssgc_employee_name/number) — clear those too.
        if (name === "is_pakistani" || name === "already_worked_ssgc") {
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

  // Generic helpers for the four repeatable-entry tabs -----------------------

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
      onRemove: (id: number) => {
        setFormData((prev) => {
          const list = prev[key] as any[];
          if (list.length === 1) return prev;
          return { ...prev, [key]: list.filter((entry) => entry.id !== id) };
        });
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
          await axios.post("/api/profile", photoPayload, {
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
          await axios.patch(
            "/api/profile",
            { certificates: formData.certificates },
            {
              withCredentials: true,
            },
          );
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
                formData
                {...experienceHandlers}
              />
            )}
            {activeTab === "education" && (
              <EducationTab
                entries={formData.education}
                errors={errors}
                {...educationHandlers}
              />
            )}
            {activeTab === "certificates" && (
              <CertificatesTab
                entries={formData.certificates}
                errors={errors}
                {...certificatesHandlers}
              />
            )}
            {activeTab === "memberships" && (
              <MembershipsTab
                entries={formData.memberships}
                errors={errors}
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
