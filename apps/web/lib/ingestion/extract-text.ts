"use server";

/** Extract plain text from resume bytes (PDF or DOCX). */
export async function extractResumeText(
  buffer: Buffer,
  mimeType: string
): Promise<{ text: string; error?: string }> {
  try {
    if (mimeType === "application/pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      return { text: result.text?.trim() ?? "" };
    }
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value?.trim() ?? "" };
    }
    if (mimeType === "text/plain") {
      return { text: buffer.toString("utf-8").trim() };
    }
    return { text: "", error: `Unsupported file type: ${mimeType}` };
  } catch (e) {
    return {
      text: "",
      error: e instanceof Error ? e.message : "Text extraction failed",
    };
  }
}
