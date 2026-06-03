"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

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
    await prisma.user.upsert({
      where: { supabaseId: u.id },
      create: { supabaseId: u.id, email: u.email!, name: null, avatarUrl: null },
      update: {},
    });
    redirect("/");
  }

  return { success: "Check your inbox and click the confirmation link to finish signing up." };
}
