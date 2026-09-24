"use client";

import { useEffect, useState, type SVGProps } from "react";
import { PDFDocument } from "pdf-lib";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { FileIcon } from "@/components/file-preview";
import { Button } from "@/components/ui/Button";

export type CompressionLevel = "basic" | "recommended" | "maximum";

interface CompressionResult {
  url: string;
  name: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  reductionPercent: number;
  isAlreadyOptimized: boolean;
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

export function CompressPdfTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfMeta, setPdfMeta] = useState<LoadedPdfMeta | null>(null);
  const [isReadingPdf, setIsReadingPdf] = useState(false);

  // Compression configuration
  const [level, setLevel] = useState<CompressionLevel>("recommended");

  // State
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parsing error";
      setErrorMessage(
        `Could not read PDF structure: ${msg}. Make sure the file is not corrupted or password-protected.`
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
    if (result?.url) {
      URL.revokeObjectURL(result.url);
    }
    setResult(null);
    setSelectedFile(null);
    setPdfMeta(null);
    setErrorMessage(null);
    setLevel("recommended");
  };

  const handleCompress = async () => {
    if (!selectedFile || !pdfMeta || isCompressing) return;

    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("level", level);

      const response = await fetch("/api/pdf/compress", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errText = "Failed to compress PDF.";
        try {
          const json = await response.json();
          if (json?.error) {
            errText = json.error;
          }
        } catch {
          errText = `Compression failed (${response.status}: ${response.statusText})`;
        }
        setErrorMessage(errText);
        setIsCompressing(false);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      // Extract statistics from headers
      const originalSize = parseInt(
        response.headers.get("X-Original-Size") || selectedFile.size.toString(),
        10
      );
      const compressedSize = parseInt(
        response.headers.get("X-Compressed-Size") || blob.size.toString(),
        10
      );
      const savedBytes = parseInt(
        response.headers.get("X-Saved-Bytes") ||
          Math.max(0, originalSize - compressedSize).toString(),
        10
      );
      const reductionPercent = parseInt(
        response.headers.get("X-Reduction-Percent") ||
          (originalSize > 0
            ? Math.round(((originalSize - compressedSize) / originalSize) * 100).toString()
            : "0"),
        10
      );
      const isAlreadyOptimized =
        response.headers.get("X-Already-Optimized") === "true" || savedBytes <= 0;

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      const outputName = `${baseName}-compressed.pdf`;

      setResult({
        url: downloadUrl,
        name: outputName,
        originalSize,
        compressedSize,
        savedBytes,
        reductionPercent: Math.max(0, reductionPercent),
        isAlreadyOptimized,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Network error occurred while connecting to compression service.";
      setErrorMessage(message);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {/* Error Alert */}
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

      {/* Result Screen */}
      {result ? (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-card p-6 shadow-md sm:p-10 text-center">
          <div className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircleIcon className="size-9" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {result.isAlreadyOptimized
              ? "PDF Document Processed!"
              : "PDF Compressed Successfully!"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate sm:text-base">
            {result.isAlreadyOptimized
              ? "This PDF was already optimally compressed. FileNova cleaned structural streams without inflating the file."
              : `Your PDF file size was reduced by ${result.reductionPercent}% while preserving document layout.`}
          </p>

          {/* Statistics Grid */}
          <div className="mx-auto mt-7 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                Original Size
              </span>
              <span className="mt-1 block text-sm font-bold text-ink sm:text-base">
                {formatFileSize(result.originalSize)}
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                Compressed
              </span>
              <span className="mt-1 block text-sm font-bold text-emerald-700 sm:text-base">
                {formatFileSize(result.compressedSize)}
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                Saved
              </span>
              <span className="mt-1 block text-sm font-bold text-ink sm:text-base">
                {formatFileSize(result.savedBytes)}
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                Reduction
              </span>
              <span className="mt-1 block text-sm font-bold text-ember sm:text-base">
                {result.reductionPercent > 0 ? `-${result.reductionPercent}%` : "0%"}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ember px-7 py-3 text-sm font-semibold tracking-tight text-white shadow-[0_10px_24px_-12px_rgba(196,92,38,0.85)] transition-all hover:bg-ember-deep focus-ring"
            >
              <DownloadIcon className="size-4" />
              Download Compressed PDF
            </button>

            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-card px-6 py-3 text-sm font-semibold tracking-tight text-ink hover:border-ink/30 hover:bg-white focus-ring"
            >
              <ExternalLinkIcon className="size-4" />
              Preview in New Tab
            </a>

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
        /* Active Workflow */
        <div className="space-y-6">
          {!pdfMeta ? (
            /* Upload Dropzone */
            <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
              <FileUpload
                title="Drop a PDF file to compress, or browse"
                description="Upload exactly 1 PDF document (up to 50 MB) to optimize file size."
                accept={["application/pdf", ".pdf"]}
                maxSize={MAX_FILE_SIZE}
                maxFiles={1}
                multiple={false}
                onFilesChange={handleFilesChange}
                onError={handleValidationErrors}
                disabled={isReadingPdf}
                isProcessing={isReadingPdf}
                processingMessage="Inspecting PDF document..."
                showPreview={false}
              />
            </div>
          ) : (
            /* File Info Card & Compression Level Selector */
            <div className="space-y-6">
              {/* Document Overview */}
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
                  disabled={isCompressing}
                  aria-label="Change PDF file"
                  title="Remove and choose another file"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 focus-ring"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>

              {/* Compression Levels */}
              <div className="rounded-3xl border border-line bg-card p-5 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink">
                    Select Compression Level
                  </h3>
                  <p className="mt-1 text-xs text-slate">
                    Choose the balance between file size reduction and image clarity.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Level 1: Basic */}
                  <label
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                      level === "basic"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isCompressing ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate">
                          Highest Quality
                        </span>
                        <input
                          type="radio"
                          name="compressionLevel"
                          value="basic"
                          checked={level === "basic"}
                          onChange={() => setLevel("basic")}
                          disabled={isCompressing}
                          className="accent-ember size-4"
                        />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">
                        Basic Compression
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        High image quality with modest file reduction. Ideal for portfolios
                        and printed documents.
                      </p>
                    </div>
                  </label>

                  {/* Level 2: Recommended */}
                  <label
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                      level === "recommended"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isCompressing ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-ember/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ember">
                          Recommended
                        </span>
                        <input
                          type="radio"
                          name="compressionLevel"
                          value="recommended"
                          checked={level === "recommended"}
                          onChange={() => setLevel("recommended")}
                          disabled={isCompressing}
                          className="accent-ember size-4"
                        />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">
                        Recommended
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        Great compression with crisp text and clean graphics. Ideal for
                        email attachments and everyday web sharing.
                      </p>
                    </div>
                  </label>

                  {/* Level 3: Maximum */}
                  <label
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                      level === "maximum"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isCompressing ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate">
                          Smallest Size
                        </span>
                        <input
                          type="radio"
                          name="compressionLevel"
                          value="maximum"
                          checked={level === "maximum"}
                          onChange={() => setLevel("maximum")}
                          disabled={isCompressing}
                          className="accent-ember size-4"
                        />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">
                        Maximum Compression
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        Maximum file size savings. May lower image resolution. Perfect for
                        stringent upload limits.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Transparency Notice */}
                <div className="rounded-2xl border border-line/80 bg-background/70 p-4 text-xs text-slate">
                  <p className="leading-relaxed">
                    ℹ️ <strong>Quality Notice:</strong> Higher compression levels downsample
                    embedded photos and compress internal streams. Vector text and page
                    layouts are always kept crisp and readable.
                  </p>
                </div>

                {/* Action Footer */}
                <div className="border-t border-line/80 pt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleStartOver}
                    disabled={isCompressing}
                    className="rounded-full px-4 py-2.5 text-xs font-semibold text-slate hover:text-ink disabled:opacity-40 focus-ring"
                  >
                    Cancel / Choose Another File
                  </button>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={isCompressing}
                    className="w-full sm:w-auto min-w-[170px]"
                    onClick={handleCompress}
                  >
                    {isCompressing ? (
                      <span className="inline-flex items-center gap-2">
                        <SpinnerIcon className="size-4 animate-spin text-white" />
                        Compressing PDF...
                      </span>
                    ) : (
                      "Compress PDF"
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
