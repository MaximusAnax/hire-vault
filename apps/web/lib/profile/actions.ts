"use server";

import * as header from "./actions/header";
import * as experience from "./actions/experience";
import * as education from "./actions/education";
import * as leadership from "./actions/leadership";
import * as projects from "./actions/projects";
import * as skills from "./actions/skills";
import * as courses from "./actions/courses";

import * as preferences from "./actions/preferences";

export async function updateWeeklyApplicationGoal(goal: number) {
  return preferences.updateWeeklyApplicationGoal(goal);
}

export async function updateProfile(formData: FormData) {
  return header.updateProfile(formData);
}

export async function createExperience(formData: FormData) {
  return experience.createExperience(formData);
}

export async function deleteExperience(id: string) {
  return experience.deleteExperience(id);
}

export async function updateExperience(id: string, formData: FormData) {
  return experience.updateExperience(id, formData);
}

export async function createEducation(formData: FormData) {
  return education.createEducation(formData);
}

export async function deleteEducation(id: string) {
  return education.deleteEducation(id);
}

export async function updateEducation(id: string, formData: FormData) {
  return education.updateEducation(id, formData);
}

export async function createLeadership(formData: FormData) {
  return leadership.createLeadership(formData);
}

export async function deleteLeadership(id: string) {
  return leadership.deleteLeadership(id);
}

export async function updateLeadership(id: string, formData: FormData) {
  return leadership.updateLeadership(id, formData);
}

export async function createProject(formData: FormData) {
  return projects.createProject(formData);
}

export async function deleteProject(id: string) {
  return projects.deleteProject(id);
}

export async function updateProject(id: string, formData: FormData) {
  return projects.updateProject(id, formData);
}

export async function createSkill(formData: FormData) {
  return skills.createSkill(formData);
}

export async function deleteSkill(id: string) {
  return skills.deleteSkill(id);
}

export async function updateSkill(id: string, formData: FormData) {
  return skills.updateSkill(id, formData);
}

export async function createCourse(formData: FormData) {
  return courses.createCourse(formData);
}

export async function deleteCourse(id: string) {
  return courses.deleteCourse(id);
}

export async function updateCourse(id: string, formData: FormData) {
  return courses.updateCourse(id, formData);
}
