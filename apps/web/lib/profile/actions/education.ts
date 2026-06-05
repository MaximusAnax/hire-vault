import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";
import { revalidateProfile } from "./shared";

export async function createEducation(formData: FormData) {
  const supabase = await createClient();
  const profileId = await requireProfileId();

  const { error } = await supabase.from("education").insert({
    profile_id: profileId,
    institution: formData.get("institution") as string,
    degree: (formData.get("degree") as string) || null,
    field_of_study: (formData.get("field_of_study") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    expected_graduation: (formData.get("expected_graduation") as string) || null,
    gpa: formData.get("gpa") ? Number(formData.get("gpa")) : null,
    source: "manual",
  });

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function deleteEducation(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("education").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function updateEducation(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("education")
    .update({
      institution: formData.get("institution") as string,
      degree: (formData.get("degree") as string) || null,
      field_of_study: (formData.get("field_of_study") as string) || null,
      start_date: (formData.get("start_date") as string) || null,
      expected_graduation: (formData.get("expected_graduation") as string) || null,
      gpa: formData.get("gpa") ? Number(formData.get("gpa")) : null,
      relevant_courses: (formData.get("relevant_courses") as string)
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}
