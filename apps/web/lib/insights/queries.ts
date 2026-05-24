import { createClient } from "@/lib/supabase/server";
import { getApplicationStats } from "@/lib/applications/queries";
import {
  analyzeProfileStrength,
  analyzeSkillGaps,
  interviewPerformanceTrend,
  recommendApplicationStrategy,
} from "@hirevault/ai-core";
import { getProfileForUser } from "@/lib/profile/get-profile";

export async function getDashboardInsights() {
  const supabase = await createClient();
  const profile = await getProfileForUser();
  const stats = await getApplicationStats();

  let profileStrength = null;
  let skillGaps: ReturnType<typeof analyzeSkillGaps> = [];

  if (profile) {
    const [exps, edus, projects, skills, jobs] = await Promise.all([
      supabase.from("experiences").select("*").eq("profile_id", profile.id),
      supabase.from("education").select("*").eq("profile_id", profile.id),
      supabase.from("projects").select("*").eq("profile_id", profile.id),
      supabase.from("skills").select("name").eq("profile_id", profile.id),
      supabase.from("jobs").select("tech_stack").limit(30),
    ]);

    profileStrength = analyzeProfileStrength({
      headline: profile.headline,
      summary: profile.summary,
      experiences: exps.data ?? [],
      education: edus.data ?? [],
      projects: projects.data ?? [],
      skills: skills.data ?? [],
    });

    skillGaps = analyzeSkillGaps(
      (skills.data ?? []).map((s) => s.name),
      (jobs.data ?? []).map((j) => j.tech_stack ?? [])
    );
  }

  const by = stats.byStatus;
  const strategies = recommendApplicationStrategy({
    total: stats.total,
    applied: stats.applied,
    screening: by.screening ?? 0,
    interview: by.interview ?? 0,
    offer: by.offer ?? 0,
    rejected: by.rejected ?? 0,
    responseRate: stats.responseRate,
    velocity30d: stats.velocity30d,
  });

  const { data: practiced } = await supabase
    .from("interview_questions")
    .select("practiced, practice_rating")
    .eq("practiced", true);

  const practiceAvg =
    practiced && practiced.length > 0
      ? Math.round(
          practiced.reduce((a, p) => a + (p.practice_rating ?? 3), 0) / practiced.length
        )
      : null;

  const { data: mocks } = await supabase
    .from("mock_sessions")
    .select("score, conducted_at, session_type")
    .order("conducted_at", { ascending: false })
    .limit(10);

  const mockTrend = interviewPerformanceTrend(mocks ?? []);

  return {
    profileStrength,
    strategies,
    skillGaps,
    practiceAvg,
    mockTrend,
    stats,
  };
}
