import { createHash, randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

export function hashExtensionToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateExtensionToken(): string {
  return `hv_${randomBytes(24).toString("hex")}`;
}

/** Strip whitespace, optional "Bearer " prefix, quotes, zero-width chars. */
export function normalizeExtensionToken(raw: string): string {
  return raw
    .trim()
    .replace(/^\s*bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

export async function getUserFromExtensionToken(
  bearer: string | null
): Promise<{ userId: string } | { error: string }> {
  if (!bearer?.startsWith("Bearer ")) {
    return { error: "Missing Authorization header" };
  }
  const raw = normalizeExtensionToken(bearer.slice(7));
  if (!raw) return { error: "Invalid token" };
  if (!raw.startsWith("hv_")) {
    return {
      error:
        "Token should start with hv_. Paste only the token from Settings (not your Supabase keys).",
    };
  }

  const admin = createServiceClient();
  if (!admin) {
    return {
      error:
        "Server misconfigured: set SUPABASE_SERVICE_ROLE_KEY in root .env and restart the app.",
    };
  }

  const tokenHash = hashExtensionToken(raw);
  const { data: row, error } = await admin
    .from("extension_tokens")
    .select("user_id, id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    const hint = error.message.includes("permission denied")
      ? " Run the latest Supabase migration (extension_tokens service_role grant) or execute: GRANT ALL ON public.extension_tokens TO service_role;"
      : "";
    return { error: `Token lookup failed: ${error.message}.${hint}` };
  }
  if (!row) {
    return {
      error:
        "Invalid extension token. Generate a new one in Settings → Chrome extension (same app URL as this popup), then paste it here.",
    };
  }

  await admin
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { userId: row.user_id as string };
}
