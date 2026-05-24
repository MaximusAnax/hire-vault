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
  if (!apiBase?.trim() || !token?.trim()) {
    return { error: "Configure API base URL and extension token in popup settings." };
  }
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/extension/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { error?: string; jobId?: string; applicationId?: string };
  if (!res.ok) return { error: data.error ?? `HTTP ${res.status}` };
  return { ok: true, ...data };
}
