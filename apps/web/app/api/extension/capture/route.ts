import { NextResponse } from "next/server";
import type { CaptureSource } from "@hirevault/types";
import {
  AI_PARSE_MIN_CHARS,
  buildCapturePreview,
  type CaptureDraft,
  type CaptureDraftSaveOptions,
} from "@/lib/applications/capture-preview";
import { getUserFromExtensionToken } from "@/lib/extension/auth";
import { insertJobFromCaptureDraft } from "@/lib/extension/insert-capture-draft";
import {
  mergeExtensionCaptureFields,
  type ExtensionJobInput,
} from "@/lib/extension/merge-capture-fields";
import { parseJobDescription } from "@hirevault/ai-core";
import { createServiceClient } from "@/lib/supabase/service";

type CaptureRequestBody = CaptureDraftSaveOptions & {
  draft?: CaptureDraft;
  /** @deprecated Prefer `draft`; kept for extension versions that send raw scrape only. */
  job?: ExtensionJobInput & { confidence?: "high" | "medium" | "low" };
};

export async function POST(request: Request) {
  const auth = await getUserFromExtensionToken(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = (await request.json()) as CaptureRequestBody;
  const skipAiParse = body.skip_ai_parse === true;

  if (skipAiParse) {
    if (!body.draft?.title?.trim()) {
      return NextResponse.json({ error: "draft.title required when skip_ai_parse" }, { status: 400 });
    }
  } else {
    const job = body.job ?? draftToJobInput(body.draft);
    if (!job?.title?.trim()) {
      return NextResponse.json({ error: "job.title required" }, { status: 400 });
    }
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required in root .env" },
      { status: 500 }
    );
  }

  let draft: CaptureDraft;
  let description_parsed = null;

  if (skipAiParse && body.draft) {
    draft = body.draft;
  } else {
    const job = body.job ?? draftToJobInput(body.draft)!;
    const description = job.description ?? body.draft?.description_raw ?? "";

    if (description.length >= AI_PARSE_MIN_CHARS) {
      const preview = await buildCapturePreview({
        description,
        url: job.url ?? body.draft?.url,
        scrapedTitle: job.title ?? body.draft?.title,
        scrapedCompany: job.company ?? body.draft?.company,
        scrapedLocation: job.location,
        scrapedLocations: job.locations ?? body.draft?.locations,
        scrapeSource: body.draft?.scrape_source,
        confidence: job.confidence ?? body.draft?.confidence,
      });

      if ("error" in preview) {
        return NextResponse.json({ error: preview.error }, { status: 400 });
      }

      draft = preview.draft;
      description_parsed = preview.parsed;
    } else {
      let parsed = null;
      if (description.length > 0) {
        const result = await parseJobDescription(description);
        if (result.data) parsed = result.data;
      }

      const merged = mergeExtensionCaptureFields(
        {
          ...job,
          description,
          confidence: job.confidence ?? body.draft?.confidence,
        },
        parsed
      );

      draft = {
        title: merged.title,
        company: merged.company,
        url: job.url ?? body.draft?.url,
        description_raw: description,
        job_type: merged.job_type,
        role_season: merged.role_season,
        role_year: merged.role_year,
        locations: merged.locations,
        tech_stack: merged.tech_stack,
        required_qualifications: merged.required_qualifications,
        preferred_qualifications: merged.preferred_qualifications,
        salary_range: merged.salary_range,
        priority: body.draft?.priority ?? null,
        scrape_source: body.draft?.scrape_source,
        confidence: job.confidence ?? body.draft?.confidence,
      };
      description_parsed = merged.parsed;
    }
  }

  const priority =
    body.priority !== undefined ? body.priority : draft.priority ?? null;

  const result = await insertJobFromCaptureDraft(supabase, {
    userId: auth.userId,
    draft,
    description_parsed,
    priority,
    needs_review: body.needs_review ?? false,
    capture_source: (body.capture_source ?? "extension") as CaptureSource,
    createApplication: body.createApplication !== false,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    jobId: result.jobId,
    applicationId: result.applicationId,
    deduped: result.deduped,
  });
}

function draftToJobInput(draft?: CaptureDraft): ExtensionJobInput | undefined {
  if (!draft) return undefined;
  return {
    title: draft.title,
    company: draft.company,
    url: draft.url,
    description: draft.description_raw,
    locations: draft.locations,
    confidence: draft.confidence,
  };
}
