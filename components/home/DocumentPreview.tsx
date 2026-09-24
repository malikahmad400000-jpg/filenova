export function DocumentPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-md lg:max-w-none"
      aria-hidden="true"
    >
      <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle_at_center,rgba(212,160,86,0.28),transparent_62%)] blur-2xl" />
      <div className="relative">
        <div className="absolute left-6 top-8 h-[78%] w-[78%] rotate-[-11deg] rounded-2xl border border-line bg-[#efe6d8] shadow-sm" />
        <div className="absolute left-10 top-5 h-[82%] w-[82%] rotate-[-5deg] rounded-2xl border border-line bg-[#f7efe3]" />

        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-card p-5 shadow-[0_30px_60px_-32px_rgba(18,21,28,0.55)] sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#d27a63]" />
              <span className="size-2.5 rounded-full bg-[#d4a056]" />
              <span className="size-2.5 rounded-full bg-[#7d9a6a]" />
            </div>
            <span className="rounded-full bg-night px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
              PDF
            </span>
          </div>

          <div className="space-y-3">
            <div className="h-3 w-2/3 rounded-full bg-ink/90" />
            <div className="h-2 w-full rounded-full bg-line" />
            <div className="h-2 w-[92%] rounded-full bg-line" />
            <div className="h-2 w-[86%] rounded-full bg-line" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="h-16 rounded-xl bg-[linear-gradient(180deg,#f6e6cf,#edd3aa)]" />
            <div className="h-16 rounded-xl bg-night/90" />
            <div className="h-16 rounded-xl bg-ember/20" />
          </div>

          <div className="mt-6 rounded-xl border border-line bg-background/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ember">
              AI insight
            </p>
            <p className="mt-1.5 text-sm leading-5 text-slate">
              12-page contract summarized. Three clauses flagged for review.
            </p>
          </div>
        </div>

        <div className="absolute -right-2 top-16 hidden w-36 rounded-2xl border border-line bg-card p-3 shadow-lg sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate">
            Status
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">Ready to share</p>
        </div>
      </div>
    </div>
  );
}
