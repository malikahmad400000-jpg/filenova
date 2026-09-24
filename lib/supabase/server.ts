import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./client";

export { isSupabaseConfigured };

/**
 * Creates a server-side Supabase client for Server Components, Server Actions,
 * and Route Handlers using Next.js 16 async cookies().
 */
export async function createClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  // Prefer ANON_KEY (standard); fall back to PUBLISHABLE_KEY for legacy setups
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )!.trim();

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware/proxy refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Retrieves the currently authenticated user safely.
 * Returns null if Supabase is unconfigured or user is not logged in.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
