"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User, Store, ChevronDown, Loader2, Video, X, CheckCircle,
} from "lucide-react";
import { uploadPrivate } from "@/lib/upload";

// ─── Types ────────────────────────────────────────────────────────────────────

type SellerType = "INDIVIDUAL" | "TRADER";
type Step = 1 | 2 | 3 | 4;

interface FormState {
  // Step 1
  sellerType: SellerType | null;
  disclaimerAcknowledged: boolean;
  // Step 2: individual
  fullName: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  // Step 2: trader
  businessRegNumber: string;
  contactPhone: string;
  contactEmail: string;
  safetyCompliant: boolean;
  // Step 3: shop
  shopName: string;
  slug: string;
  bio: string;
  country: string;
  // Step 3: pickup/shipping address
  sameAsProfileAddress: boolean;
  pickupName: string;
  pickupLine1: string;
  pickupLine2: string;
  pickupCity: string;
  pickupPostalCode: string;
  pickupCountry: string;
  pickupPhone: string;
  // Step 4: verification
  verificationVideoUrl: string;
  website: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  facebook: string;
}

const EMPTY_FORM: FormState = {
  sellerType: null,
  disclaimerAcknowledged: false,
  fullName: "", dateOfBirth: "",
  addressLine1: "", addressLine2: "", city: "", postalCode: "",
  businessRegNumber: "", contactPhone: "", contactEmail: "",
  safetyCompliant: false,
  shopName: "", slug: "", bio: "", country: "",
  sameAsProfileAddress: false,
  pickupName: "", pickupLine1: "", pickupLine2: "", pickupCity: "", pickupPostalCode: "", pickupCountry: "", pickupPhone: "",
  verificationVideoUrl: "",
  website: "", instagram: "", tiktok: "", youtube: "", facebook: "",
};

