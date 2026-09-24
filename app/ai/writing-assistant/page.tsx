import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WritingAssistant } from "@/components/ai/WritingAssistant";
import { WritingIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "AI Writing Assistant | Improve, Rewrite & Format Text | FileNova",
  description:
    "Improve, rewrite, summarize, expand, and format your documents with AI. Paste text or upload PDF, JPG, or PNG files. Choose from 8 writing modes and 4 tones. Download as TXT or Word (.docx).",
};

export default function WritingAssistantPage() {
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
                <WritingIcon className="size-3.5" />
                AI Writing Assistant
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                AI Writing Assistant
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Improve, rewrite, summarize, expand, or reformat your text with AI. Paste
                content directly or upload a PDF, JPG, or PNG document. Choose from 8 writing
                modes and 4 tones to match your exact needs.
              </p>

              {/* Feature badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  ✨ 8 writing modes
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🎨 4 tone options
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📄 PDF, JPG &amp; PNG input
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📝 TXT &amp; Word (.docx) export
                </span>
              </div>
            </div>

            {/* Main Tool */}
            <WritingAssistant />

            {/* How It Works */}
            <section
              aria-labelledby="how-writing-assistant-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-writing-assistant-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How AI Writing Assistant Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Choose Mode &amp; Tone</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Select one of 8 writing modes — Improve, Rewrite, Summarize, Expand,
                    Formal, Casual, Bullet Points, or Email — plus a tone that fits your
                    audience.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Add Your Content</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Paste text directly or upload a PDF, JPG, or PNG file up to 10 MB. Smart
                    OCR automatically extracts text from scanned documents and images.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Copy or Download</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Review your AI-processed result. Copy it to clipboard or download as a
                    plain TXT file or a formatted Word (.docx) document ready for editing.
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
