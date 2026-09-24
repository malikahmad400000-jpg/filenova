"use client";

import { useState, useId, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="size-4 text-slate hover:text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg className="size-4 text-slate hover:text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/dashboard";
  const noticeParam = searchParams.get("notice");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    noticeParam === "unconfigured"
      ? "Authentication service is not configured yet. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      : null
  );

  const emailId = useId();
  const passwordId = useId();

  // Validate internal redirect destination against open-redirect exploits
  const safeRedirect =
    redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/dashboard";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setError(
        "Authentication service is not configured yet. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Unable to initialize Supabase client.");
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Your email address has not been confirmed yet. Please check your inbox.");
        } else {
          setError(authError.message || "Authentication failed.");
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push(safeRedirect);
        router.refresh();
      } else {
        setError("Login succeeded but no active session was returned.");
        setLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-900 shadow-2xs"
        >
          <div className="flex items-start gap-2">
            <span className="font-bold text-red-700">&bull;</span>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-1.5">
        <label htmlFor={emailId} className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate">
          Email Address
        </label>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-line bg-background px-3.5 py-2.5 text-sm font-medium text-ink placeholder:text-slate/60 focus-ring"
        />
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <label htmlFor={passwordId} className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate">
          Password
        </label>
        <div className="relative">
          <input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-2xl border border-line bg-background px-3.5 py-2.5 pr-10 text-sm font-medium text-ink placeholder:text-slate/60 focus-ring"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 focus-ring rounded-r-2xl"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center"
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner /> Signing in…
            </span>
          ) : (
            "Log In"
          )}
        </Button>
      </div>

      <div className="pt-2 text-center text-xs text-slate">
        Don&apos;t have an account?{" "}
        <Link
          href={`/signup${redirectParam !== "/dashboard" ? `?redirect=${encodeURIComponent(safeRedirect)}` : ""}`}
          className="font-semibold text-ember hover:underline focus-ring rounded-sm"
        >
          Sign Up
        </Link>
      </div>
    </form>
  );
}
