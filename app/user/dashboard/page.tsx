"use client";

<<<<<<< HEAD
import React, {
  useState,
  useRef,
  type ReactNode,
  type ChangeEvent,
} from "react";
=======
import React, { useState, useRef, type ReactNode, type ChangeEvent } from "react";
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
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

interface Entry {
  id: number;
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
}

function Field({ label, children, required, error }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-800 mb-1.5">
        {label}
        {required && (
          <span className="ml-0.5" style={{ color: flame.edge }}>
            *
          </span>
        )}
      </span>
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

interface PhotoTabProps {
  image: string;
  onChange: (file: File | null) => void;
  error?: string;
}

function PhotoTab({ image, onChange, error }: PhotoTabProps) {
  const [preview, setPreview] = useState<string | null>(image || null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (file) {
      setPreview(URL.createObjectURL(file));
      onChange(file);
    }
  }

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
            />
            <p className="mt-2 text-xs text-slate-500">
              JPG or PNG. Square image, at least 400×400px.
            </p>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}

<<<<<<< HEAD
interface PersonalTabProps {
  formData: Record<string, string>;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
}

function PersonalTab({ formData, onChange, errors }: PersonalTabProps) {
=======
function PersonalTab({
  formData,
  onChange,
}: {
  formData: Record<string, string>;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
  return (
    <div>
      <SectionHeading
        title="Personal details"
        description="This information is used across your applications."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
<<<<<<< HEAD
        
        {/* Full Name */}
        <Field label="Full Name" required error={errors.full_name}>
          <FlameInput
            name="full_name"
            value={formData.full_name || ""}
            onChange={onChange}
            placeholder="e.g. Urooj Fatima"
            maxLength={100}
          />
        </Field>

        {/* Father's Name */}
        <Field label="Father's Name" required error={errors.father_name}>
          <FlameInput
            name="father_name"
            value={formData.father_name || ""}
            onChange={onChange}
            placeholder="Father's full name"
            maxLength={100}
          />
        </Field>

        {/* Marital Status */}
        <Field label="Marital Status" error={errors.marital_status}>
          <select
            name="marital_status"
            value={formData.marital_status || ""}
            onChange={onChange}
            className="w-full rounded-md border border-gray-300 p-2 text-sm"
          >
            <option value="">Select status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Other">Other</option>
          </select>
        </Field>

        {/* Children */}
        <Field label="No. of Children" error={errors.children}>
          <FlameInput
            type="number"
            name="children"
            value={formData.children || ""}
            onChange={onChange}
            placeholder="0"
            max={99}
          />
        </Field>

        {/* Date of Birth */}
        <Field label="Date of Birth" error={errors.date_of_birth}>
          <FlameInput
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth || ""}
            onChange={onChange}
          />
        </Field>

        {/* Birth Country */}
        <Field label="Birth Country" error={errors.birth_country}>
          <FlameInput
            name="birth_country"
            value={formData.birth_country || ""}
            onChange={onChange}
            placeholder="Pakistan"
          />
        </Field>

        {/* Birth City */}
        <Field label="Birth City" error={errors.birth_city}>
          <FlameInput
            name="birth_city"
            value={formData.birth_city || ""}
=======
        <Field label="Full name" required>
          <FlameInput
            name="fullName"
            value={formData.fullName || ""}
            onChange={onChange}
            placeholder="e.g. Urooj Fatima"
          />
        </Field>
        <Field label="Email address" required>
          <FlameInput
            type="email"
            name="email"
            value={formData.email || ""}
            onChange={onChange}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Phone number">
          <FlameInput
            name="phone"
            value={formData.phone || ""}
            onChange={onChange}
            placeholder="+92 300 0000000"
          />
        </Field>
        <Field label="City">
          <FlameInput
            name="city"
            value={formData.city || ""}
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
            onChange={onChange}
            placeholder="Karachi"
          />
        </Field>
<<<<<<< HEAD

        {/* Birth City Other (Conditionally shown or optional) */}
        <Field label="Birth City (Other)" error={errors.birth_city_other}>
          <FlameInput
            name="birth_city_other"
            value={formData.birth_city_other || ""}
            onChange={onChange}
            placeholder="If other city"
          />
        </Field>

        {/* Is Pakistani */}
        <Field label="Is Pakistani?" error={errors.is_pakistani}>
          <select
            name="is_pakistani"
            value={formData.is_pakistani || ""}
            onChange={onChange}
            className="w-full rounded-md border border-gray-300 p-2 text-sm"
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </Field>

        {/* CNIC */}
        <Field label="CNIC" error={errors.cnic}>
=======
        <Field label="Date of birth">
          <FlameInput
            type="date"
            name="dob"
            value={formData.dob || ""}
            onChange={onChange}
          />
        </Field>
        <Field label="CNIC / National ID">
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
          <FlameInput
            name="cnic"
            value={formData.cnic || ""}
            onChange={onChange}
            placeholder="00000-0000000-0"
<<<<<<< HEAD
            maxLength={15}
          />
        </Field>

        {/* Passport Number */}
        <Field label="Passport Number" error={errors.passport_no}>
          <FlameInput
            name="passport_no"
            value={formData.passport_no || ""}
            onChange={onChange}
            placeholder="AB1234567"
            maxLength={15}
          />
        </Field>

        {/* Domicile */}
        <Field label="Domicile" error={errors.domicile}>
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
          <Field label="Mobile Prefix" className="w-1/3" error={errors.mobile_prefix}>
            <FlameInput name="mobile_prefix" value={formData.mobile_prefix || "+92"} onChange={onChange} maxLength={10} />
          </Field>
          <Field label="Mobile Number" className="w-2/3" error={errors.mobile_number}>
            <FlameInput name="mobile_number" value={formData.mobile_number || ""} onChange={onChange} placeholder="3000000000" maxLength={10} />
          </Field>
        </div>

        {/* Home Number Group */}
        <div className="flex gap-2">
          <Field label="Home Prefix" className="w-1/3" error={errors.home_prefix}>
            <FlameInput name="home_prefix" value={formData.home_prefix || ""} onChange={onChange} maxLength={10} />
          </Field>
          <Field label="Home Number" className="w-2/3" error={errors.home_number}>
            <FlameInput name="home_number" value={formData.home_number || ""} onChange={onChange} maxLength={10} />
          </Field>
        </div>

        {/* Office Number Group */}
        <div className="flex gap-2">
          <Field label="Office Prefix" className="w-1/3" error={errors.office_prefix}>
            <FlameInput name="office_prefix" value={formData.office_prefix || ""} onChange={onChange} maxLength={10} />
          </Field>
          <Field label="Office Number" className="w-2/3" error={errors.office_number}>
            <FlameInput name="office_number" value={formData.office_number || ""} onChange={onChange} maxLength={10} />
          </Field>
        </div>

      </div>

      {/* Addresses */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Current Address" error={errors.current_address}>
          <FlameTextarea
            rows={3}
            name="current_address"
            value={formData.current_address || ""}
            onChange={onChange}
            placeholder="Street, area, city"
            maxLength={200}
          />
        </Field>
        <Field label="Permanent Address" error={errors.permanent_address}>
          <FlameTextarea
            rows={3}
            name="permanent_address"
            value={formData.permanent_address || ""}
            onChange={onChange}
            placeholder="Street, area, city"
            maxLength={200}
          />
        </Field>
      </div>

      {/* SSGC Work History Section */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Field label="Already worked at SSGC?" error={errors.already_worked_ssgc}>
          <select
            name="already_worked_ssgc"
            value={formData.already_worked_ssgc || ""}
            onChange={onChange}
            className="w-full rounded-md border border-gray-300 p-2 text-sm"
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </Field>

        {formData.already_worked_ssgc === "Yes" && (
          <>
            <Field label="SSGC Employee Name" error={errors.ssgc_employee_name}>
              <FlameInput
                name="ssgc_employee_name"
                value={formData.ssgc_employee_name || ""}
                onChange={onChange}
                placeholder="Employee Name"
                maxLength={100}
              />
            </Field>

            <Field label="SSGC Employee Number" error={errors.ssgc_employee_number}>
              <FlameInput
                name="ssgc_employee_number"
                value={formData.ssgc_employee_number || ""}
                onChange={onChange}
                placeholder="Employee Number"
                maxLength={10}
              />
            </Field>
          </>
        )}
=======
          />
        </Field>
      </div>
      <div className="mt-5">
        <Field label="Address">
          <FlameTextarea
            rows={3}
            name="address"
            value={formData.address || ""}
            onChange={onChange}
            placeholder="Street, area, city"
          />
        </Field>
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
interface RepeatableCardProps {
  children: ReactNode;
  onRemove: () => void;
}

function RepeatableCard({ children, onRemove }: RepeatableCardProps) {
  return (
    <div
      className="relative rounded-lg p-5"
      style={{ background: "#FBFBFA", border: "1px solid #E7E5E1" }}
    >
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

function ExperienceTab() {
  const [entries, setEntries] = useState<Entry[]>([{ id: 1 }]);

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
            onRemove={() =>
              setEntries((prev) => prev.filter((e) => e.id !== entry.id))
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field label="Job title" required>
                <FlameInput placeholder="Software Engineer" />
              </Field>
              <Field label="Company" required>
                <FlameInput placeholder="SSGC" />
              </Field>
              <Field label="Start date">
                <FlameInput type="month" />
              </Field>
              <Field label="End date">
                <FlameInput type="month" />
              </Field>
            </div>
            <div className="mt-5">
              <Field label="Responsibilities">
                <FlameTextarea
                  rows={3}
                  placeholder="Briefly describe your role and achievements"
                />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      <div className="mt-4">
        <AddButton
          label="Add another position"
          onClick={() => setEntries((prev) => [...prev, { id: Date.now() }])}
        />
      </div>
    </div>
  );
}

function EducationTab() {
  const [entries, setEntries] = useState<Entry[]>([{ id: 1 }]);

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
            onRemove={() =>
              setEntries((prev) => prev.filter((e) => e.id !== entry.id))
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field label="Degree / Qualification" required>
                <FlameInput placeholder="BS Computer Science" />
              </Field>
              <Field label="Institution" required>
                <FlameInput placeholder="NED University" />
              </Field>
              <Field label="Year of completion">
                <FlameInput placeholder="2024" />
              </Field>
              <Field label="Grade / CGPA">
                <FlameInput placeholder="3.6 / 4.0" />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      <div className="mt-4">
        <AddButton
          label="Add another qualification"
          onClick={() => setEntries((prev) => [...prev, { id: Date.now() }])}
        />
      </div>
    </div>
  );
}

function CertificatesTab() {
  const [entries, setEntries] = useState<Entry[]>([{ id: 1 }]);

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
            onRemove={() =>
              setEntries((prev) => prev.filter((e) => e.id !== entry.id))
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field label="Certificate name" required>
                <FlameInput placeholder="AWS Certified Developer" />
              </Field>
              <Field label="Issuing organisation">
                <FlameInput placeholder="Amazon Web Services" />
              </Field>
              <Field label="Issue date">
                <FlameInput type="month" />
              </Field>
              <Field label="Credential ID">
                <FlameInput placeholder="Optional" />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      <div className="mt-4">
        <AddButton
          label="Add another certificate"
          onClick={() => setEntries((prev) => [...prev, { id: Date.now() }])}
        />
      </div>
    </div>
  );
}

function MembershipsTab() {
  const [entries, setEntries] = useState<Entry[]>([{ id: 1 }]);

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
            onRemove={() =>
              setEntries((prev) => prev.filter((e) => e.id !== entry.id))
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-8">
              <Field label="Organisation" required>
                <FlameInput placeholder="Pakistan Engineering Council" />
              </Field>
              <Field label="Membership type">
                <FlameInput placeholder="Associate Member" />
              </Field>
              <Field label="Member since">
                <FlameInput type="month" />
              </Field>
              <Field label="Membership ID">
                <FlameInput placeholder="Optional" />
              </Field>
            </div>
          </RepeatableCard>
        ))}
      </div>
      <div className="mt-4">
        <AddButton
          label="Add another membership"
          onClick={() => setEntries((prev) => [...prev, { id: Date.now() }])}
        />
      </div>
    </div>
  );
}

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("photo");
<<<<<<< HEAD
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

=======
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
  const [formData, setFormData] = useState<{
    image: File | string;
    fullName: string;
    email: string;
    phone: string;
    city: string;
    dob: string;
    cnic: string;
    address: string;
  }>({
    image: "",
    fullName: "",
    email: "",
    phone: "",
    city: "",
    dob: "",
    cnic: "",
    address: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const newErrors: Record<string, string> = {};
<<<<<<< HEAD

    if (activeTab === "photo" && !(formData.image instanceof File)) {
      newErrors.image = "Image is required";
    }

    if (activeTab === "personal") {
      if (!formData.fullName) newErrors.fullName = "Full name is required";
      if (!formData.email) newErrors.email = "Email is required";
    }

=======
    if (activeTab === "photo" && !formData.image) {
      newErrors.image = "Image is required";
    }
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleChange(
<<<<<<< HEAD
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
=======
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleImageChange(file: File | null) {
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setErrors((prev) => ({ ...prev, image: "" }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

<<<<<<< HEAD
    setSaving(true);
    setSubmitError(null);

    try {
      switch (activeTab) {
        case "photo": {
          if (!(formData.image instanceof File)) {
            setErrors({ image: "Please select a photo first" });
            return;
          }
          const photoPayload = new FormData();
          photoPayload.append("photo", formData.image);
          await axios.post("/api/profile/photo", photoPayload, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          break;
        }

        case "personal": {
          await axios.patch("/api/profile", {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            city: formData.city,
            dob: formData.dob,
            cnic: formData.cnic,
            address: formData.address,
          });
          break;
        }

        default:
          // Other tabs (experience, education, etc.) handle their own save/add actions separately
          break;
      }

      alert("Saved successfully!");
    } catch (err) {
      console.error("Submission failed", err);
      setSubmitError("Something went wrong while saving");
    } finally {
      setSaving(false);
=======
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        payload.append(key, val);
      });

      await axios.post("/api/user_profile", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Submission failed", err);
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
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
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex items-center gap-2 px-5 py-3.5 mt-1.5 rounded-t-md text-sm whitespace-nowrap transition-colors focus:outline-none"
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
<<<<<<< HEAD
                image={typeof formData.image === "string" ? formData.image : ""}
=======
                image={
                  typeof formData.image === "string" ? formData.image : ""
                }
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
                onChange={handleImageChange}
                error={errors.image}
              />
            )}
            {activeTab === "personal" && (
<<<<<<< HEAD
              <PersonalTab
                formData={formData}
                onChange={handleChange}
                errors={errors}
              />
=======
              <PersonalTab formData={formData} onChange={handleChange} />
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
            )}
            {activeTab === "experience" && <ExperienceTab />}
            {activeTab === "education" && <EducationTab />}
            {activeTab === "certificates" && <CertificatesTab />}
            {activeTab === "memberships" && <MembershipsTab />}
          </div>

          <div
<<<<<<< HEAD
            className="flex items-center justify-between gap-3 border-t px-6 sm:px-8 py-4"
            style={{ borderColor: "#E7E5E1", background: "#FBFBFA" }}
          >
            <div>
              {submitError && (
                <p className="text-sm font-medium text-rose-600">{submitError}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
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
=======
            className="flex items-center justify-end gap-3 border-t px-6 sm:px-8 py-4"
            style={{ borderColor: "#E7E5E1", background: "#FBFBFA" }}
          >
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: flameGradient }}
              onClick={handleSubmit}
            >
              Save changes
            </button>
>>>>>>> 7bfb65fcc388409c0c5e1bc91cb1e7f9091fc991
          </div>
        </div>
      </div>
    </div>
  );
}