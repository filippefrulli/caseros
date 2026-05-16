"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User, Store, AlertTriangle, CheckCircle, ChevronDown, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SellerType = "INDIVIDUAL" | "TRADER";
type Step = 1 | 2 | 3;

interface FormState {
  // Step 1
  sellerType: SellerType | null;
  disclaimerAcknowledged: boolean;
  // Step 2 — individual
  fullName: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  // Step 2 — trader
  businessRegNumber: string;
  contactPhone: string;
  contactEmail: string;
  safetyCompliant: boolean;
  // Step 3 — shop
  shopName: string;
  slug: string;
  bio: string;
  country: string;
}

const EU_COUNTRIES = [
  { code: "AT", name: "Austria" }, { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" }, { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" }, { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" }, { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" }, { code: "FR", name: "France" },
  { code: "DE", name: "Germany" }, { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" }, { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" }, { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" }, { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" }, { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" }, { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" }, { code: "GB", name: "United Kingdom" },
  { code: "NO", name: "Norway" }, { code: "CH", name: "Switzerland" },
  { code: "IS", name: "Iceland" },
];

function toSlug(value: string) {
  return value.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls = "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────

const STEP_LABELS = ["Account type", "Identity", "Your shop"];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="mb-10 flex items-center gap-0">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const done = current > n;
        const active = current === n;
        return (
          <div key={n} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div className={`h-px flex-1 ${done || active ? "bg-gray-900" : "bg-gray-200"}`} />
              )}
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                done ? "bg-gray-900 text-white"
                  : active ? "border-2 border-gray-900 text-gray-900"
                  : "border-2 border-gray-200 text-gray-300"
              }`}>
                {done ? "✓" : n}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`h-px flex-1 ${done ? "bg-gray-900" : "bg-gray-200"}`} />
              )}
            </div>
            <span className={`mt-1.5 text-center text-xs ${active ? "font-medium text-gray-900" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const slugEdited = useRef(false);

  const [form, setForm] = useState<FormState>({
    sellerType: null,
    disclaimerAcknowledged: false,
    fullName: "", dateOfBirth: "",
    addressLine1: "", addressLine2: "", city: "", postalCode: "",
    businessRegNumber: "", contactPhone: "", contactEmail: "",
    safetyCompliant: false,
    shopName: "", slug: "", bio: "", country: "",
  });

  function set(partial: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...partial }));
  }

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  const step1CanContinue =
    form.sellerType === "TRADER" ||
    (form.sellerType === "INDIVIDUAL" && form.disclaimerAcknowledged);

  function renderStep1() {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">How do you plan to sell?</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            EU law requires us to know whether you are selling as a private individual or a commercial trader.
          </p>
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

        <details className="group rounded-xl border border-gray-200 px-4 py-3">
          <summary className="flex cursor-pointer select-none items-center justify-between text-sm font-medium text-gray-700 [list-style:none] [&::-webkit-details-marker]:hidden">
            <span>Not sure which applies to you?</span>
            <ChevronDown size={15} className="shrink-0 text-gray-400 transition-transform duration-150 group-open:rotate-180" />
          </summary>
          <p className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">You are likely a Trader if you…</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="mt-0.5 text-gray-300">•</span>Sell "New with Tags" items in bulk.</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-gray-300">•</span>Regularly manufacture or flip items for profit.</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-gray-300">•</span>Have an existing business licence.</li>
          </ul>
        </details>

        {form.sellerType === "INDIVIDUAL" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <div className="space-y-3">
                <p className="text-sm text-amber-900">
                  <strong>Please note:</strong> Consumer rights (14-day returns) will not apply to your sales.
                  Buyers purchasing from private individuals are not entitled to the same protections as when buying from a trader.
                </p>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.disclaimerAcknowledged}
                    onChange={e => set({ disclaimerAcknowledged: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-gray-900"
                  />
                  <span className="text-sm text-amber-900">I understand and accept this</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!step1CanContinue}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isIndividual ? "Verify your identity" : "Business details"}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {isIndividual
              ? "Required by EU law. These details are kept private and never shown to buyers."
              : "Required by EU law. Your contact details may be displayed to buyers."}
          </p>
        </div>

        {isIndividual ? (
          <div className="space-y-4">
            <Field label="Full legal name" required>
              <input type="text" value={form.fullName} onChange={e => set({ fullName: e.target.value })}
                placeholder="As it appears on your ID" className={inputCls} />
            </Field>
            <Field label="Date of birth" required>
              <input type="date" value={form.dateOfBirth} onChange={e => set({ dateOfBirth: e.target.value })}
                max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                className={inputCls} />
            </Field>
            <Field label="Address line 1" required>
              <input type="text" value={form.addressLine1} onChange={e => set({ addressLine1: e.target.value })}
                placeholder="Street and number" className={inputCls} />
            </Field>
            <Field label="Address line 2">
              <input type="text" value={form.addressLine2} onChange={e => set({ addressLine2: e.target.value })}
                placeholder="Apartment, floor, etc." className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" required>
                <input type="text" value={form.city} onChange={e => set({ city: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Postal code" required>
                <input type="text" value={form.postalCode} onChange={e => set({ postalCode: e.target.value })} className={inputCls} />
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
                placeholder="+49 123 456 7890" className={inputCls} />
            </Field>
            <Field label="Contact email" required hint="Will be displayed to buyers on your shop page.">
              <input type="email" value={form.contactEmail} onChange={e => set({ contactEmail: e.target.value })}
                placeholder="contact@mybusiness.com" className={inputCls} />
            </Field>
            <div className="rounded-xl border border-gray-200 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.safetyCompliant}
                  onChange={e => set({ safetyCompliant: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-gray-900"
                />
                <span className="text-sm text-gray-700">
                  I certify that I will only sell products compliant with EU product safety regulations,
                  including CE marking requirements where applicable.
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setStep(1)}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Back
          </button>
          <button type="button" onClick={() => setStep(3)} disabled={!step2CanContinue}
            className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  const step3CanSubmit = Boolean(form.shopName.trim() && form.slug.trim() && form.country);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!step3CanSubmit) return;
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/seller/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setStep(1); // reset state (success screen shown below)
      router.push("/seller/dashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function renderStep3() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your shop</h1>
          <p className="mt-1.5 text-sm text-gray-500">Choose a name and URL for your shop. You can update these later.</p>
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
            <div className="flex rounded-lg border border-gray-300 shadow-sm focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900">
              <span className="flex items-center rounded-l-lg border-r border-gray-300 bg-gray-50 px-3 text-xs text-gray-500 select-none whitespace-nowrap">
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
            <select
              value={form.country}
              onChange={e => set({ country: e.target.value })}
              className={inputCls}
            >
              <option value="" disabled>Select your country</option>
              {EU_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {submitError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{submitError}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setStep(2)}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Back
          </button>
          <button type="submit" disabled={!step3CanSubmit || loading}
            className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
            {loading
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Opening shop…</span>
              : "Open my shop"}
          </button>
        </div>
      </form>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <StepIndicator current={step} />
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
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
        active ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <span className={active ? "text-gray-900" : "text-gray-400"}>{icon}</span>
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </button>
  );
}
