"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { recordConsent } from "@/lib/consent";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { track } from "@vercel/analytics/server";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const emailSchema = z.string().email("Enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export type AuthActionState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string[]>>;
  success?: string;
} | null;

export async function signInWithEmail(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const next = formData.get("next")?.toString() ?? "/";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Incorrect email or password." };
  }

  const { user } = data;
  await prisma.user.upsert({
    where: { supabaseId: user.id },
    create: {
      supabaseId: user.id,
      email: user.email!,
      name: (user.user_metadata?.full_name as string) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
    },
    update: { email: user.email! },
  });

  // Prevent open redirect — protocol-relative URLs would escape our origin.
  const isSafe =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  redirect((isSafe ? next : "/") as "/");
}

export async function signUpWithEmail(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { error: error.message };
  }

  // Email confirmation disabled — user is immediately active
  if (data.session && data.user) {
    const u = data.user;
    const dbUser = await prisma.user.upsert({
      where: { supabaseId: u.id },
      create: { supabaseId: u.id, email: u.email!, name: null, avatarUrl: null },
      update: {},
    });
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? headersList.get("x-real-ip")
      ?? null;
    const ua = headersList.get("user-agent") ?? null;
    await recordConsent(dbUser.id, "email_signup", ip, ua);
    await track("user_registered", { method: "email" });
    redirect("/");
  }

  return { success: "Check your inbox and click the confirmation link to finish signing up." };
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email")?.toString().trim());

  if (!parsed.success) {
    return { fieldErrors: { email: parsed.error.flatten().formErrors } };
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always return success to avoid leaking whether the email exists.
  return {
    success: "If an account exists for that email, you'll receive a reset link in the next few minutes. Check your spam folder if you don't see it.",
  };
}

export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordSchema.safeParse(formData.get("password")?.toString());

  if (!parsed.success) {
    return { fieldErrors: { password: parsed.error.flatten().formErrors } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });

  if (error) {
    return { error: "Failed to update password. Your reset link may have expired — please request a new one." };
  }

  redirect("/login");
}
