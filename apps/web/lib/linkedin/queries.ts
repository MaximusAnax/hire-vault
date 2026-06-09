import { createClient } from "@/lib/supabase/server";
import type { LinkedInConnection } from "@hirevault/types";

export async function getLinkedInConnection(
  profileId: string
): Promise<LinkedInConnection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_connections")
    .select("id, profile_id, linkedin_member_id, expires_at, created_at, updated_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) return null;
  return data as LinkedInConnection;
}

export async function getLinkedInConnectionWithTokens(
  profileId: string
): Promise<(LinkedInConnection & { access_token_enc: string; refresh_token_enc: string | null }) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_connections")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) return null;
  return data as LinkedInConnection & {
    access_token_enc: string;
    refresh_token_enc: string | null;
  };
}
