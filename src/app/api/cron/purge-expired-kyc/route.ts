import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by Vercel Cron (see vercel.json). Purges SellerKyc records whose
// AML retention period has expired (retainUntil < now). These were stamped
// at account-deletion time with a 6-year deadline per EU 6AMLD / Irish CJA
// 2010 s.55, which requires 5 years retention after the relationship ends.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.sellerKyc.deleteMany({
    where: { retainUntil: { lt: new Date() } },
  });

  console.log(`[cron] purge-expired-kyc: deleted ${result.count} expired KYC records`);
  return NextResponse.json({ deleted: result.count });
}
