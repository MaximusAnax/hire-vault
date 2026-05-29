"use server";

import { revalidatePath } from "next/cache";
import {
  generateInterviewQuestions,
  personalizeAnswer,
  refineAnswer,
  technicalPrepTopics,
} from "@hirevault/ai-core";
import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/lib/profile/get-profile";

export async function generateQuestionsForJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  if (!job?.description_raw && !job?.title) {
    return { error: "Job needs a description to generate questions" };
  }

  const text = job.description_raw ?? `${job.title} at ${job.company}`;

  const { data: existingRows } = await supabase
    .from("interview_questions")
    .select("question")
    .eq("job_id", jobId);
  const existingQuestions = (existingRows ?? [])
    .map((row) => row.question)
    .filter((q): q is string => typeof q === "string" && q.length > 0);

  const result = await generateInterviewQuestions(text, 10, existingQuestions);
  const topics = technicalPrepTopics(job.tech_stack ?? [], text);

  if (result.questions.length === 0) {
    return {
      success: true,
      count: 0,
      degraded: result.degraded,
      message: "No new questions were generated (existing bank may already cover the JD).",
    };
  }

  const rows = result.questions.map((q) => ({
    job_id: jobId,
    user_id: user.id,
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    technical_topics: q.technical_topics ?? topics.slice(0, 3),
  }));

  const { error } = await supabase.from("interview_questions").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/interviews");
  return { success: true, count: rows.length, degraded: result.degraded };
}

export async function personalizeQuestionAnswer(questionId: string) {
  const supabase = await createClient();
  const profile = await getProfileForUser();
  if (!profile) return { error: "Profile required" };

  const { data: q } = await supabase
    .from("interview_questions")
    .select("*, jobs(title, company, description_raw)")
    .eq("id", questionId)
    .single();
  if (!q) return { error: "Question not found" };

  const [exps, projects, skills] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", profile.id),
    supabase.from("projects").select("*").eq("profile_id", profile.id),
    supabase.from("skills").select("*").eq("profile_id", profile.id),
  ]);

  const profileJson = JSON.stringify({
    profile,
    experiences: exps.data,
    projects: projects.data,
    skills: skills.data,
  });
  const job = q.jobs as { title: string; company: string; description_raw: string | null };
  const result = await personalizeAnswer(
    q.question,
    profileJson,
    `${job?.title} @ ${job?.company}\n${job?.description_raw ?? ""}`
  );

  const { error } = await supabase
    .from("interview_questions")
    .update({ personalized_answer: result.answer })
    .eq("id", questionId);

  if (error) return { error: error.message };
  revalidatePath("/interviews");
  return { success: true, answer: result.answer, degraded: result.degraded };
}

export async function refineQuestionAnswer(questionId: string, draft: string, feedback?: string) {
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("interview_questions")
    .select("question")
    .eq("id", questionId)
    .single();
  if (!q) return { error: "Not found" };

  const result = await refineAnswer(q.question, draft, feedback);
  const { error } = await supabase
    .from("interview_questions")
    .update({ personalized_answer: result.answer })
    .eq("id", questionId);
  if (error) return { error: error.message };
  revalidatePath("/interviews");
  return { success: true, answer: result.answer };
}

export async function ratePractice(questionId: string, rating: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("interview_questions")
    .update({
      practice_rating: rating,
      practiced: true,
      practiced_at: new Date().toISOString(),
    })
    .eq("id", questionId);
  if (error) return { error: error.message };
  revalidatePath("/interviews");
  return { success: true };
}

export async function updateSelfNotes(questionId: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("interview_questions")
    .update({ self_notes: notes })
    .eq("id", questionId);
  if (error) return { error: error.message };
  revalidatePath("/interviews");
  return { success: true };
}

export async function deleteQuestion(questionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("interview_questions")
    .delete()
    .eq("id", questionId);
  if (error) return { error: error.message };
  revalidatePath("/interviews");
  return { success: true };
}

export async function fetchCompanyResearch(companyName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const summary = `Research stub for ${companyName}: Review the careers page, recent news, product mission, and values. Configure a news API key in a future release for live summaries.`;

  const { data, error } = await supabase
    .from("company_research")
    .upsert(
      {
        user_id: user.id,
        company_name: companyName,
        summary,
        sources: [{ type: "stub", note: "Manual research recommended" }],
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,company_name" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/interviews");
  return { success: true, research: data };
}
