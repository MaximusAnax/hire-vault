"use server";

import { revalidatePath } from "next/cache";
import {
  computeAtsScore,
  parseJobDescription,
  rewriteBullets,
  scoreExperiencesAgainstJd,
  type ResumeContent,
} from "@hirevault/ai-core";
import { renderResumePdf, skillsToTechnicalSkillsTex } from "@hirevault/resume-templates";
import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/lib/profile/get-profile";
import type { Education, Experience, Leadership, Skill } from "@hirevault/types";

async function loadProfileBundle(profileId: string) {
  const supabase = await createClient();
  const [exps, edus, leadership, skills, profileRow] = await Promise.all([
    supabase
      .from("experiences")
      .select("*")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: false }),
    supabase.from("education").select("*").eq("profile_id", profileId),
    supabase
      .from("leadership")
      .select("*")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: false }),
    supabase.from("skills").select("*").eq("profile_id", profileId),
    supabase.from("profiles").select("*").eq("id", profileId).single(),
  ]);
  return {
    profile: profileRow.data,
    experiences: (exps.data ?? []) as Experience[],
    education: (edus.data ?? []) as Education[],
    leadership: (leadership.data ?? []) as Leadership[],
    skills: (skills.data ?? []) as Skill[],
  };
}

export async function tailorResumeForJob(jobId: string, applicationId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profile = await getProfileForUser();
  if (!profile) return { error: "Profile not found" };
  const bundle = await loadProfileBundle(profile.id);

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  if (!job) return { error: "Job not found" };

  const jdResult = job.description_raw
    ? await parseJobDescription(job.description_raw)
    : { data: job.description_parsed };
  const matches = scoreExperiencesAgainstJd(
    bundle.experiences.map((e) => ({
      id: e.id,
      company: e.company,
      title: e.title,
      bullet_points: e.bullet_points ?? [],
      technologies: e.technologies ?? [],
    })),
    jdResult.data as Parameters<typeof scoreExperiencesAgainstJd>[1],
    job.description_raw
  );

  const topExp = [...matches].sort((a, b) => b.score - a.score).slice(0, 4);
  const expIds = new Set(topExp.map((m) => m.experienceId));

  const tailoredExperiences = await Promise.all(
    bundle.experiences
      .filter((e) => expIds.has(e.id))
      .map(async (e) => {
        const rewrite = await rewriteBullets(
          e.bullet_points ?? [],
          `${job.title} at ${job.company}\n${(job.description_raw ?? "").slice(0, 4000)}`,
          { target_roles: profile.target_roles }
        );
        return {
          id: e.id,
          company: e.company,
          title: e.title,
          location: e.location,
          start_date: e.start_date,
          end_date: e.end_date,
          is_current: e.is_current,
          bullet_points: rewrite.bullets,
          technologies: e.technologies,
        };
      })
  );

  const content: ResumeContent = {
    headline:
      profile.target_roles?.length > 0
        ? profile.target_roles.join(" · ")
        : profile.headline ?? undefined,
    experiences: tailoredExperiences,
  };

  const keywords = [...(job.tech_stack ?? []), ...(job.required_qualifications ?? [])];
  const ats = computeAtsScore({ experiences: tailoredExperiences }, keywords);

  let appId = applicationId;
  if (!appId) {
    const { data: app } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .maybeSingle();
    appId = app?.id;
    if (!appId) {
      const { data: created } = await supabase
        .from("applications")
        .insert({ user_id: user.id, job_id: jobId, status: "saved" })
        .select("id")
        .single();
      appId = created?.id;
    }
  }

  if (!appId) return { error: "Could not link application" };

  const { count } = await supabase
    .from("tailored_resumes")
    .select("id", { count: "exact", head: true })
    .eq("application_id", appId);

  const { data: row, error } = await supabase
    .from("tailored_resumes")
    .insert({
      application_id: appId,
      job_id: jobId,
      user_id: user.id,
      content,
      template_used: "latex",
      version: (count ?? 0) + 1,
      label: `${job.title} v${(count ?? 0) + 1}`,
      ats_score: ats.score,
      match_summary: { matches: topExp },
      keyword_gaps: ats.keywordGaps,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/resumes");
  return { success: true, resumeId: row?.id, atsScore: ats.score };
}

export async function exportResumePdf(resumeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profile = await getProfileForUser();
  if (!profile) return { error: "Profile not found" };

  const [{ data: tailored }, bundle] = await Promise.all([
    supabase.from("tailored_resumes").select("content").eq("id", resumeId).single(),
    loadProfileBundle(profile.id),
  ]);

  if (!tailored?.content) return { error: "Resume not found" };

  const skillsTex =
    skillsToTechnicalSkillsTex(
      bundle.skills.map((s) => ({ name: s.name, category: s.category }))
    ) ||
    profile.technical_skills_tex?.trim() ||
    String.raw`     \textbf{Languages}{: Add skills in Profile (import resume or add tags).}`;

  let pdf: Buffer;
  try {
    pdf = await renderResumePdf({
      header: {
        full_name: profile.full_name?.trim() || "Professional",
        phone: profile.phone,
        email: profile.email,
        linkedin_url: profile.linkedin_url,
        github_url: profile.github_url,
      },
      technical_skills_tex: skillsTex,
      education: bundle.education.map((edu) => ({
        institution: edu.institution,
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        location: null,
        start_date: edu.start_date,
        expected_graduation: edu.expected_graduation,
        relevant_courses: edu.relevant_courses,
      })),
      experiences: bundle.experiences.map((e) => ({
        id: e.id,
        title: e.title,
        company: e.company,
        location: e.location,
        start_date: e.start_date,
        end_date: e.end_date,
        is_current: e.is_current,
        bullet_points: e.bullet_points ?? [],
      })),
      leadership: bundle.leadership.map((l) => ({
        organization: l.organization,
        title: l.title,
        location: l.location,
        start_date: l.start_date,
        end_date: l.end_date,
        is_current: l.is_current,
        bullet_points: l.bullet_points ?? [],
      })),
      tailored: tailored.content as ResumeContent,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "PDF generation failed",
      degraded: true,
    };
  }

  const storagePath = `${user.id}/${resumeId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, pdf, { contentType: "application/pdf", upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase
    .from("tailored_resumes")
    .update({ pdf_storage_path: storagePath })
    .eq("id", resumeId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/resumes");
  return { success: true, pdf_storage_path: storagePath };
}

export async function deleteTailoredResume(resumeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tailored_resumes").delete().eq("id", resumeId);
  if (error) return { error: error.message };
  revalidatePath("/resumes");
  return { success: true };
}

export async function getResumePdfDownloadUrl(resumeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: row } = await supabase
    .from("tailored_resumes")
    .select("pdf_storage_path, user_id")
    .eq("id", resumeId)
    .single();

  if (!row?.pdf_storage_path) return { error: "Export a PDF first" };
  if (row.user_id && row.user_id !== user.id) return { error: "Not authorized" };

  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(row.pdf_storage_path, 120);

  if (error || !data?.signedUrl) return { error: error?.message ?? "Could not create download link" };
  return { url: data.signedUrl };
}
