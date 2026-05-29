import { NextResponse } from "next/server";
import { parseJobDescription } from "@hirevault/ai-core";
import { createClient } from "@supabase/supabase-js";
import { getUserFromExtensionToken } from "@/lib/extension/auth";

export async function POST(request: Request) {
  const auth = await getUserFromExtensionToken(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = (await request.json()) as {
    job?: {
      title?: string;
      company?: string;
      location?: string;
      url?: string;
      description?: string;
      source?: string;
    };
    createApplication?: boolean;
  };

  const job = body.job;
  if (!job?.title) {
    return NextResponse.json({ error: "job.title required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const description = job.description ?? "";
  let parsed = null;
  let tech_stack: string[] = [];
  let required_qualifications: string[] = [];
  let preferred_qualifications: string[] = [];

  if (description.length > 50) {
    const result = await parseJobDescription(description);
    if (result.data) {
      parsed = result.data;
      tech_stack = result.data.tech_stack ?? [];
      required_qualifications = result.data.required_qualifications ?? [];
      preferred_qualifications = result.data.preferred_qualifications ?? [];
    }
  }

  const locationsRaw = (body.job as { locations?: string[] })?.locations;
  const locations = Array.isArray(locationsRaw)
    ? [...new Set(locationsRaw.map((l) => l.trim()).filter(Boolean))]
    : job.location
      ? [job.location.trim()]
      : [];

  const { data: inserted, error } = await supabase
    .from("jobs")
    .insert({
      user_id: auth.userId,
      title: job.title,
      company: job.company ?? "Unknown company",
      location: locations[0] ?? job.location ?? null,
      locations,
      url: job.url ?? null,
      description_raw: description || null,
      description_parsed: parsed,
      tech_stack,
      required_qualifications,
      preferred_qualifications,
      scraped_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let applicationId: string | undefined;
  if (body.createApplication !== false) {
    const { data: app } = await supabase
      .from("applications")
      .insert({
        user_id: auth.userId,
        job_id: inserted.id,
        status: "saved",
      })
      .select("id")
      .single();
    applicationId = app?.id;
  }

  return NextResponse.json({
    ok: true,
    jobId: inserted.id,
    applicationId,
  });
}
