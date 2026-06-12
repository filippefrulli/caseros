// Shared metadata for the admin "send a test email" tool. Imported by both the
// API route (for validation) and the admin UI (to render a button per email).
export type TestEmailTemplate = {
  key: string;
  label: string;
  description: string;
  audience: "buyer" | "seller" | "admin";
};

export const TEST_EMAIL_TEMPLATES = [
  {
    key: "order-confirmed",
    label: "Order confirmed",
    description: "Buyer receipt sent right after checkout.",
    audience: "buyer",
  },
  {
    key: "order-shipped",
    label: "Order shipped",
    description: "Buyer notice when an order ships (includes sample tracking).",
    audience: "buyer",
  },
  {
    key: "order-delivered",
    label: "Order delivered",
    description: "Buyer notice when an order is marked delivered.",
    audience: "buyer",
  },
  {
    key: "new-order",
    label: "New order (seller)",
    description: "Seller alert when they receive an order.",
    audience: "seller",
  },
  {
    key: "payout-released",
    label: "Payout released",
    description: "Seller notice when a payout is released.",
    audience: "seller",
  },
  {
    key: "admin-new-order",
    label: "Admin: new order",
    description: "Admin alert on every order. Always sent to ADMIN_EMAIL.",
    audience: "admin",
  },
  {
    key: "admin-seller-application",
    label: "Admin: seller application",
    description: "Admin alert on a new seller application. Always sent to ADMIN_EMAIL.",
    audience: "admin",
  },
] as const satisfies readonly TestEmailTemplate[];

export type TestEmailKey = (typeof TEST_EMAIL_TEMPLATES)[number]["key"];

export const TEST_EMAIL_KEYS = TEST_EMAIL_TEMPLATES.map((t) => t.key) as [
  TestEmailKey,
  ...TestEmailKey[],
];
