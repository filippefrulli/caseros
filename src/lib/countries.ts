// Destination countries offered for shipping selection and country filtering.
// EU + close neighbours the marketplace targets. Codes are ISO-2.
export const SHIPPING_COUNTRIES: { code: string; name: string }[] = [
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
  { code: "SE", name: "Sweden" },
];

const VALID_CODES = new Set(SHIPPING_COUNTRIES.map((c) => c.code));

export function isShippingCountry(code: string): boolean {
  return VALID_CODES.has(code);
}

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

// Human-readable country name for an ISO-2 code, with a static-list fallback.
export function countryName(code: string): string {
  const known = SHIPPING_COUNTRIES.find((c) => c.code === code);
  if (known) return known.name;
  return displayNames.of(code) ?? code;
}
