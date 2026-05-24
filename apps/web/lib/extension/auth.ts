import { createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

export function hashExtensionToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateExtensionToken(): string {
  return `hv_${randomBytes(24).toString("hex")}`;
}

export async function getUserFromExtensionToken(
  bearer: string | null
): Promise<{ userId: string } | { error: string }> {
  if (!bearer?.startsWith("Bearer ")) {
    return { error: "Missing Authorization header" };
  }
  const raw = bearer.slice(7).trim();
  if (!raw) return { error: "Invalid token" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { error: "Server misconfigured (Supabase service role)" };
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tokenHash = hashExtensionToken(raw);
  const { data: row, error } = await admin
    .from("extension_tokens")
    .select("user_id, id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !row) return { error: "Invalid extension token" };

  await admin
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { userId: row.user_id as string };
}
