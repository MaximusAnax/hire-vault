"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearAllUserData } from "@/lib/dev/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ClearUserDataCard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClear() {
    const ok = window.confirm(
      "Delete ALL your HireVault data for this account?\n\n" +
        "This removes profile, jobs, applications, resumes, interview prep, extension tokens, " +
        "and uploaded files. Your login is kept.\n\nThis cannot be undone."
    );
    if (!ok) return;

    setMessage(null);
    startTransition(async () => {
      const res = await clearAllUserData();
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setMessage(
        res.removedFiles
          ? `All user data cleared (${res.removedFiles} file(s) removed from storage).`
          : "All user data cleared."
      );
      router.refresh();
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Developer: clear all data</CardTitle>
        <CardDescription>
          Resets this account to a fresh empty profile for local testing. Only available outside
          production (or when <code className="text-xs">ALLOW_DEV_DATA_RESET=1</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" variant="destructive" disabled={pending} onClick={handleClear}>
          {pending ? "Clearing…" : "Clear all my data"}
        </Button>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
