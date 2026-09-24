import Link from "next/link";
import type { ReactNode } from "react";
import { NovaMark } from "@/components/icons";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-background text-ink">
      {/* Header Bar */}
      <header className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md text-ink focus-ring"
            aria-label="FileNova home"
          >
            <NovaMark className="size-8 text-night" />
            <span className="text-[1.05rem] font-semibold tracking-tight">FileNova</span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate transition-colors hover:text-ink focus-ring rounded-md px-2 py-1"
          >
            &larr; Back to FileNova
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate sm:text-sm">
              {subtitle}
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-card p-6 shadow-xs sm:p-8">
            {children}
          </div>

          {footer && <div className="text-center text-xs text-slate">{footer}</div>}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line/60 px-4 py-6 text-center text-xs text-slate sm:px-6">
        <p>&copy; {new Date().getFullYear()} FileNova. All rights reserved.</p>
      </footer>
    </div>
  );
}
