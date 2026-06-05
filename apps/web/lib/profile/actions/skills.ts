import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";
import { revalidateProfile } from "./shared";

export async function createSkill(formData: FormData) {
  const supabase = await createClient();
  const profileId = await requireProfileId();

  const { error } = await supabase.from("skills").insert({
    profile_id: profileId,
    name: formData.get("name") as string,
    category:
      (formData.get("category") as "language" | "framework" | "tool" | "soft_skill") ||
      "tool",
    proficiency_level: formData.get("proficiency_level")
      ? Number(formData.get("proficiency_level"))
      : null,
    source: "manual",
  });

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function deleteSkill(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("skills").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function updateSkill(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("skills")
    .update({
      name: formData.get("name") as string,
      category:
        (formData.get("category") as "language" | "framework" | "tool" | "soft_skill") ||
        "tool",
      proficiency_level: formData.get("proficiency_level")
        ? Number(formData.get("proficiency_level"))
        : null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}
