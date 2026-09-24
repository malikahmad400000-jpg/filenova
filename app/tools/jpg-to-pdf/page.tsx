import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JpgToPdfTool } from "@/components/pdf/JpgToPdfTool";
import { ImageToPdfIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Convert JPG to PDF Online | FileNova",
  description:
    "Combine and convert JPG/JPEG images into high-quality PDF documents. Reorder images, customize page layouts, and generate clean PDFs in seconds.",
};

export default function JpgToPdfPage() {
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
                <ImageToPdfIcon className="size-3.5" />
                JPG to PDF
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Convert JPG Images to PDF Online
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Turn photos, scans, and graphic files into a single, polished PDF document.
                Reorder pages, select custom page sizing, and convert instantly with zero distortion.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔒 In-memory processing
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔄 Drag-and-drop reordering
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📐 100% proportional aspect ratio
                </span>
              </div>
            </div>

            {/* JPG to PDF Interactive Tool */}
            <JpgToPdfTool />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-jpg-to-pdf-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-jpg-to-pdf-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How JPG to PDF Conversion Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload JPG images</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Select or drag-and-drop one or multiple JPG/JPEG images (up to 25 MB each).
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Reorder &amp; configure layout</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Drag photos into your preferred page sequence. Choose between natural image dimensions
                    or standard A4/Letter paper sizes.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Download your PDF</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Click convert to produce a clean, genuine PDF file. Download or preview immediately in your browser.
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
