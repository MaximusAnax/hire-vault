import { NextResponse } from "next/server";
import { parseJobDescription } from "@hirevault/ai-core";
import { getUserFromExtensionToken } from "@/lib/extension/auth";
import { mergeExtensionCaptureFields, type ExtensionJobInput } from "@/lib/extension/merge-capture-fields";
import { createServiceClient } from "@/lib/supabase/service";

/** Match web smart-capture preview gate in parseAndPreviewJob */
const AI_PARSE_MIN_CHARS = 60;

export async function POST(request: Request) {
  const auth = await getUserFromExtensionToken(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = (await request.json()) as {
    job?: ExtensionJobInput;
    createApplication?: boolean;
  };

  const job = body.job;
  if (!job?.title?.trim()) {
    return NextResponse.json({ error: "job.title required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required in root .env" },
      { status: 500 }
    );
  }

  const description = job.description ?? "";
  let parsed = null;
  if (description.length >= AI_PARSE_MIN_CHARS) {
    const result = await parseJobDescription(description);
    if (result.data) parsed = result.data;
  }

  const merged = mergeExtensionCaptureFields(job, parsed);
  const jobUrl = job.url?.trim() || null;

  const jobRow = {
    user_id: auth.userId,
    title: merged.title,
    company: merged.company,
    location: merged.primaryLocation,
    locations: merged.locations,
    url: jobUrl,
    description_raw: description || null,
    description_parsed: merged.parsed,
    tech_stack: merged.tech_stack,
    required_qualifications: merged.required_qualifications,
    preferred_qualifications: merged.preferred_qualifications,
    salary_range: merged.salary_range,
    job_type: merged.job_type,
    role_season: merged.role_season,
    role_year: merged.role_year,
    scraped_at: new Date().toISOString(),
  };

  let jobId: string;
  let deduped = false;

  if (jobUrl) {
    const { data: existing } = await supabase
      .from("jobs")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("url", jobUrl)
      .maybeSingle();

    if (existing?.id) {
      jobId = existing.id;
      deduped = true;
      const { error: updateError } = await supabase.from("jobs").update(jobRow).eq("id", jobId);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("jobs")
        .insert(jobRow)
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!inserted?.id) return NextResponse.json({ error: "Job insert failed" }, { status: 500 });
      jobId = inserted.id;
    }
  } else {
    const { data: inserted, error } = await supabase
      .from("jobs")
      .insert(jobRow)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!inserted?.id) return NextResponse.json({ error: "Job insert failed" }, { status: 500 });
    jobId = inserted.id;
  }

  let applicationId: string | undefined;
  if (body.createApplication !== false) {
    const { data: existingApp } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("job_id", jobId)
      .maybeSingle();

    if (existingApp?.id) {
      applicationId = existingApp.id;
    } else {
      const { data: app, error: appError } = await supabase
        .from("applications")
        .insert({
          user_id: auth.userId,
          job_id: jobId,
          status: "saved",
          priority: 3,
          notes: [],
        })
        .select("id")
        .single();

      if (appError) {
        return NextResponse.json({ error: appError.message }, { status: 500 });
      }
      applicationId = app?.id;
    }
  }

  return NextResponse.json({
    ok: true,
    jobId,
    applicationId,
    deduped,
  });
}
