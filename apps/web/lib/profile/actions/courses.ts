import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";
import { revalidateProfile } from "./shared";

export async function createCourse(formData: FormData) {
  const supabase = await createClient();
  const profileId = await requireProfileId();

  const { error } = await supabase.from("courses").insert({
    profile_id: profileId,
    name: formData.get("name") as string,
    institution: (formData.get("institution") as string) || null,
    completion_date: (formData.get("completion_date") as string) || null,
    credential_url: (formData.get("credential_url") as string) || null,
    source: "manual",
  });

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function deleteCourse(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function updateCourse(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      name: formData.get("name") as string,
      institution: (formData.get("institution") as string) || null,
      completion_date: (formData.get("completion_date") as string) || null,
      credential_url: (formData.get("credential_url") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}
