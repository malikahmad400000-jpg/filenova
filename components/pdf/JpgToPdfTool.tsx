"use client";

import { useEffect, useState, type SVGProps } from "react";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { JpgToPdfReorderList } from "@/components/pdf/JpgToPdfReorderList";
import { Button } from "@/components/ui/Button";

export type PageSizeMode = "fit" | "a4" | "letter";
export type MarginMode = "none" | "small" | "normal";

interface JpgToPdfResult {
  url: string;
  filename: string;
  totalPages: number;
  fileSize: number;
  pageSizeMode: PageSizeMode;
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

export function JpgToPdfTool() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeMode>("fit");
  const [margin, setMargin] = useState<MarginMode>("small");

  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<JpgToPdfResult | null>(null);

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB per file
  const MAX_FILES = 50;

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  const handleFilesChange = (newFiles: File[]) => {
    setErrorMessage(null);
    setSelectedFiles(newFiles);
  };

  const handleAddMoreFiles = (addedFiles: File[]) => {
    setErrorMessage(null);
    setSelectedFiles(addedFiles);
  };

  const handleValidationErrors = (errors: FileValidationError[]) => {
    if (errors.length > 0) {
      setErrorMessage(errors[0].message);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles((prev) => prev.filter((f) => f !== fileToRemove));
  };

  const handleStartOver = () => {
    if (result?.url) {
      URL.revokeObjectURL(result.url);
    }
    setResult(null);
    setSelectedFiles([]);
    setErrorMessage(null);
    setPageSize("fit");
    setMargin("small");
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0 || isConverting) return;

    setIsConverting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("pageSize", pageSize);
      formData.append("margin", pageSize === "fit" ? "none" : margin);

      const response = await fetch("/api/pdf/from-jpg", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errText = "Failed to convert images to PDF.";
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

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      // Filename from Content-Disposition header
      const disposition = response.headers.get("content-disposition") || "";
      let filename = "filenova-converted.pdf";
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }

      const totalPages = parseInt(
        response.headers.get("X-Total-Pages") || selectedFiles.length.toString(),
        10
      );

      setResult({
        url: downloadUrl,
        filename,
        totalPages,
        fileSize: blob.size,
        pageSizeMode: pageSize,
      });
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

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.filename;
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
            PDF Document Created!
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate sm:text-base">
            Successfully converted{" "}
            <strong>
              {result.totalPages} {result.totalPages === 1 ? "image" : "images"}
            </strong>{" "}
            into a genuine high-resolution PDF document.
          </p>

          {/* Statistics Grid */}
          <div className="mx-auto mt-7 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                Pages
              </span>
              <span className="mt-1 block text-sm font-bold text-ink sm:text-base">
                {result.totalPages} {result.totalPages === 1 ? "page" : "pages"}
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                PDF Size
              </span>
              <span className="mt-1 block text-sm font-bold text-emerald-700 sm:text-base">
                {formatFileSize(result.fileSize)}
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                Layout
              </span>
              <span className="mt-1 block text-sm font-bold capitalize text-ink sm:text-base">
                {result.pageSizeMode === "fit" ? "Image Fit" : result.pageSizeMode.toUpperCase()}
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                Status
              </span>
              <span className="mt-1 block text-sm font-bold text-ember sm:text-base">
                Ready
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ember px-7 py-3 text-sm font-semibold tracking-tight text-white shadow-[0_10px_24px_-12px_rgba(196,92,38,0.85)] transition-all hover:bg-ember-deep focus-ring"
            >
              <DownloadIcon className="size-4" />
              Download PDF Document
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
          {selectedFiles.length === 0 ? (
            /* Upload Dropzone */
            <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
              <FileUpload
                title="Drop JPG / JPEG images here, or browse"
                description="Upload one or multiple JPG images (up to 25 MB each) to combine into a PDF."
                accept={["image/jpeg", ".jpg", ".jpeg"]}
                maxSize={MAX_FILE_SIZE}
                maxFiles={MAX_FILES}
                multiple={true}
                onFilesChange={handleFilesChange}
                onError={handleValidationErrors}
                disabled={isConverting}
                showPreview={false}
              />
            </div>
          ) : (
            /* Image Reordering + Settings */
            <div className="space-y-6">
              {/* Interactive Image Reorder List */}
              <div className="rounded-3xl border border-line bg-card p-5 sm:p-8 shadow-xs">
                <JpgToPdfReorderList
                  files={selectedFiles}
                  onReorder={setSelectedFiles}
                  onRemove={handleRemoveFile}
                  disabled={isConverting}
                />

                {/* Add more images dropzone */}
                {selectedFiles.length < MAX_FILES && (
                  <div className="mt-6 border-t border-line/80 pt-6">
                    <FileUpload
                      title="Add more JPG images"
                      description={`Upload up to ${MAX_FILES - selectedFiles.length} additional images.`}
                      accept={["image/jpeg", ".jpg", ".jpeg"]}
                      maxSize={MAX_FILE_SIZE}
                      maxFiles={MAX_FILES}
                      multiple={true}
                      files={selectedFiles}
                      onFilesChange={handleAddMoreFiles}
                      onError={handleValidationErrors}
                      disabled={isConverting}
                      showPreview={false}
                    />
                  </div>
                )}
              </div>

              {/* Page Layout Settings */}
              <div className="rounded-3xl border border-line bg-card p-5 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink">
                    Page Layout &amp; Sizing
                  </h3>
                  <p className="mt-1 text-xs text-slate">
                    Choose how images should be fitted and sized onto PDF pages.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Mode 1: Fit to Image Dimensions */}
                  <label
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                      pageSize === "fit"
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
                          name="pageSizeMode"
                          value="fit"
                          checked={pageSize === "fit"}
                          onChange={() => setPageSize("fit")}
                          disabled={isConverting}
                          className="accent-ember size-4"
                        />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">Fit to Image Size</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        Page dimensions match image size exactly. 100% natural resolution with zero
                        cropping or borders.
                      </p>
                    </div>
                  </label>

                  {/* Mode 2: Standard A4 */}
                  <label
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                      pageSize === "a4"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isConverting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate">
                          Standard ISO
                        </span>
                        <input
                          type="radio"
                          name="pageSizeMode"
                          value="a4"
                          checked={pageSize === "a4"}
                          onChange={() => setPageSize("a4")}
                          disabled={isConverting}
                          className="accent-ember size-4"
                        />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">Standard A4</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        Standard A4 document page. Automatically orients portrait or landscape and
                        fits proportionally.
                      </p>
                    </div>
                  </label>

                  {/* Mode 3: US Letter */}
                  <label
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                      pageSize === "letter"
                        ? "border-ember bg-ember/[0.04] ring-2 ring-ember/30"
                        : "border-line bg-background/60 hover:border-ink/20 hover:bg-white"
                    } ${isConverting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate">
                          US Letter
                        </span>
                        <input
                          type="radio"
                          name="pageSizeMode"
                          value="letter"
                          checked={pageSize === "letter"}
                          onChange={() => setPageSize("letter")}
                          disabled={isConverting}
                          className="accent-ember size-4"
                        />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">US Letter</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        Standard 8.5 × 11 in page. Fits photos with proportional aspect ratio and
                        clean margins.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Margin selector if A4 or Letter is chosen */}
                {pageSize !== "fit" && (
                  <div className="rounded-2xl border border-line/80 bg-background/70 p-4 space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate">
                      Page Margin
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "none", label: "No Margin (Full Bleed)" },
                        { id: "small", label: "Small (0.25 in)" },
                        { id: "normal", label: "Normal (0.5 in)" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMargin(m.id as MarginMode)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all focus-ring ${
                            margin === m.id
                              ? "border-ember bg-ember text-white"
                              : "border-line bg-white text-ink hover:border-ink/30"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Footer */}
                <div className="border-t border-line/80 pt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleStartOver}
                      disabled={isConverting}
                      className="rounded-full px-4 py-2.5 text-xs font-semibold text-slate hover:text-ink disabled:opacity-40 focus-ring"
                    >
                      Clear All / Start Over
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={isConverting || selectedFiles.length === 0}
                    className="w-full sm:w-auto min-w-[170px]"
                    onClick={handleConvert}
                  >
                    {isConverting ? (
                      <span className="inline-flex items-center gap-2">
                        <SpinnerIcon className="size-4 animate-spin text-white" />
                        Creating PDF...
                      </span>
                    ) : (
                      `Convert ${selectedFiles.length} ${
                        selectedFiles.length === 1 ? "Image" : "Images"
                      } to PDF`
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
