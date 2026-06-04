import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Browsers POST here when a CSP violation is detected (report-uri directive).
// Body is application/csp-report — a JSON object with a "csp-report" key.
export async function POST(req: Request) {
  try {
    const body = await req.json() as { "csp-report"?: Record<string, unknown> };
    const report = body["csp-report"] ?? body;
    console.warn("[CSP violation]", JSON.stringify(report));
  } catch {
    // Malformed report — ignore.
  }
  return new NextResponse(null, { status: 204 });
}
