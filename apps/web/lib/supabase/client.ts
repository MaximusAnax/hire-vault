import { createBrowserClient } from "@supabase/ssr";

function getEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
  };
}

export function createClient() {
  const { url, key } = getEnv();
  return createBrowserClient(url, key);
}
