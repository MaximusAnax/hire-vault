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
import { AddExperienceForm } from "@/components/profile/add-experience-form";
import { AddEducationForm } from "@/components/profile/add-education-form";
import { AddProjectForm } from "@/components/profile/add-project-form";
import { AddSkillForm } from "@/components/profile/add-skill-form";
import { AddCourseForm } from "@/components/profile/add-course-form";
import { EducationRow } from "@/components/profile/education-row";
import { ProjectRow } from "@/components/profile/project-row";
import { SkillRow } from "@/components/profile/skill-row";
import { CourseRow } from "@/components/profile/course-row";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
              <CardDescription>Degrees and institutions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {education.length === 0 ? (
                <p className="text-sm text-muted-foreground">No education entries yet.</p>
              ) : (
                education.map((e) => (
                  <EducationRow key={e.id} education={e} onDelete={deleteEducation} />
                ))
              )}
            </CardContent>
          </Card>
          <AddEducationForm />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Portfolio and side projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects yet.</p>
              ) : (
                projects.map((p) => (
                  <ProjectRow key={p.id} project={p} onDelete={deleteProject} />
                ))
              )}
            </CardContent>
          </Card>
          <AddProjectForm />
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Languages, frameworks, and tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {skillsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skills yet.</p>
              ) : (
                skillsList.map((s) => (
                  <SkillRow key={s.id} skill={s} onDelete={deleteSkill} />
                ))
              )}
            </CardContent>
          </Card>
          <AddSkillForm />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Courses &amp; certifications</CardTitle>
              <CardDescription>Training and credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {coursesList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses yet.</p>
              ) : (
                coursesList.map((c) => (
                  <CourseRow key={c.id} course={c} onDelete={deleteCourse} />
                ))
              )}
            </CardContent>
          </Card>
          <AddCourseForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
