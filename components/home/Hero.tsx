import { Button } from "@/components/ui/Button";
import { DocumentPreview } from "@/components/home/DocumentPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_80%_-10%,rgba(196,92,38,0.16),transparent),radial-gradient(700px_320px_at_0%_20%,rgba(212,160,86,0.14),transparent)]" />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-line bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ember">
            FileNova
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
            Powerful File Tools. Smarter with AI.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate sm:text-lg">
            FileNova helps you manage, convert, compress, and work with
            documents — then layers on AI so summaries, extraction, and answers
            are a click away.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" className="w-full sm:w-auto">
              Get Started
            </Button>
            <Button href="#tools" variant="secondary" className="w-full sm:w-auto">
              Explore Tools
            </Button>
          </div>
        </div>
        <DocumentPreview />
      </div>
    </section>
  );
}
