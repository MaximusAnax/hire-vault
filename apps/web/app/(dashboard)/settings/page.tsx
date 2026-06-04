import { ExtensionTokens } from "@/components/settings/extension-tokens";
import { ClearUserDataCard } from "@/components/settings/clear-user-data-card";
import { listExtensionTokens } from "@/lib/extension/actions";
import { isDevDataResetAvailable } from "@/lib/dev/actions";

export default async function SettingsPage() {
  const [tokens, devReset] = await Promise.all([
    listExtensionTokens(),
    isDevDataResetAvailable(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Environment: copy <code className="font-mono text-xs bg-muted px-1 rounded">.env.example</code> to{" "}
          <code className="font-mono text-xs bg-muted px-1 rounded">.env</code> at the repository root. See{" "}
          <code className="font-mono text-xs bg-muted px-1 rounded">packages/supabase/docs/auth-google-oauth.md</code>.
        </p>
      </div>
      <ExtensionTokens tokens={tokens} />
      {devReset ? <ClearUserDataCard /> : null}
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
