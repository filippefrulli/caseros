import { env } from "@/env";
import type {
  CreatedShipment,
  CreateShipmentParams,
  GetRatesParams,
  Rate,
  ShipmentStatus,
  ShippingAddress,
} from "@/lib/shipping/types";

// Sendcloud Public REST API v3. Centralized marketplace model: Caseros holds a
// single account and creates labels on behalf of sellers, passing each seller's
// pickup address as the per-shipment `from_address` (so an Irish origin ships
// without the account's default sender address — provided the account/carrier
// contract supports that origin).
//
// NOTE: this account is v3-only (v2 POST /parcels returns 403). Endpoints and
// field names below follow the v3 reference.
const BASE_URL = "https://panel.sendcloud.sc/api/v3";

export function isSendcloudConfigured(): boolean {
  return !!env.SENDCLOUD_PUBLIC_KEY && !!env.SENDCLOUD_PRIVATE_KEY;
}

function authHeader(): string {
  if (!isSendcloudConfigured()) throw new Error("Sendcloud not configured");
  const token = Buffer.from(
    `${env.SENDCLOUD_PUBLIC_KEY}:${env.SENDCLOUD_PRIVATE_KEY}`,
  ).toString("base64");
  return `Basic ${token}`;
}

async function sendcloudFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Sendcloud ${init?.method ?? "GET"} ${path} failed (${res.status}): ${text}`);
  }
  // 204/empty bodies (e.g. cancel) — guard against JSON parse errors.
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// Sendcloud expects weight as a string; v3 takes an explicit unit.
function gramsToKg(grams: number): string {
  return (Math.max(grams, 1) / 1000).toFixed(3);
}

// Map our internal address onto a v3 address object.
function toV3Address(a: ShippingAddress) {
  return {
    name: a.name,
    address_line_1: a.street1,
    house_number: a.street_no ?? "",
    postal_code: a.zip,
    city: a.city,
    country_code: a.country,
    phone_number: a.phone ?? "",
    email: a.email ?? "",
  };
}

type V3ShippingOption = {
  code: string;
  carrier?: { code?: string; name?: string };
  product?: { code?: string; name?: string };
  quotes?: Array<{ price?: { total?: { value?: string | number; currency?: string } } }>;
};

async function fetchShippingOptions(params: {
  fromAddress: ShippingAddress;
  toAddress: ShippingAddress;
  weightKg: string;
}): Promise<V3ShippingOption[]> {
  const data = (await sendcloudFetch("/fetch-shipping-options", {
    method: "POST",
    body: JSON.stringify({
      from_country_code: params.fromAddress.country,
      to_country_code: params.toAddress.country,
      from_postal_code: params.fromAddress.zip,
      to_postal_code: params.toAddress.zip,
      weight: { value: params.weightKg, unit: "kg" },
    }),
  })) as { data?: V3ShippingOption[] };
  return data.data ?? [];
}

function optionPrice(o: V3ShippingOption): { amount: string; currency: string } {
  const total = o.quotes?.[0]?.price?.total;
  const value = total?.value;
  return {
    amount: value != null ? Number(value).toFixed(2) : "0.00",
    currency: total?.currency ?? "EUR",
  };
}

function optionToRate(o: V3ShippingOption): Rate {
  const { amount, currency } = optionPrice(o);
  return {
    objectId: o.code,
    provider: o.carrier?.code ?? "",
    servicelevel: o.product?.name ?? o.product?.code ?? o.code,
    amount,
    currency,
    estimatedDays: null,
  };
}

export async function getRates(params: GetRatesParams): Promise<Rate[]> {
  if (!isSendcloudConfigured()) throw new Error("Sendcloud not configured");

  const options = await fetchShippingOptions({
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
    weightKg: gramsToKg(params.weightGrams),
  });

  return options
    .map(optionToRate)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
}

export async function createShipment(params: CreateShipmentParams): Promise<CreatedShipment> {
  if (!isSendcloudConfigured()) throw new Error("Sendcloud not configured");

  const options = await fetchShippingOptions({
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
    weightKg: gramsToKg(params.weightGrams),
  });

  if (options.length === 0) {
    throw new Error("Sendcloud returned no available shipping options for this shipment.");
  }

  // Honour the buyer's checkout choice (carrier + service name), else cheapest.
  const cheapest = options.reduce((best, o) =>
    parseFloat(optionPrice(o).amount) < parseFloat(optionPrice(best).amount) ? o : best,
  );
  const preferred =
    params.preferredProvider && params.preferredServiceLevel
      ? options.find(
          (o) =>
            o.carrier?.code === params.preferredProvider &&
            (o.product?.name ?? o.product?.code ?? o.code) === params.preferredServiceLevel,
        )
      : undefined;
  const chosen = preferred ?? cheapest;

  // Create + announce synchronously so the label is returned in one call.
  const res = (await sendcloudFetch("/shipments/announce", {
    method: "POST",
    body: JSON.stringify({
      label_details: { mime_type: "application/pdf" },
      from_address: toV3Address(params.fromAddress),
      to_address: toV3Address(params.toAddress),
      ship_with: {
        type: "shipping_option_code",
        properties: { shipping_option_code: chosen.code },
      },
      order_number: params.orderNumber,
      parcels: [{ weight: { value: gramsToKg(params.weightGrams), unit: "kg" } }],
    }),
  })) as {
    data?: {
      id?: string | number;
      parcels?: Array<{
        id?: number;
        status?: { code?: string; message?: string };
        tracking_number?: string;
        tracking_url?: string;
        documents?: Array<{ type?: string; link?: string }>;
      }>;
    };
  };

  const shipment = res.data;
  const parcel = shipment?.parcels?.[0];
  if (!shipment?.id || !parcel) {
    throw new Error("Sendcloud announce returned no shipment/parcel.");
  }
  const failed = /FAIL|ERROR|CANCEL/i.test(parcel.status?.code ?? "");
  if (failed) {
    throw new Error(`Sendcloud announce failed: ${parcel.status?.message ?? parcel.status?.code}`);
  }

  const labelDoc = parcel.documents?.find((d) => d.type === "label") ?? parcel.documents?.[0];
  const labelLink = labelDoc?.link
    ?? (parcel.id ? `${BASE_URL}/parcels/${parcel.id}/documents/label` : undefined);
  if (!labelLink) {
    throw new Error("Sendcloud announce returned no label document.");
  }

  return {
    // Shipment id drives cancellation; tracking is done via the tracking number.
    id: String(shipment.id),
    trackingNumber: parcel.tracking_number ?? "",
    trackingUrl: parcel.tracking_url ?? "",
    labelDocumentLink: labelLink,
  };
}

// Map a Sendcloud v3 parcel status code onto the Shippo-style normalized codes
// the tracking-sync cron expects. Only DELIVERED triggers downstream effects.
// NOTE: the exact delivered code should be confirmed against a real carrier
// delivery — the free `sendcloud:letter` test option never reports tracking.
function normalizeStatus(code: string | undefined): string {
  const c = (code ?? "").toUpperCase();
  if (c.includes("DELIVERED")) return "DELIVERED";
  if (c.includes("RETURN")) return "RETURNED";
  if (c.includes("FAIL") || c.includes("ERROR") || c.includes("CANCEL")) return "FAILURE";
  if (c.includes("READY") || c.includes("ANNOUNCED")) return "PRE_TRANSIT";
  if (!c) return "UNKNOWN";
  return "TRANSIT";
}

// Status is read from the shipment (GET /shipments/{id}); the tracking-number
// endpoint 404s until a carrier scans the parcel, so it's not the source here.
// `ids` are the stored shipment ids (shippingTransactionId).
export async function getShipments(ids: string[]): Promise<ShipmentStatus[]> {
  if (!isSendcloudConfigured()) throw new Error("Sendcloud not configured");
  if (ids.length === 0) return [];

  return Promise.all(
    ids.map(async (id) => {
      try {
        const res = (await sendcloudFetch(`/shipments/${encodeURIComponent(id)}`)) as {
          data?: { parcels?: Array<{ status?: { code?: string }; tracking_number?: string }> };
        };
        const parcel = res.data?.parcels?.[0];
        // Echo the input id so the cron can match results back to orders.
        return {
          id,
          trackingNumber: parcel?.tracking_number ?? "",
          statusCode: normalizeStatus(parcel?.status?.code),
        };
      } catch (err) {
        // Don't let one bad lookup fail the whole batch.
        console.error(`[sendcloud] status lookup failed for shipment ${id}:`, err);
        return { id, trackingNumber: "", statusCode: "UNKNOWN" };
      }
    }),
  );
}

export async function cancelShipment(shipmentId: string): Promise<void> {
  if (!isSendcloudConfigured()) throw new Error("Sendcloud not configured");
  await sendcloudFetch(`/shipments/${encodeURIComponent(shipmentId)}/cancel`, { method: "POST" });
}

// Sendcloud label documents require Basic auth and a PDF Accept header.
export async function fetchLabelPdf(labelUrl: string): Promise<Response> {
  return fetch(labelUrl, {
    headers: { Authorization: authHeader(), Accept: "application/pdf" },
  });
}
