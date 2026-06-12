import { prisma } from "@/lib/prisma";

// Single-row platform settings (id = 1). Returns sensible defaults if the row
// hasn't been created yet (matches the Prisma schema defaults).
export async function getPlatformSettings() {
  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  return {
    labelCreationEnabled: settings?.labelCreationEnabled ?? false,
    integratedShippingEnabled: settings?.integratedShippingEnabled ?? false,
  };
}

// True when the integrated Shippo/Sendcloud flow is active. When false the
// marketplace runs in self-managed shipping mode (no rates/labels/tracking).
export async function isIntegratedShippingEnabled(): Promise<boolean> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: 1 },
    select: { integratedShippingEnabled: true },
  });
  return settings?.integratedShippingEnabled ?? false;
}
