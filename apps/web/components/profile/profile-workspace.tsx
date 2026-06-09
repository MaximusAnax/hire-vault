"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  Course,
  Education,
  Experience,
  Leadership,
  Profile,
  Project,
  Skill,
} from "@hirevault/types";
import type { DeleteAction } from "@/lib/profile/types";
import { LeadershipRow } from "@/components/profile/leadership-row";
import { AddLeadershipForm } from "@/components/profile/add-leadership-form";
import { AddExperienceForm } from "@/components/profile/add-experience-form";
import { AddEducationForm } from "@/components/profile/add-education-form";
import { AddProjectForm } from "@/components/profile/add-project-form";
import { ProfileSkillsTags } from "@/components/profile/profile-skills-tags";
import { AddCourseForm } from "@/components/profile/add-course-form";
import { EducationRow } from "@/components/profile/education-row";
import { ProjectRow } from "@/components/profile/project-row";
import { CourseRow } from "@/components/profile/course-row";
import { ExperienceSection } from "@/components/profile/experience-section";
import { ProfileSummary, type ProfileTab } from "@/components/profile/profile-summary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

function defaultTabForProfile(
  experiences: Experience[],
  leadership: Leadership[],
  projects: Project[]
): ProfileTab {
  if (experiences.length >= 2) return "experiences";
  if (leadership.length > 0) return "leadership";
  if (projects.length > 0) return "projects";
  return "leadership";
}

export function ProfileWorkspace({
  experiences,
  leadership,
  education,
  projects,
  skills,
  courses,
  initialTab,
  earlyCareer,
  hasBlockers,
  onDeleteExperience,
  onDeleteLeadership,
  onDeleteEducation,
  onDeleteProject,
  onDeleteCourse,
}: {
  profile: Profile;
  experiences: Experience[];
  leadership: Leadership[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
  courses: Course[];
  initialTab?: ProfileTab;
  earlyCareer: boolean;
  hasBlockers: boolean;
  onDeleteExperience: DeleteAction;
  onDeleteLeadership: DeleteAction;
  onDeleteEducation: DeleteAction;
  onDeleteProject: DeleteAction;
  onDeleteCourse: DeleteAction;
}) {
  const computedDefault = defaultTabForProfile(experiences, leadership, projects);
  const [tab, setTab] = useState<ProfileTab>(initialTab ?? computedDefault);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const tabOrder: { value: ProfileTab; label: string }[] = earlyCareer
    ? [
        { value: "leadership", label: "Leadership" },
        { value: "projects", label: "Projects" },
        { value: "experiences", label: "Experience" },
        { value: "education", label: "Education" },
        { value: "skills", label: "Skills" },
        { value: "courses", label: "Courses" },
      ]
    : [
        { value: "experiences", label: "Experience" },
        { value: "leadership", label: "Leadership" },
        { value: "education", label: "Education" },
        { value: "projects", label: "Projects" },
        { value: "skills", label: "Skills" },
        { value: "courses", label: "Courses" },
      ];

  return (
    <div className="space-y-4">
      {hasBlockers && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border px-4 py-3 text-sm">
          <p className="text-muted-foreground">Import a resume or LinkedIn export to fill gaps faster.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile/import">Import or sync</Link>
          </Button>
        </div>
      )}

      <ProfileSummary
        experiences={experiences}
        leadership={leadership}
        projects={projects}
        skills={skills}
        education={education}
        courses={courses}
        onSelectTab={setTab}
      />

      {earlyCareer && (
        <p className="text-sm text-muted-foreground rounded-md border border-border bg-muted/20 px-3 py-2">
          Early career? Leadership and projects matter most.
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProfileTab)}>
        <TabsList>
          {tabOrder.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="experiences" className="space-y-4">
          <ExperienceSection experiences={experiences} onDelete={onDeleteExperience} />
          <AddExperienceForm />
        </TabsContent>

        <TabsContent value="leadership" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leadership</CardTitle>
              <CardDescription>Clubs, teams, and volunteer roles (exported in LaTeX PDF)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {leadership.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leadership entries yet.</p>
              ) : (
                leadership.map((l) => (
                  <LeadershipRow key={l.id} leadership={l} onDelete={onDeleteLeadership} />
                ))
              )}
            </CardContent>
          </Card>
          <AddLeadershipForm />
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
                  <EducationRow key={e.id} education={e} onDelete={onDeleteEducation} />
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
                  <ProjectRow key={p.id} project={p} onDelete={onDeleteProject} />
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
              <CardDescription>
                Tags from resume or LinkedIn import — same list as in Profile details above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileSkillsTags skills={skills} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Courses &amp; certifications</CardTitle>
              <CardDescription>Training and credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses yet.</p>
              ) : (
                courses.map((c) => (
                  <CourseRow key={c.id} course={c} onDelete={onDeleteCourse} />
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
