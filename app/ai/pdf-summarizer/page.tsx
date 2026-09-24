import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PdfSummarizer } from "@/components/ai/PdfSummarizer";
import { SummarizeIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "AI PDF Summarizer | Instant Document Summaries | FileNova",
  description:
    "Upload a PDF and get an intelligent structured summary instantly. Choose Quick, Standard, or Detailed mode. Powered by AI with source page citations.",
};

export default function PdfSummarizerPage() {
  return (
    <div className="min-h-screen bg-background text-ink flex flex-col justify-between">
      <div>
        <Navbar />

        <main id="main" className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-4xl">
            {/* Breadcrumb / Back link */}
            <div className="mb-6">
              <Link
                href="/#ai-tools"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate transition-colors hover:text-ink focus-ring rounded-md px-1 py-0.5"
              >
                <span aria-hidden="true">&larr;</span> Back to AI Tools
              </Link>
            </div>

            {/* Tool Header */}
            <div className="mb-10 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-ember/20 bg-ember/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ember">
                <SummarizeIcon className="size-3.5" />
                AI Summarizer
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                AI PDF Summarizer
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Turn long contracts, research papers, and reports into concise, structured summaries.
                Choose Quick, Standard, or Detailed depth. AI extracts key points, findings, and
                conclusions grounded in your actual document content.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📝 3 summary levels
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🧠 Hierarchical AI analysis
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📌 Source page citations
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🛡️ Zero document training
                </span>
              </div>
            </div>

            {/* PDF Summarizer Interactive Tool */}
            <PdfSummarizer />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-pdf-summarizer-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-pdf-summarizer-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How AI PDF Summarizer Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload &amp; Extract</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload any PDF up to 50 MB. The server extracts text page-by-page, preserving
                    reading order and page boundaries for accurate citation.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Choose Summary Level</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Pick Quick for a short overview, Standard for balanced depth, or Detailed for
                    comprehensive analysis including numbers, dates, and named entities.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Structured AI Summary</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Large documents are summarized hierarchically — section by section, then combined
                    — so nothing important is missed. Copy or download your summary instantly.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
