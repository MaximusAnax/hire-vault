import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/lib/profile/get-profile";
import {
  deleteCourse,
  deleteEducation,
  deleteExperience,
  deleteLeadership,
  deleteProject,
} from "@/lib/profile/actions";
import { getTailoringReadiness } from "@/lib/profile/readiness";
import { ProfileHeaderForm } from "@/components/profile/profile-header-form";
import { ProfileReadinessBanner } from "@/components/profile/profile-readiness-banner";
import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import type { ProfileTab } from "@/components/profile/profile-summary";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type {
  Course,
  Education,
  Experience,
  Leadership,
  Project,
  Skill,
} from "@hirevault/types";

const VALID_TABS = new Set<ProfileTab>([
  "experiences",
  "leadership",
  "education",
  "projects",
  "skills",
  "courses",
]);

function parseTabParam(tab: string | undefined): ProfileTab | undefined {
  if (tab && VALID_TABS.has(tab as ProfileTab)) return tab as ProfileTab;
  return undefined;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await getProfileForUser();
  if (!profile) {
    return (
      <p className="text-muted-foreground">
        Profile not found. Sign out and sign in again to trigger profile creation.
      </p>
    );
  }

  const params = await searchParams;
  const initialTab = parseTabParam(params.tab);

  const supabase = await createClient();
  const profileId = profile.id;

  const [exp, edu, lead, proj, skills, courses, readiness] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", profileId).order("start_date", { ascending: false }),
    supabase.from("education").select("*").eq("profile_id", profileId),
    supabase.from("leadership").select("*").eq("profile_id", profileId).order("start_date", { ascending: false }),
    supabase.from("projects").select("*").eq("profile_id", profileId),
    supabase.from("skills").select("*").eq("profile_id", profileId),
    supabase.from("courses").select("*").eq("profile_id", profileId),
    getTailoringReadiness(profileId),
  ]);

  const experiences = (exp.data ?? []) as Experience[];
  const education = (edu.data ?? []) as Education[];
  const leadershipList = (lead.data ?? []) as Leadership[];
  const projects = (proj.data ?? []) as Project[];
  const skillsList = (skills.data ?? []) as Skill[];
  const coursesList = (courses.data ?? []) as Course[];
  const earlyCareer = experiences.length < 2;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Your master career data — used for resume tailoring and interview prep.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/profile/import">Import data</Link>
        </Button>
      </div>

      <ProfileReadinessBanner ready={readiness.ready} blockers={readiness.blockers} />

      <ProfileHeaderForm profile={profile} skills={skillsList} />

      <ProfileWorkspace
        profile={profile}
        experiences={experiences}
        leadership={leadershipList}
        education={education}
        projects={projects}
        skills={skillsList}
        courses={coursesList}
        initialTab={initialTab}
        earlyCareer={earlyCareer}
        hasBlockers={!readiness.ready}
        onDeleteExperience={deleteExperience}
        onDeleteLeadership={deleteLeadership}
        onDeleteEducation={deleteEducation}
        onDeleteProject={deleteProject}
        onDeleteCourse={deleteCourse}
      />
    </div>
  );
}
