import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MergePdfTool } from "@/components/pdf/MergePdfTool";
import { MergeIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Merge PDF Files Online | FileNova",
  description:
    "Combine multiple PDF documents into a single organized file. Reorder pages with drag and drop, fast server-side merging, and 100% private in-memory processing.",
};

export default function MergePdfPage() {
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
                <MergeIcon className="size-3.5" />
                Merge PDF
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Combine PDF Files in Seconds
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Upload two or more PDF documents, drag them into your desired order,
                and merge them into a single clean file. Processed securely in memory.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔒 In-memory processing
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  ⇄ Drag &amp; drop reordering
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  ⚡ Fast server-side merge
                </span>
              </div>
            </div>

            {/* Merge PDF Interactive Tool */}
            <MergePdfTool />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-it-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-it-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How Merge PDF Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Select your PDFs</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Drop your documents or click to browse. You can add up to 20 files
                    (25 MB each).
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Set your sequence</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Drag items or use the arrow buttons to arrange documents in the
                    exact order you want them merged.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Download combined file</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Click Merge to generate your unified PDF instantly, preview in a new
                    tab, or download to your machine.
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
