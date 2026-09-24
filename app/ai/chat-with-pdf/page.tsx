import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChatWithPdf } from "@/components/ai/ChatWithPdf";
import { ChatIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Chat with PDF Online | AI Document Assistant | FileNova",
  description:
    "Ask natural-language questions and chat with your PDF documents using AI. Accurately retrieves context and provides verified source page citations.",
};

export default function ChatWithPdfPage() {
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
                <ChatIcon className="size-3.5" />
                AI Assistant
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Chat with Your PDF
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Ask natural-language questions about contracts, financial reports, research papers,
                and manuals. FileNova retrieves relevant document chunks and grounds answers with
                exact page citations.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔒 In-memory session indexing
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🧠 Semantic retrieval
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📌 Exact page citations
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🛡️ Zero document training
                </span>
              </div>
            </div>

            {/* Chat with PDF Interactive Tool */}
            <ChatWithPdf />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-chat-with-pdf-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-chat-with-pdf-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How Chat with PDF Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload &amp; Index</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload any PDF up to 50 MB. Our server extracts text page-by-page and splits it
                    into searchable semantic chunks while tracking page coordinates.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Smart Retrieval</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    When you ask a question, our retrieval engine identifies the most relevant
                    sections rather than dumping the whole document, reducing costs and latency.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Grounded Answers with Citations</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    The AI synthesizes answers grounded strictly on the retrieved facts and includes
                    direct source page numbers so you can verify statements instantly.
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
