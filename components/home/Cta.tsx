import { Button } from "@/components/ui/Button";

export function Cta() {
  return (
    <section id="cta" className="scroll-mt-24 px-4 pb-16 sm:px-6 lg:px-8">
      <div
        id="pricing"
        className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#1b2230_0%,#2a2118_55%,#c45c26_160%)] px-6 py-14 text-center text-white sm:px-12"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
          Start free
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Your Documents. Simplified.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
          Convert, compress, and converse with your files in one place. Pricing
          and accounts come next — this is the workspace.
        </p>
        <div className="mt-8">
          <Button href="/signup" className="bg-gold text-night hover:bg-[#e0b56d]">
            Get Started
          </Button>
        </div>
      </div>
    </section>
  );
}
