import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DocumentQa } from "@/components/ai/DocumentQa";
import { QaIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Document Q&A | AI Question Answering with Citations | FileNova",
  description:
    "Ask questions and get instant AI answers from any document. Supports PDFs, scanned documents, and image files with precise source citations and zero permanent data retention.",
};

export default function DocumentQaPage() {
  return (
    <div className="min-h-screen bg-background text-ink flex flex-col justify-between">
      <div>
        <Navbar />

        <main id="main" className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-4xl">
            {/* Breadcrumb */}
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
                <QaIcon className="size-3.5" />
                Document Q&amp;A
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Document Q&amp;A
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Ask questions and get instant AI answers grounded strictly in your files. Supports
                digital PDFs, scanned paperwork, and photo documents with verified page citations and
                intelligent semantic search.
              </p>

              {/* Feature Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📄 Digital &amp; Scanned PDFs
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📸 JPG &amp; PNG Documents
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📌 Precise Page Citations
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔍 BM25 Semantic Retrieval
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🛡️ Zero Document Training
                </span>
              </div>
            </div>

            {/* Main Interactive Tool */}
            <DocumentQa />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-document-qa-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-document-qa-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How Document Q&amp;A Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload Document</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload any PDF, scanned contract, or image document up to 25 MB. Built-in OCR
                    automatically processes scanned files.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Semantic Indexing</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    The document is chunked and indexed in an in-memory session store with BM25
                    term weighting and paragraph proximity scoring.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Grounded AI Answers</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Ask questions and receive instant answers referencing specific pages, with
                    protection against hallucinations and prompt injection.
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
