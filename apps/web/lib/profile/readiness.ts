import { validateProfileLocally } from "@hirevault/ai-core";
import type { OverviewAction, Profile } from "@hirevault/types";
import { createClient } from "@/lib/supabase/server";

const BLOCKER_SEVERITIES = new Set(["error", "warning"]);

function profileTabHref(tab: string): string {
  return `/profile?tab=${tab}`;
}

function hrefForField(field: string): string {
  if (field.startsWith("experiences")) return profileTabHref("experiences");
  if (field === "skills") return profileTabHref("skills");
  if (field.startsWith("leadership")) return profileTabHref("leadership");
  if (field.startsWith("projects")) return profileTabHref("projects");
  if (field.startsWith("education")) return profileTabHref("education");
  if (field.startsWith("courses")) return profileTabHref("courses");
  return "/profile";
}

function priorityForSeverity(severity: "info" | "warning" | "error"): number {
  if (severity === "error") return 100;
  if (severity === "warning") return 70;
  return 40;
}

export function deriveTailoringReadiness(input: {
  profile: Pick<Profile, "full_name" | "target_roles">;
  experiences: { bullet_points?: string[] }[];
  leadershipCount: number;
  projectsCount: number;
  skills: { name: string }[];
}): { ready: boolean; blockers: OverviewAction[] } {
  const validation = validateProfileLocally({
    full_name: input.profile.full_name,
    target_roles: input.profile.target_roles,
    experiences: input.experiences,
    skills: input.skills,
    leadershipCount: input.leadershipCount,
    projectsCount: input.projectsCount,
  });

  const blockers: OverviewAction[] = validation.suggestions
    .filter((s) => BLOCKER_SEVERITIES.has(s.severity))
    .map((s) => ({
      kind: "profile_blocker" as const,
      priority: priorityForSeverity(s.severity),
      title: s.message,
      subtitle: s.suggestion ?? `Fix: ${s.field.replace(/_/g, " ")}`,
      href: hrefForField(s.field),
      metadata: { field: s.field, severity: s.severity },
    }))
    .sort((a, b) => b.priority - a.priority);

  return { ready: blockers.length === 0, blockers };
}

export async function getTailoringReadiness(profileId: string): Promise<{
  ready: boolean;
  blockers: OverviewAction[];
}> {
  const supabase = await createClient();

  const [profileRes, expRes, leadRes, projRes, skillsRes] = await Promise.all([
    supabase.from("profiles").select("full_name, target_roles").eq("id", profileId).single(),
    supabase.from("experiences").select("bullet_points").eq("profile_id", profileId),
    supabase.from("leadership").select("id").eq("profile_id", profileId),
    supabase.from("projects").select("id").eq("profile_id", profileId),
    supabase.from("skills").select("name").eq("profile_id", profileId),
  ]);

  const profile = profileRes.data;
  if (!profile) {
    return {
      ready: false,
      blockers: [
        {
          kind: "profile_blocker",
          priority: 100,
          title: "Profile not found.",
          subtitle: "Sign in again to restore your profile.",
          href: "/profile",
        },
      ],
    };
  }

  return deriveTailoringReadiness({
    profile: profile as Pick<Profile, "full_name" | "target_roles">,
    experiences: (expRes.data ?? []) as { bullet_points?: string[] }[],
    leadershipCount: leadRes.data?.length ?? 0,
    projectsCount: projRes.data?.length ?? 0,
    skills: (skillsRes.data ?? []) as { name: string }[],
  });
}
