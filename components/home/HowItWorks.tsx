import { howItWorks } from "@/lib/site";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function HowItWorks() {
  return (
    <section className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="Simple by design"
          title="How It Works"
          description="Three steps. No setup. No extra software."
        />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {howItWorks.map((item) => (
            <li
              key={item.step}
              className="relative rounded-2xl border border-line bg-card p-6"
            >
              <span className="font-mono text-sm font-semibold text-ember">
                {item.step}
              </span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate">{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
