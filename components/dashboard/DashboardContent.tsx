"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { pdfTools, aiTools } from "@/lib/site";
import { Button } from "@/components/ui/Button";

interface DashboardContentProps {
  user: {
    id: string;
    email?: string;
    createdAt?: string;
  };
}

export function DashboardContent({ user }: DashboardContentProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  const displayName = user.email ? user.email.split("@")[0] : "Member";

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-6 rounded-3xl border border-line bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              Active Account
            </span>
            <span className="inline-flex items-center rounded-full bg-ember/10 px-2.5 py-0.5 text-xs font-semibold text-ember border border-ember/20">
              Free Plan
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Welcome back, {displayName}!
          </h1>
          <p className="text-xs text-slate sm:text-sm">
            Signed in as <span className="font-semibold text-ink">{user.email}</span>
          </p>
        </div>

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs font-semibold"
          >
            {loggingOut ? "Signing out…" : "Log Out"}
          </Button>
        </div>
      </div>

      {/* Usage & Overview Section */}
      <section aria-labelledby="usage-overview-heading" className="space-y-4">
        <h2 id="usage-overview-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
          Workspace Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-line bg-card p-5 shadow-2xs space-y-2">
            <p className="text-xs font-medium text-slate">Current Subscription</p>
            <p className="text-xl font-bold text-ink">Free Tier</p>
            <p className="text-[11px] leading-relaxed text-slate">
              Unlimited standard file processing and essential AI summaries.
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-card p-5 shadow-2xs space-y-2">
            <p className="text-xs font-medium text-slate">Daily Processing Limit</p>
            <p className="text-xl font-bold text-ink">Standard</p>
            <p className="text-[11px] leading-relaxed text-slate">
              Up to 25 MB documents and 10 pages for Smart OCR &amp; Translation.
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-card p-5 shadow-2xs space-y-2">
            <p className="text-xs font-medium text-slate">Security &amp; Privacy</p>
            <p className="text-xl font-bold text-emerald-700">Protected</p>
            <p className="text-[11px] leading-relaxed text-slate">
              Row Level Security enabled. Files processed in memory without retention.
            </p>
          </div>
        </div>
      </section>

      {/* AI Tools Shortcuts */}
      <section aria-labelledby="ai-tools-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="ai-tools-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
            Smart AI Tools
          </h2>
          <Link href="/#ai-tools" className="text-xs font-semibold text-ember hover:underline focus-ring rounded-sm">
            View all &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aiTools
            .filter((tool) => tool.href.startsWith("/"))
            .map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group flex flex-col justify-between rounded-3xl border border-line bg-card p-5 shadow-2xs transition-all hover:border-ember/40 hover:shadow-xs focus-ring"
                >
                  <div>
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-ember/10 text-ember transition-colors group-hover:bg-ember group-hover:text-white">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-ink group-hover:text-ember">
                      {tool.name}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center text-[11px] font-semibold text-ember">
                    Launch tool &rarr;
                  </span>
                </Link>
              );
            })}
        </div>
      </section>

      {/* PDF Tools Shortcuts */}
      <section aria-labelledby="pdf-tools-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="pdf-tools-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
            PDF &amp; File Utilities
          </h2>
          <Link href="/#tools" className="text-xs font-semibold text-ember hover:underline focus-ring rounded-sm">
            View all &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pdfTools.slice(0, 4).map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.name}
                href={tool.href}
                className="group flex flex-col justify-between rounded-3xl border border-line bg-card p-5 shadow-2xs transition-all hover:border-ember/40 hover:shadow-xs focus-ring"
              >
                <div>
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-slate/10 text-slate transition-colors group-hover:bg-night group-hover:text-white">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-ink group-hover:text-ember">
                    {tool.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate line-clamp-2">
                    {tool.description}
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center text-[11px] font-semibold text-slate group-hover:text-ink">
                  Launch tool &rarr;
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
