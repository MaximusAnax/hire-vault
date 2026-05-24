import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@hirevault/types";

export async function getProfileForUser(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function requireProfileId(): Promise<string> {
  const profile = await getProfileForUser();
  if (!profile) throw new Error("Profile not found");
  return profile.id;
}
