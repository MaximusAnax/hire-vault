import type { ResumeContent } from "@hirevault/ai-core";

export type ResumeTemplateId = "ats" | "modern" | "compact";

export interface ResumeTemplateMeta {
  id: ResumeTemplateId;
  name: string;
  description: string;
}

export const RESUME_TEMPLATES: ResumeTemplateMeta[] = [
  {
    id: "ats",
    name: "ATS Default",
    description: "Single column, plain headings, maximum parseability",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Accent header with clear section hierarchy",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Dense layout for experienced candidates",
  },
];

export function renderResumeHtml(
  content: ResumeContent,
  templateId: ResumeTemplateId = "ats"
): string {
  const expHtml = (content.experiences ?? [])
    .map(
      (e) => `
      <div class="exp">
        <h3>${escapeHtml(e.title)} — ${escapeHtml(e.company)}</h3>
        <p class="meta">${escapeHtml(e.start_date ?? "")} – ${escapeHtml(e.is_current ? "Present" : (e.end_date ?? ""))}</p>
        <ul>${(e.bullet_points ?? []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
      </div>`
    )
    .join("");

  const accent =
    templateId === "modern" ? "#8b5cf6" : templateId === "compact" ? "#3b82f6" : "#18181b";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 2rem auto; color: #111; line-height: 1.45; font-size: ${templateId === "compact" ? "10pt" : "11pt"}; }
  h1 { font-size: 1.5rem; margin: 0; color: ${accent}; }
  h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #ccc; margin-top: 1.25rem; }
  h3 { font-size: 1rem; margin: 0.5rem 0 0; }
  .meta { color: #555; font-size: 0.9em; margin: 0; }
  ul { margin: 0.25rem 0 0.75rem; padding-left: 1.25rem; }
  .summary { margin: 0.5rem 0; }
</style></head><body>
  <h1>${escapeHtml(content.headline ?? "Professional")}</h1>
  ${content.summary ? `<p class="summary">${escapeHtml(content.summary)}</p>` : ""}
  <h2>Experience</h2>
  ${expHtml || "<p>No experience listed.</p>"}
  ${content.skills?.length ? `<h2>Skills</h2><p>${content.skills.map(escapeHtml).join(" · ")}</p>` : ""}
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
