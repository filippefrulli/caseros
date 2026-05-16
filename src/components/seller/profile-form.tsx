"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateSellerProfile, type ProfileState } from "@/lib/actions/seller";
import { Globe } from "lucide-react";

interface Props {
  bio: string | null;
  socialLinks: {
    website: string | null;
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    facebook: string | null;
    twitter: string | null;
    pinterest: string | null;
    linkedin: string | null;
  } | null;
}

const inputCls = "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";

const PLATFORMS = [
  { key: "website",   label: "Website",     placeholder: "https://yourwebsite.com" },
  { key: "instagram", label: "Instagram",   placeholder: "https://instagram.com/yourhandle" },
  { key: "tiktok",    label: "TikTok",      placeholder: "https://tiktok.com/@yourhandle" },
  { key: "youtube",   label: "YouTube",     placeholder: "https://youtube.com/@yourchannel" },
  { key: "facebook",  label: "Facebook",    placeholder: "https://facebook.com/yourpage" },
  { key: "twitter",   label: "X / Twitter", placeholder: "https://x.com/yourhandle" },
  { key: "pinterest", label: "Pinterest",   placeholder: "https://pinterest.com/yourprofile" },
  { key: "linkedin",  label: "LinkedIn",    placeholder: "https://linkedin.com/in/yourprofile" },
] as const;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

export function ProfileForm({ bio, socialLinks }: Props) {
  const [state, action, isPending] = useActionState<ProfileState, FormData>(
    updateSellerProfile,
    null,
  );

  const bioRef = useRef<HTMLTextAreaElement>(null);
  const bioLength = bioRef.current?.value.length ?? bio?.length ?? 0;

  // scroll to top on success so the banner is visible
  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.success) bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state?.success]);

  return (
    <form action={action} className="space-y-10">
      {state?.success && (
        <div ref={bannerRef} className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Profile saved successfully.
        </div>
      )}
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Bio */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-900">About your shop</h2>
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</label>
            <span className="text-xs text-gray-400">
              <span id="bio-count">{bio?.length ?? 0}</span> / 2000
            </span>
          </div>
          <textarea
            ref={bioRef}
            id="bio"
            name="bio"
            rows={6}
            maxLength={2000}
            defaultValue={bio ?? ""}
            placeholder="Tell buyers what makes your shop special, what you sell, your story…"
            className={inputCls}
            onInput={e => {
              const counter = document.getElementById("bio-count");
              if (counter) counter.textContent = String((e.target as HTMLTextAreaElement).value.length);
            }}
          />
          <FieldError messages={state?.fieldErrors?.bio} />
        </div>
      </section>

      {/* Social links */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Social links</h2>
        <p className="mb-4 text-xs text-gray-400">Paste the full URL to your profile on each platform.</p>
        <div className="space-y-3">
          {PLATFORMS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label htmlFor={key} className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <Globe size={14} className="shrink-0 text-gray-400" />
                {label}
              </label>
              <input
                type="url"
                id={key}
                name={key}
                defaultValue={socialLinks?.[key] ?? ""}
                placeholder={placeholder}
                className={inputCls}
              />
              <FieldError messages={state?.fieldErrors?.[key as keyof typeof state.fieldErrors]} />
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
