import { env } from "@/env";

const BASE_URL = "https://api.goshippo.com";

export function isShippoConfigured(): boolean {
  return !!env.SHIPPO_API_KEY;
}

function authHeader(): string {
  if (!env.SHIPPO_API_KEY) throw new Error("Shippo not configured");
  return `ShippoToken ${env.SHIPPO_API_KEY}`;
}

async function shippoFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Shippo ${init?.method ?? "GET"} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export type ShippoAddress = {
  name: string;
  street1: string;
  street_no?: string;
  city: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
};

export type CreateShipmentParams = {
  orderNumber: string;
  toAddress: ShippoAddress;
  fromAddress: ShippoAddress;
  weightGrams: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
};

export type CreatedShipment = {
  id: string;
  trackingNumber: string;
  trackingUrl: string;
  labelDocumentLink: string;
};

export async function createShipment(params: CreateShipmentParams): Promise<CreatedShipment> {
  if (!isShippoConfigured()) throw new Error("Shippo not configured");

  // Step 1 — create shipment to get rates.
  const shipment = await shippoFetch("/shipments", {
    method: "POST",
    body: JSON.stringify({
      address_from: params.fromAddress,
      address_to: params.toAddress,
      parcels: [
        {
          weight: String(params.weightGrams),
          mass_unit: "g",
          ...(params.lengthCm && params.widthCm && params.heightCm
            ? {
                length: String(params.lengthCm),
                width: String(params.widthCm),
                height: String(params.heightCm),
                distance_unit: "cm",
              }
            : { length: "30", width: "20", height: "10", distance_unit: "cm" }),
        },
      ],
      async: false,
      metadata: params.orderNumber,
    }),
  }) as {
    object_id: string;
    rates: Array<{
      object_id: string;
      amount: string;
      currency: string;
      estimated_days: number;
    }>;
  };

  if (!shipment.rates?.length) {
    throw new Error("Shippo returned no available rates for this shipment.");
  }

  // Pick cheapest available rate.
  const cheapestRate = shipment.rates.reduce((best, r) =>
    parseFloat(r.amount) < parseFloat(best.amount) ? r : best,
  );

  // Step 2 — purchase label.
  const transaction = await shippoFetch("/transactions", {
    method: "POST",
    body: JSON.stringify({
      rate: cheapestRate.object_id,
      label_file_type: "PDF",
      async: false,
    }),
  }) as {
    object_id: string;
    status: string;
    tracking_number: string;
    tracking_url_provider: string;
    label_url: string;
    messages?: Array<{ text: string }>;
  };

  if (transaction.status !== "SUCCESS") {
    const msg = transaction.messages?.map((m) => m.text).join("; ") ?? transaction.status;
    throw new Error(`Shippo label purchase failed: ${msg}`);
  }

  return {
    id: transaction.object_id,
    trackingNumber: transaction.tracking_number,
    trackingUrl: transaction.tracking_url_provider,
    labelDocumentLink: transaction.label_url,
  };
}

export type ShipmentStatus = {
  id: string;
  trackingNumber: string;
  statusCode: string;
};

export async function getShipments(transactionIds: string[]): Promise<ShipmentStatus[]> {
  if (!isShippoConfigured()) throw new Error("Shippo not configured");
  if (transactionIds.length === 0) return [];

  const results = await Promise.all(
    transactionIds.map(async (id) => {
      const tx = await shippoFetch(`/transactions/${id}`) as {
        object_id: string;
        tracking_number: string;
        tracking_status?: { status: string };
      };
      return {
        id: tx.object_id,
        trackingNumber: tx.tracking_number,
        // Shippo status: UNKNOWN | PRE_TRANSIT | TRANSIT | DELIVERED | RETURNED | FAILURE
        statusCode: tx.tracking_status?.status ?? "UNKNOWN",
      };
    }),
  );

  return results;
}

export type ShippoRate = {
  objectId: string;
  provider: string;
  servicelevel: string;
  amount: string;
  currency: string;
  estimatedDays: number | null;
};

export async function getRates(params: {
  fromAddress: ShippoAddress;
  toAddress: ShippoAddress;
  weightGrams: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}): Promise<ShippoRate[]> {
  if (!isShippoConfigured()) throw new Error("Shippo not configured");

  const shipment = await shippoFetch("/shipments", {
    method: "POST",
    body: JSON.stringify({
      address_from: params.fromAddress,
      address_to: params.toAddress,
      parcels: [
        {
          weight: String(params.weightGrams),
          mass_unit: "g",
          ...(params.lengthCm && params.widthCm && params.heightCm
            ? {
                length: String(params.lengthCm),
                width: String(params.widthCm),
                height: String(params.heightCm),
                distance_unit: "cm",
              }
            : { length: "30", width: "20", height: "10", distance_unit: "cm" }),
        },
      ],
      async: false,
    }),
  }) as {
    rates: Array<{
      object_id: string;
      provider: string;
      servicelevel: { name: string };
      amount: string;
      currency: string;
      estimated_days: number | null;
    }>;
  };

  return (shipment.rates ?? [])
    .map((r) => ({
      objectId: r.object_id,
      provider: r.provider,
      servicelevel: r.servicelevel?.name ?? "",
      amount: r.amount,
      currency: r.currency,
      estimatedDays: r.estimated_days ?? null,
    }))
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
}

export async function cancelShipment(transactionId: string): Promise<void> {
  if (!isShippoConfigured()) throw new Error("Shippo not configured");
  await shippoFetch("/refunds", {
    method: "POST",
    body: JSON.stringify({ transaction: transactionId }),
  });
}
