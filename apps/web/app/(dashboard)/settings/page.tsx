import { ExtensionTokens } from "@/components/settings/extension-tokens";
import { DeveloperToolsCard } from "@/components/settings/developer-tools-card";
import { listExtensionTokens } from "@/lib/extension/actions";
import { getDevDataSummary, isDevDataResetAvailable } from "@/lib/dev/actions";
import { EMPTY_DEV_DATA_SUMMARY } from "@/lib/dev/reset-helpers";

export default async function SettingsPage() {
  const [tokens, devReset, devSummary] = await Promise.all([
    listExtensionTokens(),
    isDevDataResetAvailable(),
    getDevDataSummary(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Environment: copy <code className="font-mono text-xs bg-muted px-1 rounded">.env.example</code> to{" "}
          <code className="font-mono text-xs bg-muted px-1 rounded">.env</code> at the repository root. See{" "}
          <code className="font-mono text-xs bg-muted px-1 rounded">docs/setup/environment.md</code> and{" "}
          <code className="font-mono text-xs bg-muted px-1 rounded">docs/setup/auth-google-oauth.md</code>.
        </p>
      </div>
      <ExtensionTokens tokens={tokens} />
      {devReset ? (
        <DeveloperToolsCard summary={devSummary ?? EMPTY_DEV_DATA_SUMMARY} />
      ) : null}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          <strong>OPENAI_API_KEY</strong> — JD parsing, resume validation, question generation structure.
        </p>
        <p>
          <strong>ANTHROPIC_API_KEY</strong> — Bullet rewrites and personalized interview answers.
        </p>
        <p>
          <strong>SUPABASE_SERVICE_ROLE_KEY</strong> — Extension capture API only (server-side).
        </p>
      </div>
    </div>
  );
}