// Countries with reliable default carrier pickup from the active shipping
// provider (DPD, GLS, DHL Parcel). Excluded: IE/CY/MT (islands, no default
// carrier pickup), GB (post-Brexit customs), NO/CH/IS (non-EU, customs
// complications). IE is pending the Sendcloud origin validation, add it here
// once confirmed. Add more as carrier accounts are connected.
const EU_COUNTRIES = [
  { code: "AT", name: "Austria" }, { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" }, { code: "HR", name: "Croatia" },
  { code: "CZ", name: "Czech Republic" }, { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" }, { code: "FI", name: "Finland" },
  { code: "FR", name: "France" }, { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" }, { code: "HU", name: "Hungary" },
  { code: "IT", name: "Italy" }, { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "NL", name: "Netherlands" }, { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" }, { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" }, { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" }, { code: "SE", name: "Sweden" },
];

const SOCIAL_PLATFORMS = [
  { key: "website",   label: "Website",   prefix: "https://",                placeholder: "yourwebsite.com" },
  { key: "instagram", label: "Instagram", prefix: "https://instagram.com/",  placeholder: "yourhandle" },
  { key: "tiktok",    label: "TikTok",    prefix: "https://tiktok.com/@",    placeholder: "yourhandle" },
  { key: "youtube",   label: "YouTube",   prefix: "https://youtube.com/@",   placeholder: "yourchannel" },
  { key: "facebook",  label: "Facebook",  prefix: "https://facebook.com/",   placeholder: "yourpage" },
] as const;

function toSlug(value: string) {
  return value.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls = "block w-full rounded-lg border border-border-strong px-3 py-2 text-sm shadow-sm placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
const selectCls = `${inputCls} appearance-none pr-8`;

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary">
        {label}{required && <span className="ml-0.5 text-error">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────

const STEP_LABELS = ["Account type", "Identity", "Your shop", "Verify craft"];

function StepIndicator({ current, maxStep, onStepClick }: {
  current: Step;
  maxStep: Step;
  onStepClick: (step: Step) => void;
}) {
  return (
    <div className="mb-10 flex items-center gap-0">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const done = current > n;
        const active = current === n;
        const reachable = n <= maxStep;
        return (
          <div key={n} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div className={`h-px flex-1 ${done || active ? "bg-brand" : "bg-bg-subtle"}`} />
              )}
              <button
                type="button"
                onClick={() => reachable && onStepClick(n)}
                disabled={!reachable}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  done ? "bg-brand text-white" + (reachable ? " cursor-pointer hover:bg-brand-hover" : "")
                    : active ? "border-2 border-border-strong text-text-primary"
                    : "border-2 border-border text-text-muted"
                } ${reachable && !active ? "cursor-pointer" : ""}`}
              >
                {done ? "✓" : n}
              </button>
              {i < STEP_LABELS.length - 1 && (
                <div className={`h-px flex-1 ${done ? "bg-brand" : "bg-bg-subtle"}`} />
              )}
            </div>
            <button
              type="button"
              onClick={() => reachable && onStepClick(n)}
              disabled={!reachable}
              className={`mt-1.5 text-center text-xs transition-colors ${
                active ? "font-medium text-text-primary"
                  : reachable ? "text-text-muted hover:text-text-secondary cursor-pointer"
                  : "text-text-muted"
              }`}
            >
              {label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const storageKey = `caseros_onboarding_${userId}`;

  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const slugEdited = useRef(false);

  // Video upload state
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  function set(partial: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...partial }));
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  // Load saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.form) setForm({ ...EMPTY_FORM, ...parsed.form });
        if (parsed.step) setStep(parsed.step as Step);
        if (parsed.maxStep) setMaxStep(parsed.maxStep as Step);
        if (parsed.videoName) setVideoName(parsed.videoName);
        // If slug differs from auto-generated version, the user manually edited it
        if (parsed.form?.slug && parsed.form?.shopName &&
            parsed.form.slug !== toSlug(parsed.form.shopName)) {
          slugEdited.current = true;
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft on every change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ form, step, maxStep, videoName }));
    } catch {
      // ignore storage errors (e.g. private browsing quota)
    }
  }, [form, step, maxStep, videoName, hydrated, storageKey]);

  function goToStep(n: Step) {
    setStep(n);
    setMaxStep(prev => (n > prev ? n : prev));
  }

  // ── Video upload ───────────────────────────────────────────────────────────

  async function handleVideoSelect(file: File) {
    if (file.size > 100 * 1024 * 1024) {
      setVideoError("File too large (max 100 MB)");
      return;
    }
    setVideoUploading(true);
    setVideoError(null);
    setVideoName(file.name);
    set({ verificationVideoUrl: "" });
    try {
      const url = await uploadPrivate(file, "seller-verification", userId);
      set({ verificationVideoUrl: url });
    } catch {
      setVideoError("Upload failed. Please try again.");
      setVideoName(null);
    } finally {
      setVideoUploading(false);
    }
  }

  function removeVideo() {
    set({ verificationVideoUrl: "" });
    setVideoName(null);
    setVideoError(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  const step1CanContinue = form.sellerType !== null;

  function renderStep1() {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">How do you plan to sell?</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TypeCard
            active={form.sellerType === "INDIVIDUAL"}
            onClick={() => set({ sellerType: "INDIVIDUAL", disclaimerAcknowledged: false })}
            icon={<User size={20} />}
            title="Private individual"
            description="Selling personal items you no longer need"
          />
          <TypeCard
            active={form.sellerType === "TRADER"}
            onClick={() => set({ sellerType: "TRADER" })}
            icon={<Store size={20} />}
            title="Commercial trader"
            description="Running a business or selling regularly for profit"
          />
        </div>

        <details className="group rounded-xl border border-border px-4 py-3">
          <summary className="flex cursor-pointer select-none items-center justify-between text-sm font-medium text-text-secondary [list-style:none] [&::-webkit-details-marker]:hidden">
            <span>Not sure which applies to you?</span>
            <ChevronDown size={15} className="shrink-0 text-text-muted transition-transform duration-150 group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-bg-subtle p-3">
              <p className="text-xs font-semibold text-text-primary">Private individual</p>
              <p className="mt-1 text-xs text-text-secondary">Clearing out items you no longer need: crafts, second-hand clothes, vintage finds. No business registration required.</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-subtle p-3">
              <p className="text-xs font-semibold text-text-primary">Commercial trader</p>
              <p className="mt-1 text-xs text-text-secondary">Selling regularly for profit, running a business, manufacturing goods, or buying items to resell. EU consumer protection rules apply to your buyers.</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-text-muted">Still unsure? You&apos;re most likely a <strong className="text-text-secondary">Trader</strong> if you sell new-with-tags items in bulk, flip items regularly, or hold a business licence.</p>
        </details>


        <button
          type="button"
          onClick={() => goToStep(2)}
          disabled={!step1CanContinue}
          className="w-full rounded-lg bg-btn-neutral py-2.5 text-sm font-medium text-white hover:bg-btn-neutral-hover disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  const isIndividual = form.sellerType === "INDIVIDUAL";

  const step2CanContinue = isIndividual
    ? Boolean(form.fullName.trim() && form.dateOfBirth && form.addressLine1.trim() && form.city.trim() && form.postalCode.trim())
    : Boolean(form.businessRegNumber.trim() && form.contactPhone.trim() && form.contactEmail.trim() && form.safetyCompliant);

  function renderStep2() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isIndividual ? "Verify your identity" : "Business details"}
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            {isIndividual
              ? "Required by EU law. These details are kept private and never shown to buyers."
              : "Required by EU law. Your contact details may be displayed to buyers."}
          </p>
        </div>

        {isIndividual ? (
          <div className="space-y-4">
            <Field label="Full legal name" required>
              <input type="text" value={form.fullName} onChange={e => set({ fullName: e.target.value })}
                placeholder="As it appears on your ID" autoComplete="name" className={inputCls} />
            </Field>
            <Field label="Date of birth" required>
              <input type="date" value={form.dateOfBirth} onChange={e => set({ dateOfBirth: e.target.value })}
                max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                autoComplete="bday" className={inputCls} />
            </Field>
            <Field label="Address line 1" required>
              <input type="text" value={form.addressLine1} onChange={e => set({ addressLine1: e.target.value })}
                placeholder="Street and number" autoComplete="address-line1" className={inputCls} />
            </Field>
            <Field label="Address line 2">
              <input type="text" value={form.addressLine2} onChange={e => set({ addressLine2: e.target.value })}
                placeholder="Apartment, floor, etc." autoComplete="address-line2" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" required>
                <input type="text" value={form.city} onChange={e => set({ city: e.target.value })} autoComplete="address-level2" className={inputCls} />
              </Field>
              <Field label="Postal code" required>
                <input type="text" value={form.postalCode} onChange={e => set({ postalCode: e.target.value })} autoComplete="postal-code" className={inputCls} />
              </Field>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Business registration number" required>
              <input type="text" value={form.businessRegNumber} onChange={e => set({ businessRegNumber: e.target.value })}
                placeholder="e.g. HRB 12345" className={inputCls} />
            </Field>
            <Field label="Contact phone" required hint="Will be displayed to buyers on your shop page.">
              <input type="tel" value={form.contactPhone} onChange={e => set({ contactPhone: e.target.value })}
                placeholder="+49 123 456 7890" autoComplete="tel" className={inputCls} />
            </Field>
            <Field label="Contact email" required hint="Will be displayed to buyers on your shop page.">
              <input type="email" value={form.contactEmail} onChange={e => set({ contactEmail: e.target.value })}
                placeholder="contact@mybusiness.com" autoComplete="email" className={inputCls} />
            </Field>
            <div className="rounded-xl border border-border p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.safetyCompliant}
                  onChange={e => set({ safetyCompliant: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-border-strong accent-gray-900"
                />
                <span className="text-sm text-text-secondary">
                  I certify that I will only sell products compliant with EU product safety regulations,
                  including CE marking requirements where applicable.
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => goToStep(1)}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors">
            Back
          </button>
          <button type="button" onClick={() => goToStep(3)} disabled={!step2CanContinue}
            className="flex-1 rounded-lg bg-btn-neutral py-2.5 text-sm font-medium text-white hover:bg-btn-neutral-hover disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  const pickupReady = form.sameAsProfileAddress
    ? Boolean(form.fullName.trim() && form.addressLine1.trim() && form.city.trim() && form.postalCode.trim())
    : Boolean(form.pickupLine1.trim() && form.pickupCity.trim() && form.pickupPostalCode.trim());
  const step3CanContinue = Boolean(form.shopName.trim() && form.slug.trim() && form.country) && pickupReady;

  function renderStep3() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Set up your shop</h1>
          <p className="mt-1.5 text-sm text-text-secondary">Choose a name and URL for your shop. You can update these later.</p>
        </div>

        <div className="space-y-4">
          <Field label="Shop name" required>
            <input
              type="text" maxLength={50}
              value={form.shopName}
              onChange={e => {
                const v = e.target.value;
                set({ shopName: v, ...(slugEdited.current ? {} : { slug: toSlug(v) }) });
              }}
              placeholder="e.g. Marta's Ceramics"
              className={inputCls}
            />
          </Field>

          <Field label="Shop URL" required>
            <div className="flex rounded-lg border border-border-strong shadow-sm focus-within:border-border-strong focus-within:ring-1 focus-within:ring-brand">
              <span className="flex items-center rounded-l-lg border-r border-border-strong bg-bg-subtle px-3 text-xs text-text-secondary select-none whitespace-nowrap">
                caseros.com/shop/
              </span>
              <input
                type="text" maxLength={50}
                value={form.slug}
                onChange={e => {
                  slugEdited.current = true;
                  set({ slug: toSlug(e.target.value) });
                }}
                className="block w-full rounded-r-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </Field>

          <Field label="About your shop">
            <textarea
              rows={3} maxLength={500}
              value={form.bio}
              onChange={e => set({ bio: e.target.value })}
              placeholder="Tell buyers what makes your shop special…"
              className={inputCls}
            />
          </Field>

          <Field label="Country" required>
            <div className="relative">
              <select
                value={form.country}
                onChange={e => set({ country: e.target.value })}
                className={selectCls}
              >
                <option value="" disabled>Select your country</option>
                {EU_COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              Apologies, not all countries are supported yet. We&apos;re working on expanding coverage.
            </p>
          </Field>

          <div className="pt-2 space-y-3">
            <div>
              <p className="text-sm font-medium text-text-secondary">Shipping address <span className="ml-0.5 text-error">*</span></p>
              <p className="text-xs text-text-muted mt-0.5">The address packages will be sent from.</p>
            </div>

            {isIndividual && (
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.sameAsProfileAddress}
                  onChange={e => set({ sameAsProfileAddress: e.target.checked })}
                  className="h-4 w-4 rounded border-border-strong accent-gray-900"
                />
                <span className="text-sm text-text-secondary">Same as my identity address</span>
              </label>
            )}

            {form.sameAsProfileAddress && isIndividual ? (
              <div className="rounded-lg border border-border bg-bg-subtle px-3 py-2.5 text-sm text-text-secondary space-y-0.5">
                {form.fullName && <p className="font-medium text-text-primary">{form.fullName}</p>}
                <p>{form.addressLine1}{form.addressLine2 ? `, ${form.addressLine2}` : ""}</p>
                <p>{form.postalCode} {form.city}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="Full name">
                  <input type="text" value={form.pickupName} onChange={e => set({ pickupName: e.target.value })}
                    placeholder="Name on the label" autoComplete="name" className={inputCls} />
                </Field>
                <Field label="Address line 1" required>
                  <input type="text" value={form.pickupLine1} onChange={e => set({ pickupLine1: e.target.value })}
                    placeholder="Street and number" autoComplete="address-line1" className={inputCls} />
                </Field>
                <Field label="Address line 2">
                  <input type="text" value={form.pickupLine2} onChange={e => set({ pickupLine2: e.target.value })}
                    placeholder="Apartment, floor, etc." autoComplete="address-line2" className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" required>
                    <input type="text" value={form.pickupCity} onChange={e => set({ pickupCity: e.target.value })}
                      autoComplete="address-level2" className={inputCls} />
                  </Field>
                  <Field label="Postal code" required>
                    <input type="text" value={form.pickupPostalCode} onChange={e => set({ pickupPostalCode: e.target.value })}
                      autoComplete="postal-code" className={inputCls} />
                  </Field>
                </div>
                <Field label="Country">
                  <div className="relative">
                    <select value={form.pickupCountry || form.country} onChange={e => set({ pickupCountry: e.target.value })} className={selectCls}>
                      <option value="" disabled>Select country</option>
                      {EU_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  </div>
                </Field>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => goToStep(2)}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors">
            Back
          </button>
          <button type="button" onClick={() => goToStep(4)} disabled={!step3CanContinue}
            className="flex-1 rounded-lg bg-btn-neutral py-2.5 text-sm font-medium text-white hover:bg-btn-neutral-hover disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4 ─────────────────────────────────────────────────────────────────

  const hasSocialLink = [form.website, form.instagram, form.tiktok, form.youtube, form.facebook].some(v => v.trim().length > 0);
  const step4CanSubmit = Boolean(!videoUploading && form.verificationVideoUrl && hasSocialLink);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!step4CanSubmit) return;
    setLoading(true);
    setSubmitError(null);
    try {
      const resolvedPickup = form.sameAsProfileAddress
        ? { pickupName: form.fullName, pickupLine1: form.addressLine1, pickupLine2: form.addressLine2, pickupCity: form.city, pickupPostalCode: form.postalCode, pickupCountry: form.country, pickupPhone: "" }
        : { pickupName: form.pickupName, pickupLine1: form.pickupLine1, pickupLine2: form.pickupLine2, pickupCity: form.pickupCity, pickupPostalCode: form.pickupPostalCode, pickupCountry: form.pickupCountry || form.country, pickupPhone: form.pickupPhone };
      const res = await fetch("/api/seller/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...resolvedPickup,
          ...Object.fromEntries(
            SOCIAL_PLATFORMS.map(({ key, prefix }) => {
              const handle = form[key as keyof Pick<FormState, "website" | "instagram" | "tiktok" | "youtube" | "facebook">].trim();
              return [key, handle ? prefix + handle : ""];
            }),
          ),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      localStorage.removeItem(storageKey);
      router.push("/seller/dashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function renderStep4() {
    return (
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Verify your work</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Caseros is built on real, original goods made by independent makers. To keep it that way,
            we review every new seller before approving their shop. This usually takes 1–2 hours.
          </p>
        </div>

        {/* Video upload */}
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Workstation video <span className="text-error">*</span>
          </label>
          <p className="mt-0.5 text-xs text-text-muted">
            Record a short video (15–60 sec) showing your workspace and tools. This helps us confirm you're a genuine maker.
          </p>

          <div className="mt-2">
            {form.verificationVideoUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle px-3 py-2.5">
                <CheckCircle size={16} className="shrink-0 text-green-600" />
                <p className="min-w-0 flex-1 truncate text-sm text-text-secondary">{videoName}</p>
                <button type="button" onClick={removeVideo}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-muted hover:text-text-secondary">
                  <X size={14} />
                </button>
              </div>
            ) : videoUploading ? (
              <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <Loader2 size={16} className="shrink-0 animate-spin text-text-muted" />
                <p className="text-sm text-text-secondary">Uploading {videoName}…</p>
              </div>
            ) : (
              <button type="button" onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border-strong px-4 py-3 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary">
                <Video size={16} />
                Upload workstation video
              </button>
            )}

            {videoError && <p className="mt-1.5 text-xs text-error">{videoError}</p>}

            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleVideoSelect(e.target.files[0])}
            />
            <p className="mt-1.5 text-xs text-text-muted">MP4 or WebM · max 100 MB</p>
          </div>
        </div>

        {/* Social links */}
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Social media / website <span className="text-error">*</span>
          </label>
          <p className="mt-0.5 text-xs text-text-muted">
            At least one link required. Share where buyers (and we) can see your work.
            The more you add, the easier the verification process
          </p>
          <div className="mt-2 space-y-2">
            {SOCIAL_PLATFORMS.map(({ key, label, prefix, placeholder }) => {
              const value = form[key as keyof Pick<FormState, "website" | "instagram" | "tiktok" | "youtube" | "facebook">];
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs text-text-secondary">{label}</span>
                  <div className="flex flex-1 overflow-hidden rounded-lg border border-border-strong focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                    <span className="flex items-center bg-bg-subtle px-2.5 text-xs text-text-muted whitespace-nowrap border-r border-border-strong select-none">
                      {prefix}
                    </span>
                    <input
                      type="text"
                      value={value}
                      onChange={e => {
                        let v = e.target.value;
                        if (v.startsWith(prefix)) v = v.slice(prefix.length);
                        else if (v.startsWith("https://") || v.startsWith("http://")) v = v.replace(/^https?:\/\/[^/]*\//, "");
                        set({ [key]: v } as Partial<FormState>);
                      }}
                      placeholder={placeholder}
                      className="flex-1 bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

{submitError && (
          <p className="rounded-lg bg-error-subtle px-4 py-3 text-sm text-error">{submitError}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => goToStep(3)}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors">
            Back
          </button>
          <button type="submit" disabled={!step4CanSubmit || loading}
            className="flex-1 rounded-lg bg-btn-neutral py-2.5 text-sm font-medium text-white hover:bg-btn-neutral-hover disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
            {loading
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Submitting…</span>
              : "Submit for review"}
          </button>
        </div>
      </form>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!hydrated) return null;

  return (
    <div>
      <StepIndicator current={step} maxStep={maxStep} onStepClick={goToStep} />
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
}

// ─── Type card ────────────────────────────────────────────────────────────────

function TypeCard({ active, onClick, icon, title, description }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-xl border-2 p-5 text-left transition-colors ${
        active
          ? "border-border-strong bg-bg-subtle"
          : "border-border hover:border-border-strong"
      }`}
    >
      <span className={active ? "text-text-primary" : "text-text-muted"}>{icon}</span>
      <p className="mt-3 text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 text-xs text-text-secondary">{description}</p>
    </button>
  );
}
