"use server";

import { revalidatePath } from "next/cache";
import {
  assembleSummary,
  entityHash,
  generateSnippet,
  type CachedSnippet,
  type SnippetEntity,
  type SummaryEntityType,
} from "@hirevault/ai-core";
import { createClient } from "@/lib/supabase/server";
import { requireProfileId, getProfileForUser } from "@/lib/profile/get-profile";

/**
 * Server-side wrappers around the hybrid summary engine.
 *
 * Responsibilities:
 *   - keep `profile_summary_snippets` in sync with profile entities,
 *   - flip `profiles.summary_stale` when content drifts,
 *   - assemble the final 3–5 sentence narrative on demand.
 *
 * Cost guardrails:
 *   - `regenerateSnippet` is a no-op when the hash matches the cached row,
 *   - `assembleProfileSummary` is the only place that issues the stitch call.
 */

async function markStale(profileId: string) {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ summary_stale: true })
    .eq("id", profileId);
}

function buildEntityFromRow(
  entityType: SummaryEntityType,
  row: Record<string, unknown>
): SnippetEntity {
  switch (entityType) {
    case "experience":
      return {
        type: entityType,
        id: row.id as string,
        fields: {
          company: row.company,
          title: row.title,
          location: row.location,
          start_date: row.start_date,
          end_date: row.end_date,
          is_current: row.is_current,
          bullet_points: row.bullet_points,
          technologies: row.technologies,
        },
      };
    case "education":
      return {
        type: entityType,
        id: row.id as string,
        fields: {
          institution: row.institution,
          degree: row.degree,
          field_of_study: row.field_of_study,
          start_date: row.start_date,
          expected_graduation: row.expected_graduation,
          gpa: row.gpa,
        },
      };
    case "project":
      return {
        type: entityType,
        id: row.id as string,
        fields: {
          name: row.name,
          description: row.description,
          technologies: row.technologies,
          bullet_points: row.bullet_points,
          url: row.url,
          github_url: row.github_url,
        },
      };
    case "skill":
      return {
        type: entityType,
        id: row.id as string,
        fields: {
          name: row.name,
          category: row.category,
          proficiency_level: row.proficiency_level,
        },
      };
    case "course":
      return {
        type: entityType,
        id: row.id as string,
        fields: {
          name: row.name,
          institution: row.institution,
          completion_date: row.completion_date,
        },
      };
  }
}

const TABLE_BY_ENTITY: Record<SummaryEntityType, string> = {
  experience: "experiences",
  education: "education",
  project: "projects",
  skill: "skills",
  course: "courses",
};

/** Build a minimal deterministic snippet so the cache still has a row when
 * the OpenAI client is unavailable. Keeps assembly working even degraded. */
function fallbackSnippet(entity: SnippetEntity): string {
  switch (entity.type) {
    case "experience":
      return `${entity.fields.title ?? "Role"} at ${entity.fields.company ?? "company"}.`;
    case "education":
      return `${entity.fields.degree ?? "Studied"} at ${entity.fields.institution ?? "institution"}.`;
    case "project":
      return `Built ${entity.fields.name ?? "project"}.`;
    case "skill":
      return `Skilled in ${entity.fields.name ?? "this area"}.`;
    case "course":
      return `Completed ${entity.fields.name ?? "course"}.`;
  }
}

/**
 * Regenerate a single snippet row only if the content hash changed (or no
 * row exists yet). Always marks the profile summary as stale on a successful
 * generate so the user knows the assembled narrative is out of date.
 */
export async function regenerateSnippet(
  entityType: SummaryEntityType,
  entityId: string
): Promise<{ regenerated: boolean; degraded?: boolean; error?: string }> {
  const supabase = await createClient();
  const profileId = await requireProfileId();
  const table = TABLE_BY_ENTITY[entityType];

  const { data: row, error: rowError } = await supabase
    .from(table)
    .select("*")
    .eq("id", entityId)
    .single();
  if (rowError || !row) {
    return { regenerated: false, error: rowError?.message ?? "Entity not found" };
  }

  const entity = buildEntityFromRow(entityType, row as Record<string, unknown>);
  const hash = entityHash(entity);

  const { data: existing } = await supabase
    .from("profile_summary_snippets")
    .select("id, source_hash")
    .eq("profile_id", profileId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (existing && existing.source_hash === hash) {
    return { regenerated: false };
  }

  const { snippet, model, degraded, error } = await generateSnippet(entity);
  const finalSnippet = snippet ?? fallbackSnippet(entity);

  if (existing) {
    await supabase
      .from("profile_summary_snippets")
      .update({
        snippet: finalSnippet,
        source_hash: hash,
        model,
        generated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("profile_summary_snippets").insert({
      profile_id: profileId,
      entity_type: entityType,
      entity_id: entityId,
      snippet: finalSnippet,
      source_hash: hash,
      model,
    });
  }

  await markStale(profileId);

  return { regenerated: true, degraded, error };
}

/**
 * Drop the snippet row for an entity. Used by delete actions before the
 * entity row goes away (cascade also covers this on the DB side via
 * profile_id, but entity-level rows are not FK-linked so we clean explicitly).
 */
export async function dropSnippetForEntity(
  entityType: SummaryEntityType,
  entityId: string
): Promise<void> {
  const supabase = await createClient();
  const profileId = await requireProfileId();
  await supabase
    .from("profile_summary_snippets")
    .delete()
    .eq("profile_id", profileId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  await markStale(profileId);
}

/**
 * Stitch all cached snippets into the assembled summary and persist it on
 * the profile row. Clears the stale flag and stamps `summary_assembled_at`.
 */
export async function assembleProfileSummary(): Promise<{
  success?: boolean;
  summary?: string;
  degraded?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const profile = await getProfileForUser();
  if (!profile) return { error: "Profile not found" };

  const { data: snippetsRaw } = await supabase
    .from("profile_summary_snippets")
    .select("entity_type, entity_id, snippet")
    .eq("profile_id", profile.id);

  const snippets: CachedSnippet[] = (snippetsRaw ?? []).map((r) => ({
    entity_type: r.entity_type as SummaryEntityType,
    entity_id: r.entity_id as string,
    snippet: r.snippet as string,
  }));

  const { summary, degraded, error } = await assembleSummary(snippets, {
    target_roles: profile.target_roles,
    pitch: profile.pitch,
    headline: profile.headline,
    location: profile.location,
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      summary,
      summary_stale: false,
      summary_assembled_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/profile");
  return { success: true, summary, degraded, error };
}
