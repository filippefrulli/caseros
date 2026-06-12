// Provider-agnostic shipping types shared by the Shippo and Sendcloud
// implementations and the dispatcher in `src/lib/shipping.ts`.

export type ShippingProvider = "shippo" | "sendcloud";

export type ShippingAddress = {
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
  toAddress: ShippingAddress;
  fromAddress: ShippingAddress;
  weightGrams: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  // Preferred carrier/service snapshotted from the buyer's rate choice at
  // checkout. When set, label generation picks this service over the cheapest.
  preferredProvider?: string | null;
  preferredServiceLevel?: string | null;
};

export type CreatedShipment = {
  id: string;
  trackingNumber: string;
  trackingUrl: string;
  labelDocumentLink: string;
};

// Normalized tracking status. Both providers map onto the Shippo-style codes:
// UNKNOWN | PRE_TRANSIT | TRANSIT | DELIVERED | RETURNED | FAILURE
export type ShipmentStatus = {
  id: string;
  trackingNumber: string;
  statusCode: string;
};

export type Rate = {
  objectId: string;
  provider: string;
  servicelevel: string;
  amount: string;
  currency: string;
  estimatedDays: number | null;
};

export type GetRatesParams = {
  fromAddress: ShippingAddress;
  toAddress: ShippingAddress;
  weightGrams: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
};
