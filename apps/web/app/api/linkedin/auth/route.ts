import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireProfileId } from "@/lib/profile/get-profile";
import {
  getLinkedInClientId,
  getLinkedInOAuthScopes,
  getLinkedInRedirectUri,
  isLinkedInOAuthConfigured,
} from "@/lib/linkedin/config";

const STATE_COOKIE = "linkedin_oauth_state";

export async function GET() {
  if (!isLinkedInOAuthConfigured()) {
    return NextResponse.json({ error: "LinkedIn OAuth is not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/profile/import", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  try {
    await requireProfileId();
  } catch {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const state = randomBytes(24).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getLinkedInClientId(),
    redirect_uri: getLinkedInRedirectUri(),
    state,
    scope: getLinkedInOAuthScopes(),
  });

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
}
