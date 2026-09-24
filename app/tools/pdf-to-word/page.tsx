import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PdfToWordTool } from "@/components/pdf/PdfToWordTool";
import { WordIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Convert PDF to Word (.docx) Online | FileNova",
  description:
    "Convert PDF documents into fully editable Microsoft Word (.docx) files. Accurately extracts text, headings, paragraphs, and tables.",
};

export default function PdfToWordPage() {
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
                <WordIcon className="size-3.5" />
                PDF to Word
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Convert PDF to Editable Word (.docx)
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
                Transform PDF documents into editable Microsoft Word (.docx) files.
                Accurately preserves paragraphs, detect headings, reconstruct tables, and extract embedded images.
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  🔒 In-memory processing
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📝 Genuine OpenXML .docx
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1 font-medium">
                  📊 Editable tables &amp; headings
                </span>
              </div>
            </div>

            {/* PDF to Word Interactive Tool */}
            <PdfToWordTool />

            {/* How It Works Guide */}
            <section
              aria-labelledby="how-pdf-to-word-works-heading"
              className="mt-16 rounded-3xl border border-line bg-card/50 p-6 sm:p-10"
            >
              <h2
                id="how-pdf-to-word-works-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate"
              >
                How PDF to Word Conversion Works
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Upload your PDF</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Upload any PDF document up to 50 MB. FileNova analyzes the document structure and page count in your browser.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Structural Extraction</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    The conversion engine reads text items, evaluates font hierarchy for headings, and builds editable tables.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-line text-xs font-bold text-ink">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Download Word Document</h3>
                  <p className="text-xs leading-relaxed text-slate">
                    Download your native <strong>.docx</strong> file ready to open and edit in Microsoft Word, LibreOffice, or Google Docs.
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
