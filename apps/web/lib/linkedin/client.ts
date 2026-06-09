import type { LinkedInApiPayload } from "@hirevault/ai-core";
import {
  getLinkedInClientId,
  getLinkedInClientSecret,
  getLinkedInRedirectUri,
} from "./config";

const LINKEDIN_API_VERSION = "202401";

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

export async function exchangeLinkedInCode(code: string): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getLinkedInRedirectUri(),
    client_id: getLinkedInClientId(),
    client_secret: getLinkedInClientSecret(),
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  return (await res.json()) as LinkedInTokenResponse;
}

export async function refreshLinkedInToken(refreshToken: string): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getLinkedInClientId(),
    client_secret: getLinkedInClientSecret(),
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LinkedIn token refresh failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  return (await res.json()) as LinkedInTokenResponse;
}

async function linkedInGet<T>(url: string, accessToken: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** Fetch member data from available LinkedIn endpoints; partial responses are OK. */
export async function fetchLinkedInMemberData(accessToken: string): Promise<LinkedInApiPayload> {
  const [userinfo, identityMe] = await Promise.all([
    linkedInGet<Record<string, unknown>>("https://api.linkedin.com/v2/userinfo", accessToken),
    linkedInGet<Record<string, unknown>>(
      "https://api.linkedin.com/rest/identityMe",
      accessToken
    ),
  ]);

  return { userinfo: userinfo ?? undefined, identityMe: identityMe ?? undefined };
}
