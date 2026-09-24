"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { CloseIcon, MenuIcon, NovaMark } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/#tools", label: "Tools" },
  { href: "/#ai-tools", label: "AI Tools" },
  { href: "/#pricing", label: "Pricing" },
];

export function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    // Initial user retrieval
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    // Real-time auth subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      router.push("/");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-[color:color-mix(in_srgb,var(--background)_86%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md text-ink focus-ring"
          aria-label="FileNova home"
        >
          <NovaMark className="size-8 text-night" />
          <span className="text-[1.05rem] font-semibold tracking-tight">FileNova</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md text-sm font-medium text-slate transition-colors hover:text-ink focus-ring"
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/dashboard"
              className="rounded-md text-sm font-semibold text-ember transition-colors hover:text-ember-deep focus-ring"
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Desktop Auth Section */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-ink/20 focus-ring"
                title={user.email}
              >
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="max-w-[140px] truncate">{user.email}</span>
              </Link>
              <Button
                type="button"
                variant="secondary"
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs font-semibold"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button href="/login" variant="ghost">
                Login
              </Button>
              <Button href="/signup">Get Started</Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-card text-ink md:hidden focus-ring"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {open ? (
        <div id="mobile-nav" className="border-t border-line bg-card px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-background focus-ring"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ember hover:bg-background focus-ring"
                  onClick={() => setOpen(false)}
                >
                  Dashboard ({user.email})
                </Link>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-center text-xs"
                    onClick={() => {
                      setOpen(false);
                      handleLogout();
                    }}
                  >
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-background focus-ring"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>
                <div className="pt-2" onClick={() => setOpen(false)}>
                  <Button href="/signup" className="w-full justify-center" variant="primary">
                    Get Started
                  </Button>
                </div>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
