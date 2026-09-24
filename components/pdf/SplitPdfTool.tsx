"use client";

import { useEffect, useState, type SVGProps } from "react";
import { PDFDocument } from "pdf-lib";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { FileIcon } from "@/components/file-preview";
import { Button } from "@/components/ui/Button";

type SplitMode = "range" | "all";

interface SplitResult {
  url: string;
  size: number;
  name: string;
  isZip: boolean;
  pageSummary: string;
}

interface LoadedPdfMeta {
  file: File;
  totalPages: number;
}

function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8.5 12 2.5 2.5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M10 3.5v9m0 0-3.5-3.5M10 12.5l3.5-3.5M3.5 14.5v1a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M3.5 10a6.5 6.5 0 1 1 1.9 4.6M3.5 15v-5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalLinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="M6 3.5H3.5A1.5 1.5 0 0 0 2 5v7.5A1.5 1.5 0 0 0 3.5 14H11a1.5 1.5 0 0 0 1.5-1.5V10M9.5 2h4.5v4.5M6.5 9.5 14 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="opacity-25"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M10 2.5 1.5 17.5h17L10 2.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 7.5v4.5M10 14.5h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="m4 4 8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SplitPdfTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfMeta, setPdfMeta] = useState<LoadedPdfMeta | null>(null);
  const [isReadingPdf, setIsReadingPdf] = useState(false);

  // Split settings
  const [mode, setMode] = useState<SplitMode>("range");
  const [startPage, setStartPage] = useState<string>("1");
  const [endPage, setEndPage] = useState<string>("1");

  // Processing & results
  const [isSplitting, setIsSplitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null);

  // Maximum single file size
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (splitResult?.url) {
        URL.revokeObjectURL(splitResult.url);
      }
    };
  }, [splitResult]);

  // When a file is chosen, read its page count using pdf-lib
  const handleFilesChange = async (files: File[]) => {
    if (files.length === 0) {
      handleStartOver();
      return;
    }

    const file = files[0];
    setSelectedFile(file);
    setErrorMessage(null);
    setIsReadingPdf(true);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = doc.getPageCount();

      if (pages === 0) {
        setErrorMessage("The uploaded PDF contains no readable pages.");
        setIsReadingPdf(false);
        return;
      }

      setPdfMeta({
        file,
        totalPages: pages,
      });

      // Default start and end
      setStartPage("1");
      setEndPage(pages.toString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse document";
      setErrorMessage(
        `Could not read PDF structure: ${msg}. Make sure the file is not password-protected.`
      );
      setPdfMeta(null);
    } finally {
      setIsReadingPdf(false);
    }
  };

  const handleValidationErrors = (errors: FileValidationError[]) => {
    if (errors.length > 0) {
      setErrorMessage(errors[0].message);
    }
  };

  const handleStartOver = () => {
    if (splitResult?.url) {
      URL.revokeObjectURL(splitResult.url);
    }
    setSplitResult(null);
    setSelectedFile(null);
    setPdfMeta(null);
    setErrorMessage(null);
    setMode("range");
    setStartPage("1");
    setEndPage("1");
  };

  // Range validation
  const startNum = parseInt(startPage, 10);
  const endNum = parseInt(endPage, 10);
  const totalPages = pdfMeta?.totalPages ?? 0;

  const isRangeValid =
    !Number.isNaN(startNum) &&
    !Number.isNaN(endNum) &&
    startNum >= 1 &&
    endNum <= totalPages &&
    startNum <= endNum;

  const getRangeValidationError = () => {
    if (Number.isNaN(startNum) || Number.isNaN(endNum)) {
      return "Start page and End page must be valid numbers.";
    }
    if (startNum < 1) {
      return "Start page must be at least 1.";
    }
    if (endNum > totalPages) {
      return `End page cannot exceed total pages (${totalPages}).`;
    }
    if (startNum > endNum) {
      return `Start page (${startNum}) cannot be greater than End page (${endNum}).`;
    }
    return null;
  };

  const rangeError = mode === "range" && pdfMeta ? getRangeValidationError() : null;

  const handleExecuteSplit = async () => {
    if (!selectedFile || !pdfMeta || isSplitting) return;

    if (mode === "range" && !isRangeValid) {
      setErrorMessage(rangeError || "Please provide a valid page range.");
      return;
    }

    setIsSplitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", mode);

      if (mode === "range") {
        formData.append("startPage", startNum.toString());
        formData.append("endPage", endNum.toString());
      }

      const response = await fetch("/api/pdf/split", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errText = "Failed to split PDF.";
        try {
          const json = await response.json();
          if (json?.error) {
            errText = json.error;
          }
        } catch {
          errText = `Split failed (${response.status}: ${response.statusText})`;
        }
        setErrorMessage(errText);
        setIsSplitting(false);
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      const isZip = contentType.includes("application/zip");
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      const outputName = isZip
        ? `${baseName}-split-pages.zip`
        : `${baseName}-pages-${startNum}-to-${endNum}.pdf`;

      const summary =
        mode === "range"
          ? `Pages ${startNum} to ${endNum} (${endNum - startNum + 1} page${
              endNum - startNum + 1 > 1 ? "s" : ""
            })`
          : `All ${totalPages} individual page PDFs`;

      setSplitResult({
        url: downloadUrl,
        size: blob.size,
        name: outputName,
        isZip,
        pageSummary: summary,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Network error occurred while connecting to the split service.";
      setErrorMessage(message);
    } finally {
      setIsSplitting(false);
    }
  };

  const handleDownload = () => {
    if (!splitResult) return;
    const a = document.createElement("a");
    a.href = splitResult.url;
    a.download = splitResult.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-900 shadow-xs sm:text-sm"
        >
          <AlertIcon className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-950">Action required</p>
            <p className="mt-0.5 leading-relaxed text-red-800">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 hover:text-red-900 focus-ring"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success State */}
      {splitResult ? (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-card p-6 shadow-md sm:p-10 text-center">
          <div className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircleIcon className="size-9" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {splitResult.isZip
              ? "All Pages Separated Successfully!"
              : "Pages Extracted Successfully!"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate sm:text-base">
            {splitResult.isZip
              ? `Every page was converted into an individual PDF file and archived into a single ZIP file.`
              : `Your selected page range has been packaged into a new high-quality PDF document.`}
          </p>

          {/* Result details pill */}
          <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-line bg-background/80 px-5 py-3 text-xs sm:text-sm">
            <span className="font-semibold text-ink">{splitResult.name}</span>
            <span aria-hidden="true" className="text-line">
              •
            </span>
            <span className="text-slate">{formatFileSize(splitResult.size)}</span>
            <span aria-hidden="true" className="text-line">
              •
            </span>
            <span className="font-medium text-emerald-700">
              {splitResult.pageSummary}
            </span>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ember px-7 py-3 text-sm font-semibold tracking-tight text-white shadow-[0_10px_24px_-12px_rgba(196,92,38,0.85)] transition-all hover:bg-ember-deep focus-ring"
            >
              <DownloadIcon className="size-4" />
              {splitResult.isZip ? "Download ZIP" : "Download PDF"}
            </button>

            {!splitResult.isZip && (
              <a
                href={splitResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-card px-6 py-3 text-sm font-semibold tracking-tight text-ink hover:border-ink/30 hover:bg-white focus-ring"
              >
                <ExternalLinkIcon className="size-4" />
                Preview in New Tab
              </a>
            )}

            <button
              type="button"
              onClick={handleStartOver}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-slate hover:bg-ink/5 hover:text-ink focus-ring"
            >
              <RefreshIcon className="size-4" />
              Start Over
            </button>
          </div>
        </div>
      ) : (
        /* Active Split Workflow */
        <div className="space-y-6">
          {/* Uploader (shown when no file is active) */}
          {!pdfMeta ? (
            <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
              <FileUpload
                title="Drop a PDF file here, or browse"
                description="Upload exactly 1 PDF document (up to 25 MB) to split into pages or ranges."
                accept={["application/pdf", ".pdf"]}
                maxSize={MAX_FILE_SIZE}
                maxFiles={1}
                multiple={false}
                onFilesChange={handleFilesChange}
                onError={handleValidationErrors}
                disabled={isReadingPdf}
                isProcessing={isReadingPdf}
                processingMessage="Reading document structure..."
                showPreview={false}
              />
            </div>
          ) : (
            /* Selected PDF Information Card & Mode Configuration */
            <div className="space-y-6">
              {/* Document Info Card */}
              <div className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-card p-4 sm:p-6 shadow-xs">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="shrink-0">
                    <FileIcon file={pdfMeta.file} className="size-11 sm:size-12" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="truncate text-base font-semibold tracking-tight text-ink"
                      title={pdfMeta.file.name}
                    >
                      {pdfMeta.file.name}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate">
                      <span>{formatFileSize(pdfMeta.file.size)}</span>
                      <span aria-hidden="true" className="text-line">
                        •
                      </span>
                      <span className="inline-flex items-center rounded-md bg-ember/10 px-2 py-0.5 font-semibold text-ember">
                        {pdfMeta.totalPages} {pdfMeta.totalPages === 1 ? "page" : "pages"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartOver}
                  disabled={isSplitting}
                  aria-label="Change PDF file"
                  title="Remove and choose another file"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 focus-ring"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>

              {/* Splitting Mode Selection */}
              <div className="rounded-3xl border border-line bg-card p-5 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink">
                    Choose Splitting Mode
                  </h3>
                  <p className="mt-1 text-xs text-slate">
                    Select how you would like to split this {pdfMeta.totalPages}-page document.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Mode A Option Card */}
                  <label
                    className={`relative flex cursor-pointer flex-col rounded-2xl border p-4 transition-all duration-150 ${
                      mode === "range"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isSplitting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        Mode A: Extract Page Range
                      </span>
                      <input
                        type="radio"
                        name="splitMode"
                        value="range"
                        checked={mode === "range"}
                        onChange={() => setMode("range")}
                        disabled={isSplitting}
                        className="accent-ember size-4"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate">
                      Extract a custom continuous sequence of pages into a single new PDF document.
                    </p>
                  </label>

                  {/* Mode B Option Card */}
                  <label
                    className={`relative flex cursor-pointer flex-col rounded-2xl border p-4 transition-all duration-150 ${
                      mode === "all"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isSplitting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        Mode B: Split Every Page
                      </span>
                      <input
                        type="radio"
                        name="splitMode"
                        value="all"
                        checked={mode === "all"}
                        onChange={() => setMode("all")}
                        disabled={isSplitting}
                        className="accent-ember size-4"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate">
                      Separate every page into its own 1-page PDF file and bundle them into a ZIP archive.
                    </p>
                  </label>
                </div>

                {/* Mode A Inputs: Start Page and End Page */}
                {mode === "range" ? (
                  <div className="rounded-2xl border border-line/80 bg-background/70 p-5 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                      Page Range Configuration
                    </h4>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Start Page Input */}
                      <div>
                        <label
                          htmlFor="start-page-input"
                          className="block text-xs font-semibold text-ink"
                        >
                          Start Page
                        </label>
                        <input
                          id="start-page-input"
                          type="number"
                          min="1"
                          max={pdfMeta.totalPages}
                          value={startPage}
                          onChange={(e) => setStartPage(e.target.value)}
                          disabled={isSplitting}
                          aria-describedby="range-validation-msg"
                          className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2 text-sm text-ink focus-ring disabled:opacity-50"
                        />
                        <span className="mt-1 block text-[11px] text-slate">
                          Minimum: 1
                        </span>
                      </div>

                      {/* End Page Input */}
                      <div>
                        <label
                          htmlFor="end-page-input"
                          className="block text-xs font-semibold text-ink"
                        >
                          End Page
                        </label>
                        <input
                          id="end-page-input"
                          type="number"
                          min="1"
                          max={pdfMeta.totalPages}
                          value={endPage}
                          onChange={(e) => setEndPage(e.target.value)}
                          disabled={isSplitting}
                          aria-describedby="range-validation-msg"
                          className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2 text-sm text-ink focus-ring disabled:opacity-50"
                        />
                        <span className="mt-1 block text-[11px] text-slate">
                          Maximum: {pdfMeta.totalPages}
                        </span>
                      </div>
                    </div>

                    {/* Inline range error or preview note */}
                    <div id="range-validation-msg" className="pt-1 text-xs">
                      {rangeError ? (
                        <p className="font-semibold text-red-600">⚠️ {rangeError}</p>
                      ) : isRangeValid ? (
                        <p className="text-slate">
                          Will extract <strong>{endNum - startNum + 1}</strong> pages (pages{" "}
                          <strong>{startNum}</strong> through <strong>{endNum}</strong>).
                        </p>
                      ) : null}
                    </div>

                    {/* Preset range helpers */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-3 text-xs">
                      <span className="text-slate font-medium">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStartPage("1");
                          setEndPage(pdfMeta.totalPages.toString());
                        }}
                        disabled={isSplitting}
                        className="rounded-md border border-line bg-card px-2.5 py-1 text-xs hover:border-ember hover:text-ember focus-ring"
                      >
                        All Pages (1–{pdfMeta.totalPages})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStartPage("1");
                          setEndPage("1");
                        }}
                        disabled={isSplitting}
                        className="rounded-md border border-line bg-card px-2.5 py-1 text-xs hover:border-ember hover:text-ember focus-ring"
                      >
                        First Page Only
                      </button>
                      {pdfMeta.totalPages > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setStartPage(pdfMeta.totalPages.toString());
                            setEndPage(pdfMeta.totalPages.toString());
                          }}
                          disabled={isSplitting}
                          className="rounded-md border border-line bg-card px-2.5 py-1 text-xs hover:border-ember hover:text-ember focus-ring"
                        >
                          Last Page Only ({pdfMeta.totalPages})
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Mode B Summary Box */
                  <div className="rounded-2xl border border-line/80 bg-background/70 p-5 text-xs text-slate space-y-2">
                    <p className="font-semibold text-ink">
                      Split Every Page Configuration
                    </p>
                    <p className="leading-relaxed">
                      This will produce <strong>{pdfMeta.totalPages}</strong> individual PDF
                      documents:
                    </p>
                    <div className="font-mono text-[11px] text-ember space-y-0.5">
                      <p>• page-1.pdf</p>
                      <p>• page-2.pdf</p>
                      {pdfMeta.totalPages > 2 && (
                        <p>• ... up to page-{pdfMeta.totalPages}.pdf</p>
                      )}
                    </div>
                    <p className="pt-1 text-slate">
                      All files will be compiled and delivered inside a compressed ZIP archive.
                    </p>
                  </div>
                )}

                {/* Action Footer */}
                <div className="border-t border-line/80 pt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleStartOver}
                    disabled={isSplitting}
                    className="rounded-full px-4 py-2.5 text-xs font-semibold text-slate hover:text-ink disabled:opacity-40 focus-ring"
                  >
                    Cancel / Choose Another File
                  </button>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={isSplitting || (mode === "range" && !isRangeValid)}
                    className="w-full sm:w-auto min-w-[170px]"
                    onClick={handleExecuteSplit}
                  >
                    {isSplitting ? (
                      <span className="inline-flex items-center gap-2">
                        <SpinnerIcon className="size-4 animate-spin text-white" />
                        Splitting PDF...
                      </span>
                    ) : mode === "range" ? (
                      `Extract Pages ${startNum}–${endNum}`
                    ) : (
                      `Split into ${pdfMeta.totalPages} PDFs`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
