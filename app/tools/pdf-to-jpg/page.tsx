import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PdfToJpgTool } from "@/components/pdf/PdfToJpgTool";
import { JpgIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Convert PDF to JPG Online | FileNova",
  description:
    "Convert PDF pages into high-resolution JPG images. Download single-page JPGs directly or multi-page documents as a tidy ZIP archive.",
};

export default function PdfToJpgPage() {
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
                <JpgIcon className="size-3.5" />
                PDF to JPG
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Convert PDF Pages to JPG Images
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Render every page of your PDF document into crisp, high-fidelity JPG images.
                Download single pages directly or get all pages packaged into a single ZIP archive.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔒 Secure in-memory processing
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🖼️ 3 quality options (up to 300 DPI)
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📦 Automatic ZIP packaging for multi-page
                </span>
              </div>
            </div>

            {/* PDF to JPG Interactive Tool */}
            <PdfToJpgTool />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-pdf-to-jpg-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-pdf-to-jpg-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How PDF to JPG Conversion Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload your PDF</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload any PDF document up to 50 MB. FileNova counts pages and verifies document
                    integrity in your browser.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Choose JPG quality</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Select <strong>Standard</strong> for smaller files, <strong>High</strong> for
                    presentations, or <strong>Maximum</strong> for crystal-clear prints.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Preview &amp; download</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Preview generated images instantly. Download single JPG files or grab all pages
                    at once in a convenient ZIP file.
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
