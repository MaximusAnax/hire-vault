import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";
import { revalidateProfile } from "./shared";

function parseBullets(formData: FormData) {
  return (
    (formData.get("bullet_points") as string)
      ?.split("\n")
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

export async function createExperience(formData: FormData) {
  const supabase = await createClient();
  const profileId = await requireProfileId();

  const { error } = await supabase.from("experiences").insert({
    profile_id: profileId,
    company: formData.get("company") as string,
    title: formData.get("title") as string,
    location: (formData.get("location") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    is_current: formData.get("is_current") === "on",
    bullet_points: parseBullets(formData),
    source: "manual",
  });

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function deleteExperience(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("experiences").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function updateExperience(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("experiences")
    .update({
      company: formData.get("company") as string,
      title: formData.get("title") as string,
      location: (formData.get("location") as string) || null,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      is_current: formData.get("is_current") === "on",
      bullet_points: parseBullets(formData),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}
