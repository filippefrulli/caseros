import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { recordConsent } from "@/lib/consent";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { track } from "@vercel/analytics/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();
  let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;

  if (token_hash && type) {
    // Email confirmation opened in a different browser context (no PKCE cookie).
    // verifyOtp is stateless — no code verifier required.
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]["type"],
    });
    if (error || !data.user) {
      console.error("[auth/callback] verifyOtp failed:", error?.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
    user = data.user;
  } else if (code) {
    // Standard PKCE flow (OAuth or same-session email confirmation).
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      console.error("[auth/callback] exchangeCodeForSession failed:", error?.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
    user = data.user;
  } else {
    // No code or token — likely an expired link. If the user was trying to reset
    // their password, send them back to forgot-password with a clear message.
    const isReset = next.includes("reset-password");
    return NextResponse.redirect(
      isReset
        ? `${origin}/forgot-password?error=link_expired`
        : `${origin}/login?error=missing_code`,
    );
  }

  const { id, email, user_metadata } = user as { id: string; email: string; user_metadata: Record<string, unknown> };

  // Upsert into our users table — runs on every sign-in to keep profile data fresh.
  // Guard: if the account was previously deleted, sign out immediately rather than
  // restoring anonymised fields with fresh OAuth data.
  const existing = await prisma.user.findUnique({
    where: { supabaseId: id },
    select: { id: true, deletedAt: true },
  });
  if (existing?.deletedAt) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=account_deleted`);
  }

  const isNewUser = !existing;

  const profileData = {
    email: email!,
    name: (user_metadata?.full_name as string) ?? null,
    avatarUrl: (user_metadata?.avatar_url as string) ?? null,
  };

  let dbUser;
  try {
    dbUser = await prisma.user.upsert({
      where: { supabaseId: id },
      create: { supabaseId: id, ...profileData },
      update: profileData,
    });
  } catch (e: unknown) {
    // Race condition: two concurrent callbacks both saw no existing row and
    // both tried to INSERT. The second one hits the email unique constraint.
    // Recover by finding the row the winner created and updating it.
    if (
      e instanceof Error &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      const race = await prisma.user.findUnique({ where: { supabaseId: id } });
      if (!race) throw e;
      dbUser = await prisma.user.update({ where: { supabaseId: id }, data: profileData });
    } else {
      throw e;
    }
  }

  if (isNewUser) {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? headersList.get("x-real-ip")
      ?? null;
    const ua = headersList.get("user-agent") ?? null;
    await recordConsent(dbUser.id, "oauth_implicit", ip, ua);
    await track("user_registered", { method: "oauth" });
  }

  // Prevent open redirect — only allow same-origin relative paths.
  // `//evil.com` and `/\evil.com` are protocol-relative and would escape the origin.
  const isSafe =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  return NextResponse.redirect(`${origin}${isSafe ? next : "/"}`);
}
