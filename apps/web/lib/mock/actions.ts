"use server";

import { revalidatePath } from "next/cache";
import { evaluateMockAnswer, generateMockQuestion, type MockTurn } from "@hirevault/ai-core";
import { createClient } from "@/lib/supabase/server";

export async function startMockSession(
  jobId: string | null,
  sessionType: "behavioral" | "technical" | "mixed",
  roleTitle?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let title = roleTitle ?? "General";
  let company = "";
  if (jobId) {
    const { data: job } = await supabase.from("jobs").select("title, company").eq("id", jobId).single();
    if (job) {
      title = job.title;
      company = job.company;
    }
  }

  const question = await generateMockQuestion(title, company || "Company", sessionType, []);

  const log: MockTurn[] = [
    {
      role: "interviewer",
      content: question,
      timestamp: new Date().toISOString(),
    },
  ];

  const { data, error } = await supabase
    .from("mock_sessions")
    .insert({
      user_id: user.id,
      job_id: jobId,
      session_type: sessionType,
      role_title: title,
      conversation_log: log,
      question_count: 1,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/mock");
  return { success: true, sessionId: data?.id, question };
}

export async function submitMockAnswer(sessionId: string, answer: string) {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("mock_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (!session) return { error: "Session not found" };

  const log = (session.conversation_log as MockTurn[]) ?? [];
  const lastQ = [...log].reverse().find((t) => t.role === "interviewer");
  if (!lastQ) return { error: "No active question" };

  log.push({
    role: "candidate",
    content: answer,
    timestamp: new Date().toISOString(),
  });

  const evalResult = await evaluateMockAnswer(
    lastQ.content,
    answer,
    session.session_type
  );

  const priorQs = log.filter((t) => t.role === "interviewer").map((t) => t.content);
  const nextQ = await generateMockQuestion(
    session.role_title ?? "Role",
    "Company",
    session.session_type as "behavioral" | "technical" | "mixed",
    priorQs
  );

  log.push({
    role: "interviewer",
    content: nextQ,
    timestamp: new Date().toISOString(),
  });

  const { error } = await supabase
    .from("mock_sessions")
    .update({
      conversation_log: log,
      feedback: evalResult.feedback.summary,
      feedback_json: evalResult.feedback,
      score: evalResult.feedback.score,
      question_count: priorQs.length + 1,
    })
    .eq("id", sessionId);

  if (error) return { error: error.message };
  revalidatePath("/mock");
  return {
    success: true,
    feedback: evalResult.feedback,
    nextQuestion: nextQ,
    degraded: evalResult.degraded,
  };
}

export async function endMockSession(sessionId: string) {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("mock_sessions")
    .select("conversation_log, conducted_at")
    .eq("id", sessionId)
    .single();
  if (!session) return { error: "Not found" };

  const started = new Date(session.conducted_at).getTime();
  const duration = Math.round((Date.now() - started) / 1000);

  await supabase
    .from("mock_sessions")
    .update({ duration_seconds: duration })
    .eq("id", sessionId);

  revalidatePath("/mock");
  return { success: true };
}
