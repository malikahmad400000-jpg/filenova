import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { InvoiceExtractor } from "@/components/ai/InvoiceExtractor";
import { ExtractIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "AI Invoice Extractor | Automated PDF & Receipt Data Capture | FileNova",
  description:
    "Instantly extract structured data from PDF invoices, receipts, and bills using AI. Automatic capture of vendors, totals, dates, currency, and line items with JSON and CSV export.",
};

export default function InvoiceExtractorPage() {
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
                <ExtractIcon className="size-3.5" />
                AI Invoice Extractor
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                AI Invoice Extractor
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Extract totals, vendors, tax, payment terms, and itemized line tables from your
                invoices and receipts in seconds. Supports digital PDFs, scanned documents, and
                photo receipts with instant JSON and CSV export.
              </p>

              {/* Feature Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📄 Digital &amp; Scanned PDFs
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📸 JPG &amp; PNG Receipts
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📊 Itemized Line Tables
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  💾 JSON &amp; CSV Export
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🛡️ Zero Document Training
                </span>
              </div>
            </div>

            {/* Main Interactive Tool */}
            <InvoiceExtractor />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-invoice-extractor-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-invoice-extractor-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How AI Invoice Extractor Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload Document</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload any PDF invoice, bill, receipt image, or scanned document up to 25 MB.
                    Smart OCR automatically processes scans and photos.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Structured AI Extraction</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Gemini AI identifies vendor information, invoice IDs, issue/due dates, subtotal,
                    taxes, and every itemized line item with strict schema validation.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Review &amp; Export</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Verify extracted fields in a clear responsive dashboard. Download as structured
                    JSON, export to CSV for spreadsheets, or copy to your clipboard.
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
