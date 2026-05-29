"use server";

import { revalidatePath } from "next/cache";
import {
  computeAtsScore,
  parseJobDescription,
  rewriteBullets,
  scoreExperiencesAgainstJd,
  type ResumeContent,
} from "@hirevault/ai-core";
import { renderResumeHtml } from "@hirevault/resume-templates";
import { createClient } from "@/lib/supabase/server";
import { requireProfileId, getProfileForUser } from "@/lib/profile/get-profile";
import { HtmlChromiumRenderer } from "@/lib/resumes/pdf";

async function loadProfileBundle(profileId: string) {
  const supabase = await createClient();
  const [exps, edus, skills] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", profileId),
    supabase.from("education").select("*").eq("profile_id", profileId),
    supabase.from("skills").select("name").eq("profile_id", profileId),
  ]);
  return {
    experiences: exps.data ?? [],
    education: edus.data ?? [],
    skills: (skills.data ?? []).map((s) => s.name),
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
          {
            target_roles: profile.target_roles,
            pitch: profile.pitch,
          }
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

  const headline =
    profile.pitch?.trim() ||
    (profile.target_roles?.length ? profile.target_roles.join(" · ") : undefined) ||
    profile.headline ||
    undefined;

  const content: ResumeContent = {
    headline,
    summary: profile.summary ?? undefined,
    experiences: tailoredExperiences,
    skills: bundle.skills,
  };

  const keywords = [
    ...(job.tech_stack ?? []),
    ...(job.required_qualifications ?? []),
  ];
  const ats = computeAtsScore(
    { summary: content.summary, experiences: tailoredExperiences },
    keywords
  );

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
      template_used: "ats",
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

export async function updateTailoredResumeContent(
  resumeId: string,
  content: ResumeContent,
  templateId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tailored_resumes")
    .update({ content, template_used: templateId })
    .eq("id", resumeId);
  if (error) return { error: error.message };
  revalidatePath("/resumes");
  return { success: true };
}

export async function exportResumeHtml(resumeId: string, templateId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("tailored_resumes").select("content").eq("id", resumeId).single();
  if (!data?.content) return { error: "Resume not found" };
  const html = renderResumeHtml(
    data.content as ResumeContent,
    templateId as "ats" | "modern" | "compact"
  );
  return { html };
}

export async function exportResumePdf(resumeId: string, templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data } = await supabase
    .from("tailored_resumes")
    .select("content, application_id")
    .eq("id", resumeId)
    .single();
  if (!data?.content) return { error: "Resume not found" };

  const content = data.content as ResumeContent;
  const tid = templateId as "ats" | "modern" | "compact";

  let pdf: Buffer;
  try {
    pdf = await new HtmlChromiumRenderer().renderToPdf(content, tid);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "PDF generation failed",
      degraded: true,
    };
  }

  const storagePath = `${user.id}/${resumeId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });

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

export async function getProfileIdForResume() {
  return requireProfileId();
}
