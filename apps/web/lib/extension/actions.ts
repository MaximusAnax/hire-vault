"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateExtensionToken, hashExtensionToken } from "./auth";

export async function createExtensionToken(name?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceClient();
  if (!admin) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is missing in root .env. Add it and restart the dev server.",
    };
  }

  const raw = generateExtensionToken();
  const { error } = await admin.from("extension_tokens").insert({
    user_id: user.id,
    name: name?.trim() || "Chrome extension",
    token_hash: hashExtensionToken(raw),
  });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true, token: raw };
}

export async function revokeExtensionToken(tokenId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("extension_tokens").delete().eq("id", tokenId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function listExtensionTokens() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("extension_tokens")
    .select("id, name, last_used_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}
