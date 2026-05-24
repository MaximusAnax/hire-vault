"use client";

import { useState, useTransition } from "react";
import {
  createExtensionToken,
  revokeExtensionToken,
} from "@/lib/extension/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TokenRow {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export function ExtensionTokens({ tokens }: { tokens: TokenRow[] }) {
  const [pending, startTransition] = useTransition();
  const [newToken, setNewToken] = useState<string | null>(null);
  const [name, setName] = useState("Chrome extension");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chrome extension</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Generate a token for the HireVault extension. Paste it in the extension popup with your app URL.
        </p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Token name" />
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await createExtensionToken(name);
                if (res.token) setNewToken(res.token);
              })
            }
          >
            Generate token
          </Button>
        </div>
        {newToken && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="font-mono text-xs break-all">{newToken}</p>
            <p className="text-xs text-muted-foreground mt-2">Copy now — it won&apos;t be shown again.</p>
          </div>
        )}
        <ul className="space-y-2">
          {tokens.map((t) => (
            <li key={t.id} className="flex justify-between items-center border-b py-2">
              <span>
                {t.name} · {t.last_used_at ? `Used ${new Date(t.last_used_at).toLocaleString()}` : "Never used"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  startTransition(async () => {
                    await revokeExtensionToken(t.id);
                  })
                }
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
