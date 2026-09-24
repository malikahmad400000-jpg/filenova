import type { ToolItem } from "@/lib/site";

type ToolCardProps = {
  tool: ToolItem;
  tone?: "warm" | "night";
};

export function ToolCard({ tool, tone = "warm" }: ToolCardProps) {
  const Icon = tool.icon;
  const isNight = tone === "night";

  return (
    <article
      className={`group relative flex h-full flex-col rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${
        isNight
          ? "border-white/10 bg-white/5 hover:border-gold/40 hover:bg-white/10"
          : "border-line bg-card shadow-[var(--shadow-card)] hover:border-ember/30 hover:shadow-[0_22px_50px_-28px_rgba(196,92,38,0.35)]"
      }`}
    >
      <div
        className={`mb-4 inline-flex size-11 items-center justify-center rounded-xl ${
          isNight
            ? "bg-gold/15 text-gold"
            : "bg-[linear-gradient(180deg,#fff6ea,#f3e2cc)] text-ember"
        }`}
      >
        <Icon className="size-5" />
      </div>
      <h3
        className={`text-lg font-semibold tracking-tight ${isNight ? "text-white" : "text-ink"}`}
      >
        {tool.name}
      </h3>
      <p className={`mt-2 flex-1 text-sm leading-6 ${isNight ? "text-white/65" : "text-slate"}`}>
        {tool.description}
      </p>
      <a
        href={tool.href}
        className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors focus-ring rounded-md ${
          isNight
            ? "text-gold hover:text-white"
            : "text-ember hover:text-ember-deep"
        }`}
      >
        Try Tool
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </a>
    </article>
  );
}
