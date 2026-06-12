import { cookies, headers } from "next/headers";
import { isShippingCountry } from "@/lib/countries";

export const VISITOR_COUNTRY_COOKIE = "caseros_ship_country";

// The visitor's shipping destination country (ISO-2), used to filter listings to
// only those whose seller ships there. Works for anonymous visitors: prefers an
// explicit choice (cookie), falls back to the Vercel geo header, else null
// (no filter — show everything and prompt the visitor to choose).
export async function getVisitorCountry(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(VISITOR_COUNTRY_COOKIE)?.value;
  if (fromCookie && isShippingCountry(fromCookie)) return fromCookie;

  const h = await headers();
  const geo = h.get("x-vercel-ip-country");
  if (geo && isShippingCountry(geo)) return geo;

  return null;
}

// Whether the visitor has explicitly chosen a country (vs geo/none). Drives the
// first-visit prompt.
export async function hasChosenCountry(): Promise<boolean> {
  const cookieStore = await cookies();
  const v = cookieStore.get(VISITOR_COUNTRY_COOKIE)?.value;
  return !!v && isShippingCountry(v);
}
