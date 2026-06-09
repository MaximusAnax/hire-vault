import type {
  CaptureDraft,
  PreviewJobResult,
  ScrapedJob,
  SyncJobPayload,
  SyncJobResult,
} from "../shared/types";
import { buildFallbackDraft } from "../shared/fixture-draft";

chrome.runtime.onInstalled.addListener(() => {
  console.info("[HireVault] Extension installed");
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "PREVIEW_JOB") {
    previewJob(msg.job as ScrapedJob, msg.apiBase as string, msg.token as string)
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          error: e instanceof Error ? e.message : "Preview failed",
        } satisfies PreviewJobResult)
      );
    return true;
  }
  if (msg?.type === "SYNC_JOB") {
    syncJob(msg.payload as SyncJobPayload, msg.apiBase as string, msg.token as string)
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          error: e instanceof Error ? e.message : "Sync failed",
        } satisfies SyncJobResult)
      );
    return true;
  }
  return false;
});

function normalizeAuth(apiBase: string, token: string): { base: string; cleanToken: string } | { error: string } {
  const base = apiBase?.trim().replace(/\/$/, "");
  const cleanToken = token?.trim().replace(/^\s*bearer\s+/i, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!base || !cleanToken) {
    return { error: "Configure API base URL and extension token in settings." };
  }
  return { base, cleanToken };
}

async function previewJob(
  job: ScrapedJob,
  apiBase: string,
  token: string
): Promise<PreviewJobResult> {
  const auth = normalizeAuth(apiBase, token);
  if ("error" in auth) return { error: auth.error };

  const payload = {
    job: {
      ...job,
      url: job.url ?? "",
      locations: job.locations?.length ? job.locations : job.location ? [job.location] : [],
    },
  };

  try {
    const res = await fetch(`${auth.base}/api/extension/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.cleanToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as {
      draft?: CaptureDraft;
      degraded?: boolean;
      warning?: string | null;
      error?: string;
    };

    if (res.ok && data.draft) {
      return {
        draft: {
          ...data.draft,
          degraded: data.degraded,
          warning: data.warning ?? undefined,
        },
        degraded: data.degraded,
        warning: data.warning ?? undefined,
      };
    }

    if (res.status === 401) {
      return { error: data.error ?? "Unauthorized — check extension token in settings." };
    }

    const fallback = buildFallbackDraft(job);
    return {
      draft: fallback,
      usedFixture: true,
      degraded: true,
      warning: data.error ?? `Preview API returned HTTP ${res.status} — using local fixture.`,
    };
  } catch {
    return {
      draft: buildFallbackDraft(job),
      usedFixture: true,
      degraded: true,
      warning: "Could not reach preview API — using local fixture.",
    };
  }
}

async function syncJob(
  payload: SyncJobPayload,
  apiBase: string,
  token: string
): Promise<SyncJobResult> {
  const auth = normalizeAuth(apiBase, token);
  if ("error" in auth) return { error: auth.error };

  const res = await fetch(`${auth.base}/api/extension/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.cleanToken}`,
    },
    body: JSON.stringify({
      draft: payload.draft,
      skip_ai_parse: true,
      createApplication: payload.createApplication ?? true,
      needs_review: payload.needs_review ?? false,
      capture_source: "extension",
    }),
  });

  const data = (await res.json()) as {
    error?: string;
    jobId?: string;
    applicationId?: string;
    deduped?: boolean;
  };

  if (!res.ok) return { error: data.error ?? `HTTP ${res.status}` };
  return { ok: true, ...data };
}
