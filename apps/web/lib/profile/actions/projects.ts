import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";
import { revalidateProfile } from "./shared";

function parseTechnologies(formData: FormData) {
  return (
    (formData.get("technologies") as string)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const profileId = await requireProfileId();

  const { error } = await supabase.from("projects").insert({
    profile_id: profileId,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    url: (formData.get("url") as string) || null,
    github_url: (formData.get("github_url") as string) || null,
    technologies: parseTechnologies(formData),
    source: "manual",
  });

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      url: (formData.get("url") as string) || null,
      github_url: (formData.get("github_url") as string) || null,
      technologies: parseTechnologies(formData),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}
