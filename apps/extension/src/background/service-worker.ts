chrome.runtime.onInstalled.addListener(() => {
  console.info("[HireVault] Extension installed");
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SYNC_JOB") {
    syncJob(msg.payload, msg.apiBase, msg.token)
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ error: e instanceof Error ? e.message : "Sync failed" }));
    return true;
  }
  return false;
});

async function syncJob(
  payload: { job: Record<string, unknown>; createApplication?: boolean },
  apiBase: string,
  token: string
): Promise<{ ok?: boolean; error?: string; jobId?: string; applicationId?: string }> {
  const base = apiBase?.trim().replace(/\/$/, "");
  const cleanToken = token?.trim().replace(/^\s*bearer\s+/i, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!base || !cleanToken) {
    return { error: "Configure API base URL and extension token in popup settings." };
  }
  const res = await fetch(`${base}/api/extension/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { error?: string; jobId?: string; applicationId?: string };
  if (!res.ok) return { error: data.error ?? `HTTP ${res.status}` };
  return { ok: true, ...data };
}
