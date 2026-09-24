import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompressPdfTool } from "@/components/pdf/CompressPdfTool";
import { CompressIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Compress PDF Files Online | FileNova",
  description:
    "Reduce PDF file size while maintaining document readability. Choose from 3 compression tiers with fast, secure in-memory server processing.",
};

export default function CompressPdfPage() {
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
                <CompressIcon className="size-3.5" />
                Compress PDF
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Reduce PDF File Size Online
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Optimize your PDF documents for emailing, web sharing, and portal uploads.
                Choose from 3 compression levels to balance file reduction and image quality.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔒 In-memory processing
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  ⚡ 3 compression tiers
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  ✨ Preserves vector text
                </span>
              </div>
            </div>

            {/* Compress PDF Interactive Tool */}
            <CompressPdfTool />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-compress-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-compress-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How FileNova Compresses PDFs
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload your PDF</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload any PDF document up to 50 MB. FileNova immediately measures
                    page count and original file size.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Choose compression level</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Select <strong>Basic</strong> for light optimization, <strong>Recommended</strong> for standard sharing, or <strong>Maximum</strong> for strict portal limits.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Inspect savings &amp; download</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Review your savings statistics (bytes saved, reduction percentage) and
                    download your optimized PDF instantly.
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
