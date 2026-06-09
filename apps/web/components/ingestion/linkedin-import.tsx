"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Linkedin } from "lucide-react";
import { importLinkedInJson, syncLinkedInProfile } from "@/lib/ingestion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE_JSON = `{
  "headline": "Software Engineer",
  "summary": "Building products at scale.",
  "location": "San Francisco, CA",
  "linkedin_url": "https://linkedin.com/in/you",
  "experiences": [
    {
      "company": "Acme Corp",
      "title": "Senior Engineer",
      "start_date": "2022-01-01",
      "is_current": true,
      "bullet_points": ["Led team of 4", "Reduced latency 40%"]
    }
  ],
  "education": [],
  "skills": [{ "name": "TypeScript", "category": "language" }]
}`;

const OAUTH_ERRORS: Record<string, string> = {
  state_mismatch: "LinkedIn sign-in expired. Try connecting again in the same browser.",
  invalid_request: "LinkedIn returned an incomplete authorization response. Try Connect again.",
  token_exchange_failed:
    "Could not exchange authorization code. Check client ID, secret, and redirect URI match your LinkedIn app.",
  member_lookup_failed: "Connected but could not read your LinkedIn member ID.",
  member_id_missing: "LinkedIn userinfo did not include a member ID. Ensure openid scope is enabled.",
  storage_failed:
    "Could not save LinkedIn connection. Run `pnpm db db push` to apply the linkedin_connections migration.",
  profile_not_found: "Profile not found. Sign out and sign in again to create your profile.",
  access_denied: "LinkedIn access was denied. Approve the connection on LinkedIn to continue.",
  unauthorized_scope:
    "LinkedIn rejected requested permissions. Remove LINKEDIN_OAUTH_INCLUDE_PLUS_SCOPES or approve Plus products in the LinkedIn Developer Portal.",
  user_cancelled_login: "LinkedIn sign-in was cancelled.",
  user_cancelled_authorize: "LinkedIn authorization was cancelled.",
};

type Props = {
  oauthConfigured: boolean;
  linkedInConnected: boolean;
};

export function LinkedInImport({ oauthConfigured, linkedInConnected }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [syncPending, startSync] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(!oauthConfigured);
  const [syncApplyImmediately, setSyncApplyImmediately] = useState(false);

  useEffect(() => {
    const connected = searchParams.get("linkedin");
    const oauthError = searchParams.get("linkedin_error");
    if (connected === "connected") {
      setMessage("LinkedIn connected. Sync to import profile data.");
      setError(null);
    } else if (oauthError) {
      const detail = searchParams.get("linkedin_error_detail");
      const base =
        OAUTH_ERRORS[oauthError] ??
        `LinkedIn connection failed (${oauthError}). Check the LinkedIn Developer Portal app settings.`;
      setError(detail ? `${base} ${detail}` : base);
      setMessage(null);
    }
  }, [searchParams]);

  function handleImportResult(result: {
    awaitingConfirm?: boolean;
    inserted?: number;
    merged?: number;
    conflicts?: number;
  }) {
    if (result.awaitingConfirm) {
      router.refresh();
      return;
    }
    setMessage(
      `Imported ${result.inserted ?? 0} new, merged ${result.merged ?? 0}, ${result.conflicts ?? 0} conflicts.`
    );
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-md border border-border p-4">
      <div className="flex items-center gap-2">
        <Linkedin className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium">LinkedIn import</p>
          <p className="text-sm text-muted-foreground">
            {oauthConfigured
              ? "Connect with LinkedIn for official sync, or paste JSON under Advanced."
              : "Paste structured JSON export. OAuth sync is available when LinkedIn credentials are configured."}
          </p>
        </div>
      </div>

      {oauthConfigured && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default" asChild disabled={pending || syncPending}>
            <Link href="/api/linkedin/auth">Connect LinkedIn</Link>
          </Button>
          {linkedInConnected && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending || syncPending}
                onClick={() => {
                  setMessage(null);
                  setError(null);
                  startSync(async () => {
                    const fd = new FormData();
                    if (syncApplyImmediately) fd.set("apply_immediately", "on");
                    const result = await syncLinkedInProfile(fd);
                    if ("error" in result && result.error) {
                      setError(result.error);
                      return;
                    }
                    if ("success" in result && result.success) {
                      handleImportResult(result);
                    }
                  });
                }}
              >
                {syncPending ? "Syncing…" : "Sync profile"}
              </Button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={syncApplyImmediately}
                  onChange={(e) => setSyncApplyImmediately(e.target.checked)}
                  className="rounded border-border"
                />
                Apply immediately
              </label>
            </>
          )}
          {linkedInConnected && (
            <span className="text-xs text-muted-foreground">Connected</span>
          )}
        </div>
      )}

      <details
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-md border border-border"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4 shrink-0" />
          Advanced — paste JSON
        </summary>
        <form
          className="space-y-3 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await importLinkedInJson(fd);
              if ("error" in result && result.error) setError(result.error);
              else if ("success" in result && result.success) {
                handleImportResult(result);
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">Profile URL (optional)</Label>
            <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_json">JSON data</Label>
            <Textarea
              id="linkedin_json"
              name="linkedin_json"
              rows={8}
              placeholder={SAMPLE_JSON}
              className="font-mono text-xs"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="apply_immediately" className="rounded border-border" />
            Apply immediately (skip preview)
          </label>
          <Button type="submit" variant="secondary" disabled={pending || syncPending}>
            {pending ? "Importing…" : "Import from JSON"}
          </Button>
        </form>
      </details>

      {message && <p className="text-sm text-green-500">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
