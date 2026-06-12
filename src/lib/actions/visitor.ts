"use server";

import { cookies } from "next/headers";
import { isShippingCountry } from "@/lib/countries";
import { VISITOR_COUNTRY_COOKIE } from "@/lib/visitor-country";

// Persist the visitor's chosen shipping destination country (works anonymously).
export async function setVisitorCountry(code: string): Promise<{ ok: boolean }> {
  if (!isShippingCountry(code)) return { ok: false };
  const store = await cookies();
  store.set(VISITOR_COUNTRY_COOKIE, code, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return { ok: true };
}
