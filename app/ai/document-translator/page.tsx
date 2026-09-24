import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DocumentTranslator } from "@/components/ai/DocumentTranslator";
import { TranslateIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "AI Document Translator | Translate PDF, Images & Scans | FileNova",
  description:
    "Translate PDFs, scanned documents, and images accurately with AI across 11 major languages. Preserves formatting, headings, names, and numbers. Export to Word (.docx) or TXT.",
};

export default function DocumentTranslatorPage() {
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
                <TranslateIcon className="size-3.5" />
                Document Translator
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                AI Document Translator
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Translate PDFs, scanned pages, and images across 11 major languages without losing
                structure. Preserves paragraphs, headings, numerical figures, and technical terms.
                Integrated Smart OCR automatically extracts text from scans.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🌍 11 major languages
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  ⚡ Fast, Balanced &amp; High Quality
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📄 PDF, Scanned PDF, JPG &amp; PNG
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📝 Word (.docx) &amp; TXT Export
                </span>
              </div>
            </div>

            {/* Document Translator Interactive Tool */}
            <DocumentTranslator />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-document-translator-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-document-translator-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How AI Document Translator Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload Document</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload digital PDFs, scanned PDFs, or JPG and PNG images up to 25 MB. We check
                    the real binary signature to ensure genuine file integrity.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Smart Extraction &amp; OCR</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Text is extracted directly from digital documents. If your document is scanned
                    or image-based, Smart OCR runs automatically to extract readable text.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">AI Translation &amp; Export</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    AI translates chunk by chunk to preserve formatting, tone, and numbers. Review
                    page-by-page, copy text, or download as TXT or editable Word (.docx).
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
