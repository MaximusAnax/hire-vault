"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";

function revalidateProfile() {
  revalidatePath("/profile");
}

function parseTargetRoles(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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
      technical_skills_tex: (formData.get("technical_skills_tex") as string) || null,
    })
    .eq("id", profileId);

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function createExperience(formData: FormData) {
  const supabase = await createClient();
  const profileId = await requireProfileId();
  const bullets =
    (formData.get("bullet_points") as string)
      ?.split("\n")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const { error } = await supabase.from("experiences").insert({
    profile_id: profileId,
    company: formData.get("company") as string,
    title: formData.get("title") as string,
    location: (formData.get("location") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    is_current: formData.get("is_current") === "on",
    bullet_points: bullets,
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

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const profileId = await requireProfileId();
  const tech =
    (formData.get("technologies") as string)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const { error } = await supabase.from("projects").insert({
    profile_id: profileId,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    url: (formData.get("url") as string) || null,
    github_url: (formData.get("github_url") as string) || null,
    technologies: tech,
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

export async function createLeadership(formData: FormData) {
  const supabase = await createClient();
  const profileId = await requireProfileId();
  const bullets =
    (formData.get("bullet_points") as string)
      ?.split("\n")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const { error } = await supabase.from("leadership").insert({
    profile_id: profileId,
    organization: formData.get("organization") as string,
    title: formData.get("title") as string,
    location: (formData.get("location") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    is_current: formData.get("is_current") === "on",
    bullet_points: bullets,
    source: "manual",
  });

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function deleteLeadership(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("leadership").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function updateExperience(id: string, formData: FormData) {
  const supabase = await createClient();
  const bullets =
    (formData.get("bullet_points") as string)
      ?.split("\n")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const { error } = await supabase
    .from("experiences")
    .update({
      company: formData.get("company") as string,
      title: formData.get("title") as string,
      location: (formData.get("location") as string) || null,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      is_current: formData.get("is_current") === "on",
      bullet_points: bullets,
    })
    .eq("id", id);

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
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient();
  const tech =
    (formData.get("technologies") as string)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const { error } = await supabase
    .from("projects")
    .update({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      url: (formData.get("url") as string) || null,
      github_url: (formData.get("github_url") as string) || null,
      technologies: tech,
    })
    .eq("id", id);

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

export async function updateLeadership(id: string, formData: FormData) {
  const supabase = await createClient();
  const bullets =
    (formData.get("bullet_points") as string)
      ?.split("\n")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const { error } = await supabase
    .from("leadership")
    .update({
      organization: formData.get("organization") as string,
      title: formData.get("title") as string,
      location: (formData.get("location") as string) || null,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      is_current: formData.get("is_current") === "on",
      bullet_points: bullets,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateProfile();
  return { success: true };
}

export type DeleteAction = (id: string) => Promise<{ error?: string; success?: boolean }>;
