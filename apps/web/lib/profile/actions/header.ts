import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";
import { parseTargetRoles, revalidateProfile } from "./shared";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const profileId = await requireProfileId();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: (formData.get("full_name") as string) || null,
      email: (formData.get("email") as string) || null,
      location: (formData.get("location") as string) || null,
      phone: (formData.get("phone") as string) || null,
      linkedin_url: (formData.get("linkedin_url") as string) || null,
      github_url: (formData.get("github_url") as string) || null,
      portfolio_url: (formData.get("portfolio_url") as string) || null,
      target_roles: parseTargetRoles(formData.get("target_roles")),
    })
    .eq("id", profileId);

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}
