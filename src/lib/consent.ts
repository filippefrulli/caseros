import "server-only";
import { prisma } from "@/lib/prisma";

export const POLICY_VERSIONS = {
  terms_of_service: "2025-05",
  privacy_policy: "2025-05",
} as const;

type Method = "email_signup" | "oauth_implicit";

export async function recordConsent(
  userId: string,
  method: Method,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<void> {
  try {
    await prisma.userConsent.createMany({
      data: Object.entries(POLICY_VERSIONS).map(([policyType, policyVersion]) => ({
        userId,
        policyType,
        policyVersion,
        method,
        ipAddress,
        userAgent,
      })),
    });
  } catch (err) {
    // Non-fatal, a consent write failure must never block signup.
    console.error("[consent] failed to record consent for user", userId, err);
  }
}
