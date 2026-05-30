"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addressSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  line1: z.string().min(1, "Street is required").max(200),
  houseNumber: z.string().max(20).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().min(1, "City is required").max(100),
  postalCode: z.string().min(1, "Postal code is required").max(20),
  country: z.string().length(2, "Select a country"),
  phone: z.string().max(30).optional(),
});

type AddressData = z.infer<typeof addressSchema> & { id?: string };

export type BuyerAddressState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof addressSchema>, string[]>>;
  data?: AddressData;
} | null;

export async function saveBuyerAddress(
  _prev: BuyerAddressState,
  formData: FormData,
): Promise<BuyerAddressState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return { error: "User not found." };

  const parsed = addressSchema.safeParse({
    name: formData.get("name"),
    line1: formData.get("line1"),
    houseNumber: formData.get("houseNumber") || undefined,
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const existingId = formData.get("addressId")?.toString() ?? null;

  // Upsert: update existing default address in place, or create a new default.
  let savedId: string;
  if (existingId) {
    const existing = await prisma.address.findFirst({
      where: { id: existingId, userId: dbUser.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.address.update({
        where: { id: existingId },
        data: {
          name: parsed.data.name,
          line1: parsed.data.line1,
          houseNumber: parsed.data.houseNumber ?? null,
          line2: parsed.data.line2 ?? null,
          city: parsed.data.city,
          postalCode: parsed.data.postalCode,
          country: parsed.data.country,
          phone: parsed.data.phone ?? null,
          isDefault: true,
        },
      });
      savedId = existingId;
    } else {
      existingId; // not theirs — fall through to create
      savedId = await createDefault(dbUser.id, parsed.data);
    }
  } else {
    savedId = await createDefault(dbUser.id, parsed.data);
  }

  return {
    success: true,
    data: { ...parsed.data, id: savedId },
  };
}

async function createDefault(userId: string, data: z.infer<typeof addressSchema>): Promise<string> {
  const [, addr] = await prisma.$transaction([
    prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
    prisma.address.create({
      data: {
        userId,
        name: data.name,
        line1: data.line1,
        houseNumber: data.houseNumber ?? null,
        line2: data.line2 ?? null,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        phone: data.phone ?? null,
        isDefault: true,
      },
    }),
  ]);
  return addr.id;
}
