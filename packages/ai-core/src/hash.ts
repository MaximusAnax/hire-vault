import { createHash } from "crypto";

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function hashExperience(input: {
  company: string;
  title: string;
  start_date?: string | null;
}): string {
  const payload = [
    normalize(input.company),
    normalize(input.title),
    input.start_date ?? "",
  ].join("|");
  return sha256(payload);
}

export function hashLeadership(input: {
  organization: string;
  title: string;
  start_date?: string | null;
}): string {
  const payload = [
    normalize(input.organization),
    normalize(input.title),
    input.start_date ?? "",
  ].join("|");
  return sha256(payload);
}

export function hashEducation(input: {
  institution: string;
  degree?: string | null;
  start_date?: string | null;
}): string {
  const payload = [
    normalize(input.institution),
    normalize(input.degree),
    input.start_date ?? "",
  ].join("|");
  return sha256(payload);
}

export function hashProject(input: { name: string }): string {
  return sha256(normalize(input.name));
}

export function hashSkill(input: { name: string }): string {
  return sha256(normalize(input.name));
}

export function hashCourse(input: { name: string; institution?: string | null }): string {
  const payload = [normalize(input.name), normalize(input.institution)].join("|");
  return sha256(payload);
}

function sha256(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}
