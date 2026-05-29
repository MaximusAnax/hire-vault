import type { ResumeContent } from "@hirevault/ai-core";
import type { ResumeTemplateId } from "./index";

/** Pluggable PDF pipeline — default Chromium impl lives in apps/web (puppeteer-core). */
export interface ResumeRenderer {
  renderToPdf(content: ResumeContent, templateId: ResumeTemplateId): Promise<Buffer>;
}

/**
 * Stub for your LaTeX `.tex` format. Wire when the template file is uploaded;
 * until then export uses HtmlChromiumRenderer in the web app.
 */
export class LatexRenderer implements ResumeRenderer {
  async renderToPdf(
    _content: ResumeContent,
    _templateId: ResumeTemplateId
  ): Promise<Buffer> {
    throw new Error(
      "LatexRenderer is not configured. Add your .tex template and implement renderToPdf, or use HtmlChromiumRenderer."
    );
  }
}
