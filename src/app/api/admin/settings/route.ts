import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    labelCreationEnabled: z.boolean().optional(),
    integratedShippingEnabled: z.boolean().optional(),
  })
  .refine(
    (d) => d.labelCreationEnabled !== undefined || d.integratedShippingEnabled !== undefined,
    { message: "No setting provided." },
  );

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const data: { labelCreationEnabled?: boolean; integratedShippingEnabled?: boolean } = {};
  if (parsed.data.labelCreationEnabled !== undefined) data.labelCreationEnabled = parsed.data.labelCreationEnabled;
  if (parsed.data.integratedShippingEnabled !== undefined) data.integratedShippingEnabled = parsed.data.integratedShippingEnabled;

  const settings = await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });

  return NextResponse.json({
    labelCreationEnabled: settings.labelCreationEnabled,
    integratedShippingEnabled: settings.integratedShippingEnabled,
  });
}
