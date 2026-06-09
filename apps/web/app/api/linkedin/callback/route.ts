import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";
import { isLinkedInOAuthConfigured } from "@/lib/linkedin/config";
import { exchangeLinkedInCode } from "@/lib/linkedin/client";
import { encryptLinkedInToken } from "@/lib/linkedin/token-crypto";

const STATE_COOKIE = "linkedin_oauth_state";

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function GET(request: Request) {
  const importUrl = `${appOrigin()}/profile/import`;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${importUrl}?linkedin_error=${encodeURIComponent(oauthError)}`);
  }

  if (!isLinkedInOAuthConfigured() || !code || !state) {
    return NextResponse.redirect(`${importUrl}?linkedin_error=invalid_request`);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${importUrl}?linkedin_error=state_mismatch`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${appOrigin()}/login?next=/profile/import`);
  }

  let profileId: string;
  try {
    profileId = await requireProfileId();
  } catch {
    return NextResponse.redirect(`${importUrl}?linkedin_error=profile_not_found`);
  }

  try {
    const tokens = await exchangeLinkedInCode(code);
    const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userinfoRes.ok) {
      return NextResponse.redirect(`${importUrl}?linkedin_error=member_lookup_failed`);
    }
    const userinfo = (await userinfoRes.json()) as { sub?: string };
    const memberId = userinfo.sub?.trim();
    if (!memberId) {
      return NextResponse.redirect(`${importUrl}?linkedin_error=member_id_missing`);
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const row = {
      profile_id: profileId,
      linkedin_member_id: memberId,
      access_token_enc: encryptLinkedInToken(tokens.access_token),
      refresh_token_enc: tokens.refresh_token
        ? encryptLinkedInToken(tokens.refresh_token)
        : null,
      expires_at: expiresAt,
    };

    const { error: upsertError } = await supabase
      .from("linkedin_connections")
      .upsert(row, { onConflict: "profile_id" });

    if (upsertError) {
      return NextResponse.redirect(`${importUrl}?linkedin_error=storage_failed`);
    }

    return NextResponse.redirect(`${importUrl}?linkedin=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[linkedin/callback] token exchange:", message);
    const params = new URLSearchParams({ linkedin_error: "token_exchange_failed" });
    if (process.env.NODE_ENV !== "production" && message) {
      params.set("linkedin_error_detail", message.slice(0, 200));
    }
    return NextResponse.redirect(`${importUrl}?${params.toString()}`);
  }
}
