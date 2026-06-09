/** Server-only LinkedIn OAuth configuration. */

export function isLinkedInOAuthConfigured(): boolean {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID?.trim() &&
      process.env.LINKEDIN_CLIENT_SECRET?.trim() &&
      getLinkedInRedirectUri()
  );
}

export function getLinkedInRedirectUri(): string {
  const explicit = process.env.LINKEDIN_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return `${appUrl.replace(/\/$/, "")}/api/linkedin/callback`;

  return "";
}

export function getLinkedInClientId(): string {
  return process.env.LINKEDIN_CLIENT_ID?.trim() ?? "";
}

export function getLinkedInClientSecret(): string {
  return process.env.LINKEDIN_CLIENT_SECRET?.trim() ?? "";
}

/**
 * OIDC scopes required for Connect + userinfo.
 * Plus-tier scopes (experience/education) are opt-in — requesting them without
 * LinkedIn product approval causes `unauthorized_scope` on the auth screen.
 */
export function getLinkedInOAuthScopes(): string {
  const base = ["openid", "profile", "email"];
  const includePlus =
    process.env.LINKEDIN_OAUTH_INCLUDE_PLUS_SCOPES?.trim() === "1" ||
    process.env.LINKEDIN_OAUTH_INCLUDE_PLUS_SCOPES?.trim()?.toLowerCase() === "true";
  if (includePlus) {
    base.push("r_primary_current_experience", "r_most_recent_education");
  }
  return base.join(" ");
}
