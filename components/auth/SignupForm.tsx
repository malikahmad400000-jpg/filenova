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

function CheckIcon() {
  return (
    <svg className="size-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
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

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

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

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
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

      // Origin for auth callback redirect
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("User already exists")) {
          setError("An account with this email address already exists. Please log in.");
        } else {
          setError(authError.message || "Sign up failed.");
        }
        setLoading(false);
        return;
      }

      // Supabase returns user with identities empty if user already exists in some configurations
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("An account with this email address already exists. Please log in.");
        setLoading(false);
        return;
      }

      // If session is active immediately (confirmations disabled)
      if (data.session) {
        router.push(safeRedirect);
        router.refresh();
        return;
      }

      // Email confirmation required
      setConfirmationRequired(true);
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  // Confirmation view
  if (confirmationRequired) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckIcon />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-ink">
            Check your email
          </h3>
          <p className="text-xs leading-relaxed text-slate sm:text-sm">
            We sent a verification link to <span className="font-semibold text-ink">{email}</span>. Please click the link to confirm your FileNova account.
          </p>
        </div>
        <div className="pt-2">
          <Button
            href="/login"
            variant="secondary"
            className="w-full justify-center"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

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

      {/* Email */}
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

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor={passwordId} className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate">
          Password
        </label>
        <div className="relative">
          <input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
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

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label htmlFor={confirmPasswordId} className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate">
          Confirm Password
        </label>
        <input
          id={confirmPasswordId}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          className="w-full rounded-2xl border border-line bg-background px-3.5 py-2.5 text-sm font-medium text-ink placeholder:text-slate/60 focus-ring"
        />
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
              <Spinner /> Creating account…
            </span>
          ) : (
            "Create Account"
          )}
        </Button>
      </div>

      <div className="pt-2 text-center text-xs text-slate">
        Already have an account?{" "}
        <Link
          href={`/login${redirectParam !== "/dashboard" ? `?redirect=${encodeURIComponent(safeRedirect)}` : ""}`}
          className="font-semibold text-ember hover:underline focus-ring rounded-sm"
        >
          Log In
        </Link>
      </div>
    </form>
  );
}
