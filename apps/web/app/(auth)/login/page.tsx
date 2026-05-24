"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Sign in to HireVault</CardTitle>
          <CardDescription>
            Continue with Google to access your career dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={signInWithGoogle}
            disabled={loading}
          >
            {loading ? "Redirecting…" : "Continue with Google"}
          </Button>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <p className="text-xs text-center text-muted-foreground">
            <Link href="/" className="hover:underline">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
