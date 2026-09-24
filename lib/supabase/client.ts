import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

export class MissingSupabaseConfigError extends Error {
  constructor(
    message = "Supabase authentication is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
  ) {
    super(message);
    this.name = "MissingSupabaseConfigError";
  }
}

/**
 * Checks whether Supabase environment variables are present and well-formed.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Accept ANON_KEY (standard Supabase name) or PUBLISHABLE_KEY (legacy alias)
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();
  return Boolean(url && key && url.startsWith("http"));
}

/**
 * Creates or returns the singleton Supabase client for Client Components.
 * Returns `null` safely if Supabase is unconfigured, preventing runtime crashes.
 */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (clientInstance) {
    return clientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  // Prefer ANON_KEY (standard); fall back to PUBLISHABLE_KEY for legacy setups
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )!.trim();

  clientInstance = createBrowserClient(url, key);
  return clientInstance;
}
