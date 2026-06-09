import { NextResponse } from "next/server";
import { buildCapturePreview } from "@/lib/applications/capture-preview";
import { getUserFromExtensionToken } from "@/lib/extension/auth";
import type { ExtensionJobInput } from "@/lib/extension/merge-capture-fields";

export async function POST(request: Request) {
  const auth = await getUserFromExtensionToken(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = (await request.json()) as {
    job?: ExtensionJobInput & { confidence?: "high" | "medium" | "low" };
  };

  const job = body.job;
  if (!job?.description?.trim()) {
    return NextResponse.json({ error: "job.description required" }, { status: 400 });
  }

  const preview = await buildCapturePreview({
    description: job.description,
    url: job.url,
    scrapedTitle: job.title,
    scrapedCompany: job.company,
    scrapedLocation: job.location,
    scrapedLocations: job.locations,
    confidence: job.confidence,
  });

  if ("error" in preview) {
    return NextResponse.json({ error: preview.error }, { status: 400 });
  }

  return NextResponse.json({
    draft: preview.draft,
    parsed: preview.parsed,
  });
}
