import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  labelCreationEnabled: z.boolean(),
});

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

  const settings = await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1, labelCreationEnabled: parsed.data.labelCreationEnabled },
    update: { labelCreationEnabled: parsed.data.labelCreationEnabled },
  });

  return NextResponse.json({ labelCreationEnabled: settings.labelCreationEnabled });
}
