import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { recordConsent } from "@/lib/consent";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { id, email, user_metadata } = data.user;

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

  const dbUser = await prisma.user.upsert({
    where: { supabaseId: id },
    create: {
      supabaseId: id,
      email: email!,
      name: (user_metadata?.full_name as string) ?? null,
      avatarUrl: (user_metadata?.avatar_url as string) ?? null,
    },
    update: {
      email: email!,
      name: (user_metadata?.full_name as string) ?? null,
      avatarUrl: (user_metadata?.avatar_url as string) ?? null,
    },
  });

  if (isNewUser) {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? headersList.get("x-real-ip")
      ?? null;
    const ua = headersList.get("user-agent") ?? null;
    await recordConsent(dbUser.id, "oauth_implicit", ip, ua);
  }

  // Prevent open redirect — only allow same-origin relative paths.
  // `//evil.com` and `/\evil.com` are protocol-relative and would escape the origin.
  const isSafe =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  return NextResponse.redirect(`${origin}${isSafe ? next : "/"}`);
}
