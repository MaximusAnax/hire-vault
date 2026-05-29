import type { ResumeContent } from "@hirevault/ai-core";
import {
  renderResumeHtml,
  type ResumeRenderer,
  type ResumeTemplateId,
} from "@hirevault/resume-templates";

/**
 * HTML → PDF via headless Chromium. Uses puppeteer-core; set PUPPETEER_EXECUTABLE_PATH
 * or CHROME_PATH when not on Vercel (@sparticuz/chromium optional).
 */
export class HtmlChromiumRenderer implements ResumeRenderer {
  async renderToPdf(content: ResumeContent, templateId: ResumeTemplateId): Promise<Buffer> {
    const html = renderResumeHtml(content, templateId);
    const puppeteer = await import("puppeteer-core");
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ?? process.env.CHROME_PATH;
    let args: string[] = ["--no-sandbox", "--disable-setuid-sandbox"];

    if (!executablePath && process.env.VERCEL) {
      try {
        const chromium = await import("@sparticuz/chromium");
        executablePath = await chromium.default.executablePath();
        args = chromium.default.args;
      } catch {
        /* fall through */
      }
    }

    if (!executablePath) {
      throw new Error(
        "PDF export requires Chrome/Chromium. Set PUPPETEER_EXECUTABLE_PATH or install Chrome locally."
      );
    }

    const browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "Letter",
        printBackground: true,
        margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
