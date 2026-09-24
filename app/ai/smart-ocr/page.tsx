import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SmartOcr } from "@/components/ai/SmartOcr";
import { OcrIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Smart OCR Online | Extract Text from Scanned PDFs & Images | FileNova",
  description:
    "Extract editable text from scanned PDFs, JPG, and PNG images with high-accuracy Tesseract OCR. Fast, balanced, and accurate modes with confidence scoring.",
};

export default function SmartOcrPage() {
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
                <OcrIcon className="size-3.5" />
                Smart OCR
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Smart OCR &amp; Text Extraction
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Extract searchable, editable text from scanned PDFs, receipts, photos, and document
                snapshots. Powered by Tesseract.js with intelligent image preprocessing, multi-page
                handling, and confidence scoring.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔍 High-accuracy Tesseract OCR
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  ⚡ 3 processing modes
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📄 Scanned PDF, JPG &amp; PNG
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🛡️ Zero document training
                </span>
              </div>
            </div>

            {/* Smart OCR Interactive Tool */}
            <SmartOcr />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-smart-ocr-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-smart-ocr-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How Smart OCR Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload Document or Image</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload scanned PDF documents or JPG, JPEG, and PNG images up to 25 MB. We check
                    the real binary signature to ensure genuine file integrity.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Select Accuracy Mode</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Choose Fast for rapid turnaround, Balanced for optimal everyday scans, or
                    Accurate for enhanced contrast and high-resolution rendering on faint text.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Edit, Copy &amp; Export</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Review extracted text with confidence scoring. Inspect multi-page PDFs
                    page-by-page, edit text directly in the browser, copy to clipboard, or download
                    as TXT.
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
