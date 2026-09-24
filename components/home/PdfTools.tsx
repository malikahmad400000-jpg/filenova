import { pdfTools } from "@/lib/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ToolCard } from "@/components/ui/ToolCard";

export function PdfTools() {
  return (
    <section id="tools" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="PDF toolkit"
          title="Everything You Need for Your PDFs"
          description="Everyday document jobs, designed to feel calm and fast — merge, split, compress, and convert without leaving FileNova."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pdfTools.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
