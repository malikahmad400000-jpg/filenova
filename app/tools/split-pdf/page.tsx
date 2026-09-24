import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SplitPdfTool } from "@/components/pdf/SplitPdfTool";
import { SplitIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Split PDF Files Online | FileNova",
  description:
    "Extract specific page ranges from a PDF or split every page into individual PDF documents. Fast, secure, and processed 100% in-memory.",
};

export default function SplitPdfPage() {
  return (
    <div className="min-h-screen bg-background text-ink flex flex-col justify-between">
      <div>
        <Navbar />

        <main id="main" className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-4xl">
            {/* Breadcrumb / Back link */}
            <div className="mb-6">
              <Link
                href="/#tools"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate transition-colors hover:text-ink focus-ring rounded-md px-1 py-0.5"
              >
                <span aria-hidden="true">&larr;</span> Back to Tools
              </Link>
            </div>

            {/* Tool Header */}
            <div className="mb-10 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ember">
                <SplitIcon className="size-3.5" />
                Split PDF
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Split PDF into Pages or Ranges
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Extract specific page ranges into a fresh PDF, or separate every single
                page and download them all bundled together in a ZIP file.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔒 In-memory processing
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📄 Page range extraction
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📦 ZIP archive export
                </span>
              </div>
            </div>

            {/* Split PDF Interactive Tool */}
            <SplitPdfTool />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-split-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-split-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How Split PDF Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload your PDF</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload a single PDF document. FileNova immediately determines the
                    total page count.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Choose your split mode</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Pick <strong>Mode A</strong> to extract a continuous range of
                    pages (e.g. 2–5), or <strong>Mode B</strong> to separate every
                    single page.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Download your result</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Download your extracted PDF directly, or download a ZIP archive
                    containing all separated page documents.
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
