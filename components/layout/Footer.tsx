import Link from "next/link";
import { NovaMark } from "@/components/icons";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#tools", label: "Tools" },
      { href: "/#ai-tools", label: "AI Tools" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#about", label: "About" },
      { href: "/#contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/#privacy", label: "Privacy" },
      { href: "/#terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-night text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-md focus-ring"
            aria-label="FileNova home"
          >
            <NovaMark className="size-8 text-gold" />
            <span className="text-lg font-semibold tracking-tight">FileNova</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/60">
            Powerful file tools. Smarter with AI. Built for people who live in
            documents.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold/90">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="rounded-md text-sm text-white/70 transition-colors hover:text-white focus-ring"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/45 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} FileNova. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
