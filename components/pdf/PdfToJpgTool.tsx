"use client";

import { useEffect, useState, type SVGProps } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { FileIcon } from "@/components/file-preview";
import { Button } from "@/components/ui/Button";

export type QualityLevel = "standard" | "high" | "maximum";

interface PagePreviewItem {
  pageNumber: number;
  filename: string;
  url: string;
  size: number;
}

interface ConversionResult {
  url: string;
  filename: string;
  contentType: string;
  totalPages: number;
  quality: QualityLevel;
  fileSize: number;
  pages: PagePreviewItem[];
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

function PhotoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path
        d="m21 15-5-5L5 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PdfToJpgTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfMeta, setPdfMeta] = useState<LoadedPdfMeta | null>(null);
  const [isReadingPdf, setIsReadingPdf] = useState(false);

  // Quality settings
  const [quality, setQuality] = useState<QualityLevel>("high");

  // State
  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  // Clean up object URLs when result changes or component unmounts
  useEffect(() => {
    return () => {
      if (result) {
        if (result.url) {
          URL.revokeObjectURL(result.url);
        }
        result.pages.forEach((page) => {
          if (page.url) {
            URL.revokeObjectURL(page.url);
          }
        });
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
    if (result) {
      if (result.url) {
        URL.revokeObjectURL(result.url);
      }
      result.pages.forEach((page) => {
        if (page.url) {
          URL.revokeObjectURL(page.url);
        }
      });
    }
    setResult(null);
    setSelectedFile(null);
    setPdfMeta(null);
    setErrorMessage(null);
    setQuality("high");
  };

  const handleConvert = async () => {
    if (!selectedFile || !pdfMeta || isConverting) return;

    setIsConverting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("quality", quality);

      const response = await fetch("/api/pdf/to-jpg", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errText = "Failed to convert PDF to JPG.";
        try {
          const json = await response.json();
          if (json?.error) {
            errText = json.error;
          }
        } catch {
          errText = `Conversion failed (${response.status}: ${response.statusText})`;
        }
        setErrorMessage(errText);
        setIsConverting(false);
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      const totalPages = parseInt(
        response.headers.get("X-Total-Pages") || pdfMeta.totalPages.toString(),
        10
      );
      const returnedQuality =
        (response.headers.get("X-Quality-Level") as QualityLevel) || quality;

      const blob = await response.blob();
      const mainDownloadUrl = URL.createObjectURL(blob);

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      const pagePreviews: PagePreviewItem[] = [];

      // Single-page PDF: Direct JPG result
      if (contentType.includes("image/jpeg") || totalPages === 1) {
        const filename = `${baseName}-page-1.jpg`;
        pagePreviews.push({
          pageNumber: 1,
          filename,
          url: mainDownloadUrl,
          size: blob.size,
        });

        setResult({
          url: mainDownloadUrl,
          filename,
          contentType: "image/jpeg",
          totalPages: 1,
          quality: returnedQuality,
          fileSize: blob.size,
          pages: pagePreviews,
        });
      } else {
        // Multi-page PDF: ZIP returned -> Unpack JPGs in browser for previews and per-page download
        const zipFilename = `${baseName}-jpg-pages.zip`;
        const zip = await JSZip.loadAsync(blob);

        const pageEntries = Object.keys(zip.files)
          .filter((name) => !zip.files[name].dir && name.endsWith(".jpg"))
          .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
            return numA - numB;
          });

        for (let i = 0; i < pageEntries.length; i++) {
          const entryName = pageEntries[i];
          const entryFile = zip.files[entryName];
          const imgArrayBuffer = await entryFile.async("arraybuffer");
          const imgBlob = new Blob([imgArrayBuffer], { type: "image/jpeg" });
          const imgUrl = URL.createObjectURL(imgBlob);

          pagePreviews.push({
            pageNumber: i + 1,
            filename: entryName,
            url: imgUrl,
            size: imgBlob.size,
          });
        }

        setResult({
          url: mainDownloadUrl,
          filename: zipFilename,
          contentType: "application/zip",
          totalPages,
          quality: returnedQuality,
          fileSize: blob.size,
          pages: pagePreviews,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Network error occurred while connecting to conversion service.";
      setErrorMessage(message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadMain = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSinglePage = (page: PagePreviewItem) => {
    const a = document.createElement("a");
    a.href = page.url;
    a.download = page.filename;
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
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-card p-6 shadow-md sm:p-10 text-center">
            <div className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircleIcon className="size-9" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Conversion Completed!
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate sm:text-base">
              {result.totalPages === 1
                ? "Your PDF page has been converted into a high-quality JPG image."
                : `All ${result.totalPages} pages have been converted into JPG images and packaged into a ZIP archive.`}
            </p>

            {/* Statistics Grid */}
            <div className="mx-auto mt-7 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-line bg-background/80 p-3.5">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                  Format
                </span>
                <span className="mt-1 block text-sm font-bold text-ink sm:text-base">
                  {result.totalPages === 1 ? "JPG Image" : "ZIP Archive"}
                </span>
              </div>

              <div className="rounded-2xl border border-line bg-background/80 p-3.5">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                  Pages
                </span>
                <span className="mt-1 block text-sm font-bold text-emerald-700 sm:text-base">
                  {result.totalPages} {result.totalPages === 1 ? "page" : "pages"}
                </span>
              </div>

              <div className="rounded-2xl border border-line bg-background/80 p-3.5">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                  Total Size
                </span>
                <span className="mt-1 block text-sm font-bold text-ink sm:text-base">
                  {formatFileSize(result.fileSize)}
                </span>
              </div>

              <div className="rounded-2xl border border-line bg-background/80 p-3.5">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                  Quality
                </span>
                <span className="mt-1 block text-sm font-bold capitalize text-ember sm:text-base">
                  {result.quality}
                </span>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleDownloadMain}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ember px-7 py-3 text-sm font-semibold tracking-tight text-white shadow-[0_10px_24px_-12px_rgba(196,92,38,0.85)] transition-all hover:bg-ember-deep focus-ring"
              >
                <DownloadIcon className="size-4" />
                {result.totalPages === 1 ? "Download JPG Image" : "Download All Pages (ZIP)"}
              </button>

              <button
                type="button"
                onClick={handleStartOver}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-card px-6 py-3 text-sm font-semibold tracking-tight text-ink hover:border-ink/30 hover:bg-white focus-ring"
              >
                <RefreshIcon className="size-4" />
                Convert Another PDF
              </button>

              <Link
                href="/#tools"
                className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-slate hover:bg-ink/5 hover:text-ink focus-ring"
              >
                Back to Tools
              </Link>
            </div>
          </div>

          {/* Generated Pages Gallery Preview */}
          {result.pages.length > 0 && (
            <div className="rounded-3xl border border-line bg-card p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-ink">
                    Generated JPG {result.pages.length === 1 ? "Preview" : "Page Previews"}
                  </h3>
                  <p className="text-xs text-slate">
                    {result.pages.length === 1
                      ? "Preview your converted page image below."
                      : "Preview each rendered page or download individual JPG files."}
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate">
                  {result.pages.length} {result.pages.length === 1 ? "image" : "images"} ready
                </span>
              </div>

              <div
                className={`grid gap-4 ${
                  result.pages.length === 1
                    ? "grid-cols-1 max-w-md mx-auto"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {result.pages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-line/80 bg-background/60 p-3.5 transition-all hover:border-ink/20 hover:shadow-xs"
                  >
                    <div>
                      {/* Image Frame */}
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={page.url}
                          alt={`Page ${page.pageNumber}`}
                          className="h-full w-full object-contain object-top"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 rounded-md bg-ink/75 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                          Page {page.pageNumber}
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="truncate font-semibold text-ink" title={page.filename}>
                          {page.filename}
                        </span>
                        <span className="shrink-0 text-slate">{formatFileSize(page.size)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-line/60">
                      <button
                        type="button"
                        onClick={() => handleDownloadSinglePage(page)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ember hover:text-white focus-ring"
                      >
                        <DownloadIcon className="size-3.5" />
                        Download JPG
                      </button>

                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex size-7 items-center justify-center rounded-xl border border-line bg-white text-slate transition-colors hover:text-ink focus-ring"
                        title="View Full Size Image in New Tab"
                        aria-label={`View Page ${page.pageNumber} in new tab`}
                      >
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Active Workflow */
        <div className="space-y-6">
          {!pdfMeta ? (
            /* Upload Dropzone */
            <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
              <FileUpload
                title="Drop a PDF file to convert to JPG, or browse"
                description="Upload exactly 1 PDF document (up to 50 MB) to convert every page into a crisp JPG."
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
            /* File Info Card & Quality Selector */
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
                  disabled={isConverting}
                  aria-label="Change PDF file"
                  title="Remove and choose another file"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 focus-ring"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>

              {/* Quality Settings */}
              <div className="rounded-3xl border border-line bg-card p-5 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink">
                    Select JPG Quality
                  </h3>
                  <p className="mt-1 text-xs text-slate">
                    Choose the resolution and compression quality for the rendered images.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Quality 1: Standard */}
                  <label
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                      quality === "standard"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isConverting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate">
                          Standard
                        </span>
                        <input
                          type="radio"
                          name="jpgQuality"
                          value="standard"
                          checked={quality === "standard"}
                          onChange={() => setQuality("standard")}
                          disabled={isConverting}
                          className="accent-ember size-4"
                        />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">Standard Quality</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        150 DPI resolution (1.5× scale). Smaller file size, fast rendering.
                        Great for messaging and emails.
                      </p>
                    </div>
                  </label>

                  {/* Quality 2: High */}
                  <label
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                      quality === "high"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isConverting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-ember/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ember">
                          Recommended
                        </span>
                        <input
                          type="radio"
                          name="jpgQuality"
                          value="high"
                          checked={quality === "high"}
                          onChange={() => setQuality("high")}
                          disabled={isConverting}
                          className="accent-ember size-4"
                        />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">High Quality</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        200 DPI resolution (2.0× scale). Sharp text and vibrant graphics.
                        Ideal for slides and web use.
                      </p>
                    </div>
                  </label>

                  {/* Quality 3: Maximum */}
                  <label
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                      quality === "maximum"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isConverting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate">
                          Ultra HD
                        </span>
                        <input
                          type="radio"
                          name="jpgQuality"
                          value="maximum"
                          checked={quality === "maximum"}
                          onChange={() => setQuality("maximum")}
                          disabled={isConverting}
                          className="accent-ember size-4"
                        />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">Maximum Quality</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        300 DPI resolution (3.0× scale). Pixel-perfect detail for printing
                        and high-resolution displays.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Information Notice */}
                <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-background/70 p-4 text-xs text-slate">
                  <PhotoIcon className="size-5 shrink-0 text-ember" />
                  <p className="leading-relaxed">
                    {pdfMeta.totalPages === 1 ? (
                      <>
                        Converting <strong>1 page</strong> into a standalone JPG file with
                        white canvas backing.
                      </>
                    ) : (
                      <>
                        Converting <strong>{pdfMeta.totalPages} pages</strong> into individual
                        JPG files bundled in a downloadable ZIP archive.
                      </>
                    )}
                  </p>
                </div>

                {/* Action Footer */}
                <div className="border-t border-line/80 pt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleStartOver}
                    disabled={isConverting}
                    className="rounded-full px-4 py-2.5 text-xs font-semibold text-slate hover:text-ink disabled:opacity-40 focus-ring"
                  >
                    Cancel / Choose Another File
                  </button>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={isConverting}
                    className="w-full sm:w-auto min-w-[170px]"
                    onClick={handleConvert}
                  >
                    {isConverting ? (
                      <span className="inline-flex items-center gap-2">
                        <SpinnerIcon className="size-4 animate-spin text-white" />
                        Rendering JPG{pdfMeta.totalPages > 1 ? "s" : ""}...
                      </span>
                    ) : (
                      `Convert ${pdfMeta.totalPages === 1 ? "Page" : "All Pages"} to JPG`
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

