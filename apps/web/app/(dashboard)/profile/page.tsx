import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/lib/profile/get-profile";
import {
  deleteCourse,
  deleteEducation,
  deleteExperience,
  deleteProject,
  deleteSkill,
} from "@/lib/profile/actions";
import { ProfileHeaderForm } from "@/components/profile/profile-header-form";
import { SectionList } from "@/components/profile/section-list";
import { AddExperienceForm } from "@/components/profile/add-experience-form";
import { AddEducationForm } from "@/components/profile/add-education-form";
import { AddProjectForm } from "@/components/profile/add-project-form";
import { AddSkillForm } from "@/components/profile/add-skill-form";
import { AddCourseForm } from "@/components/profile/add-course-form";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExperienceSection } from "@/components/profile/experience-section";
import type {
  Course,
  Education,
  Experience,
  Project,
  Skill,
} from "@hirevault/types";

export default async function ProfilePage() {
  const profile = await getProfileForUser();
  if (!profile) {
    return (
      <p className="text-muted-foreground">
        Profile not found. Sign out and sign in again to trigger profile creation.
      </p>
    );
  }

  const supabase = await createClient();
  const profileId = profile.id;

  const [exp, edu, proj, skills, courses] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", profileId).order("start_date", { ascending: false }),
    supabase.from("education").select("*").eq("profile_id", profileId),
    supabase.from("projects").select("*").eq("profile_id", profileId),
    supabase.from("skills").select("*").eq("profile_id", profileId),
    supabase.from("courses").select("*").eq("profile_id", profileId),
  ]);

  const experiences = (exp.data ?? []) as Experience[];
  const education = (edu.data ?? []) as Education[];
  const projects = (proj.data ?? []) as Project[];
  const skillsList = (skills.data ?? []) as Skill[];
  const coursesList = (courses.data ?? []) as Course[];

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

      <ProfileHeaderForm profile={profile} />

      <Tabs defaultValue="experiences">
        <TabsList>
          <TabsTrigger value="experiences">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
        </TabsList>

        <TabsContent value="experiences" className="space-y-4">
          <ExperienceSection experiences={experiences} onDelete={deleteExperience} />
          <AddExperienceForm />
        </TabsContent>

        <TabsContent value="education" className="space-y-4">
          <SectionList
            title="Education"
            description="Degrees and institutions"
            items={education.map((e) => ({
              id: e.id,
              title: e.institution,
              subtitle: [e.degree, e.field_of_study].filter(Boolean).join(" · "),
            }))}
            onDelete={deleteEducation}
            emptyMessage="No education entries yet."
          />
          <AddEducationForm />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <SectionList
            title="Projects"
            description="Portfolio and side projects"
            items={projects.map((p) => ({
              id: p.id,
              title: p.name,
              subtitle: p.technologies?.join(", "),
            }))}
            onDelete={deleteProject}
            emptyMessage="No projects yet."
          />
          <AddProjectForm />
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <SectionList
            title="Skills"
            description="Languages, frameworks, and tools"
            items={skillsList.map((s) => ({
              id: s.id,
              title: s.name,
              subtitle: s.category,
              meta: s.proficiency_level ? `Level ${s.proficiency_level}/5` : undefined,
            }))}
            onDelete={deleteSkill}
            emptyMessage="No skills yet."
          />
          <AddSkillForm />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <SectionList
            title="Courses & certifications"
            description="Training and credentials"
            items={coursesList.map((c) => ({
              id: c.id,
              title: c.name,
              subtitle: c.institution,
              meta: c.completion_date ?? undefined,
            }))}
            onDelete={deleteCourse}
            emptyMessage="No courses yet."
          />
          <AddCourseForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
