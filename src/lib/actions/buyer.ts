"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

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

async function resolveDbUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, dbUser: null };
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  return { user, dbUser };
}

export async function saveBuyerAddress(
  _prev: BuyerAddressState,
  formData: FormData,
): Promise<BuyerAddressState> {
  const { dbUser } = await resolveDbUser();
  if (!dbUser) return { error: "You must be signed in." };

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
          // Do NOT change isDefault — editing an address doesn't promote it
        },
      });
      savedId = existingId;
    } else {
      savedId = await createDefaultAddress(dbUser.id, parsed.data);
    }
  } else {
    savedId = await createDefaultAddress(dbUser.id, parsed.data);
  }

  revalidatePath("/account/address");
  return { success: true, data: { ...parsed.data, id: savedId } };
}

async function createDefaultAddress(userId: string, data: z.infer<typeof addressSchema>): Promise<string> {
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

export async function deleteBuyerAddress(addressId: string): Promise<{ error?: string }> {
  const { dbUser } = await resolveDbUser();
  if (!dbUser) return { error: "You must be signed in." };

  const addr = await prisma.address.findFirst({
    where: { id: addressId, userId: dbUser.id },
    select: { id: true, isDefault: true },
  });
  if (!addr) return { error: "Address not found." };

  await prisma.address.delete({ where: { id: addressId } });

  // If the deleted address was the default, promote the most recently created survivor
  if (addr.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  revalidatePath("/account/address");
  return {};
}

export async function setDefaultBuyerAddress(addressId: string): Promise<{ error?: string }> {
  const { dbUser } = await resolveDbUser();
  if (!dbUser) return { error: "You must be signed in." };

  const addr = await prisma.address.findFirst({
    where: { id: addressId, userId: dbUser.id },
    select: { id: true },
  });
  if (!addr) return { error: "Address not found." };

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: dbUser.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ]);

  revalidatePath("/account/address");
  return {};
}
