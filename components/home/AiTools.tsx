import { aiTools } from "@/lib/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ToolCard } from "@/components/ui/ToolCard";

export function AiTools() {
  return (
    <section id="ai-tools" className="scroll-mt-24 bg-night text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          tone="night"
          eyebrow="Intelligence"
          title="Work Smarter with AI"
          description="Read less, decide faster. Chat, summarize, extract, and translate without copying your files into a chat window."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aiTools.map((tool) => (
            <ToolCard key={tool.name} tool={tool} tone="night" />
          ))}
        </div>
      </div>
    </section>
  );
}
