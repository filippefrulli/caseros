import { env } from "@/env";
import * as shippo from "@/lib/shippo";
import * as sendcloud from "@/lib/sendcloud";
import type {
  CreatedShipment,
  CreateShipmentParams,
  GetRatesParams,
  Rate,
  ShipmentStatus,
  ShippingProvider,
} from "@/lib/shipping/types";

export type {
  CreatedShipment,
  CreateShipmentParams,
  GetRatesParams,
  Rate,
  ShipmentStatus,
  ShippingAddress,
  ShippingProvider,
} from "@/lib/shipping/types";

// The active provider for NEW shipments (rate quotes + label creation). Existing
// labels are operated on via their stored provider (see getShipmentStatuses /
// cancelShipment / fetchLabelPdf below), so reverting this toggle never strands
// in-flight orders.
export function activeProvider(): ShippingProvider {
  return env.SHIPPING_PROVIDER;
}

function providerModule(provider: ShippingProvider) {
  return provider === "sendcloud" ? sendcloud : shippo;
}

// Normalize a possibly-null stored value to a concrete provider. Legacy orders
// created before this column existed are Shippo.
function resolveProvider(provider?: string | null): ShippingProvider {
  return provider === "sendcloud" ? "sendcloud" : "shippo";
}

export function isShippingConfigured(): boolean {
  return activeProvider() === "sendcloud"
    ? sendcloud.isSendcloudConfigured()
    : shippo.isShippoConfigured();
}

// ── Operations on the ACTIVE provider (new shipments) ───────────────────────

export async function getRates(params: GetRatesParams): Promise<Rate[]> {
  return providerModule(activeProvider()).getRates(params);
}

export async function createShipment(
  params: CreateShipmentParams,
): Promise<CreatedShipment & { provider: ShippingProvider }> {
  const provider = activeProvider();
  const shipment = await providerModule(provider).createShipment(params);
  return { ...shipment, provider };
}

// ── Operations on an EXISTING label's provider (per-order) ──────────────────

export async function getShipmentStatuses(
  provider: string | null | undefined,
  ids: string[],
): Promise<ShipmentStatus[]> {
  return providerModule(resolveProvider(provider)).getShipments(ids);
}

export async function cancelShipment(
  provider: string | null | undefined,
  transactionId: string,
): Promise<void> {
  return providerModule(resolveProvider(provider)).cancelShipment(transactionId);
}

export async function fetchLabelPdf(
  provider: string | null | undefined,
  labelUrl: string,
): Promise<Response> {
  return providerModule(resolveProvider(provider)).fetchLabelPdf(labelUrl);
}
