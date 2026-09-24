"use client";

import { useEffect, useState, type SVGProps } from "react";
import { FileUpload } from "@/components/file-upload";
import { MergePdfReorderList } from "@/components/pdf/MergePdfReorderList";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { Button } from "@/components/ui/Button";

interface MergedPdfResult {
  url: string;
  size: number;
  name: string;
  createdAt: number;
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

export function MergePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mergedResult, setMergedResult] = useState<MergedPdfResult | null>(null);

  // Maximum constraints for the Merge tool
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB per file
  const MAX_FILES = 20;

  // Cleanup object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (mergedResult?.url) {
        URL.revokeObjectURL(mergedResult.url);
      }
    };
  }, [mergedResult]);

  const handleValidationErrors = (errors: FileValidationError[]) => {
    if (errors.length > 0) {
      setErrorMessage(errors[0].message);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((f) => f !== fileToRemove));
    setErrorMessage(null);
  };

  const handleStartOver = () => {
    if (mergedResult?.url) {
      URL.revokeObjectURL(mergedResult.url);
    }
    setMergedResult(null);
    setFiles([]);
    setErrorMessage(null);
  };

  const handleMergePdf = async () => {
    if (files.length < 2 || isMerging) return;

    setIsMerging(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      // Append in the exact current order of the array
      for (const file of files) {
        formData.append("files", file, file.name);
      }

      const response = await fetch("/api/pdf/merge", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errText = "Failed to merge PDF files.";
        try {
          const json = await response.json();
          if (json?.error) {
            errText = json.error;
          }
        } catch {
          // If not JSON, use HTTP status text
          errText = `Merge failed (${response.status}: ${response.statusText})`;
        }
        setErrorMessage(errText);
        setIsMerging(false);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      setMergedResult({
        url: downloadUrl,
        size: blob.size,
        name: "filenova-merged.pdf",
        createdAt: Date.now(),
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Network error occurred while connecting to the merge service.";
      setErrorMessage(message);
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (!mergedResult) return;
    const a = document.createElement("a");
    a.href = mergedResult.url;
    a.download = mergedResult.name;
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

      {/* Success State */}
      {mergedResult ? (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-card p-6 shadow-md sm:p-10 text-center">
          <div className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircleIcon className="size-9" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            PDFs Merged Successfully!
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate sm:text-base">
            Your documents were merged in your chosen order and processed entirely in
            memory. Ready for download.
          </p>

          {/* File summary pill */}
          <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-line bg-background/80 px-5 py-3 text-xs sm:text-sm">
            <span className="font-semibold text-ink">{mergedResult.name}</span>
            <span aria-hidden="true" className="text-line">
              •
            </span>
            <span className="text-slate">{formatFileSize(mergedResult.size)}</span>
            <span aria-hidden="true" className="text-line">
              •
            </span>
            <span className="font-medium text-emerald-700">Combined from {files.length} PDFs</span>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ember px-7 py-3 text-sm font-semibold tracking-tight text-white shadow-[0_10px_24px_-12px_rgba(196,92,38,0.85)] transition-all hover:bg-ember-deep focus-ring"
            >
              <DownloadIcon className="size-4" />
              Download Merged PDF
            </button>

            <a
              href={mergedResult.url}
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
        /* Active Merge Workflow */
        <div className="space-y-6">
          {/* Uploader / Dropzone */}
          <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
            <FileUpload
              title={
                files.length === 0
                  ? "Drop PDF files here, or browse"
                  : "Add more PDFs to your merge queue"
              }
              description="Upload 2 or more PDF documents (up to 25 MB each). Order them below."
              accept={["application/pdf", ".pdf"]}
              maxSize={MAX_FILE_SIZE}
              maxFiles={MAX_FILES}
              multiple={true}
              files={files}
              onFilesChange={setFiles}
              onError={handleValidationErrors}
              disabled={isMerging}
              isProcessing={isMerging}
              showPreview={false} // Handled by our dedicated drag-and-drop reorder list
            />
          </div>

          {/* Reorderable List of Files */}
          {files.length > 0 && (
            <div className="rounded-3xl border border-line bg-card p-5 shadow-xs sm:p-7 space-y-6">
              <MergePdfReorderList
                files={files}
                onReorder={setFiles}
                onRemove={handleRemoveFile}
                disabled={isMerging}
              />

              {/* Merge Actions Footer */}
              <div className="border-t border-line/80 pt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-slate">
                  {files.length < 2 ? (
                    <span className="text-amber-700 font-medium">
                      ⚠️ Add at least {2 - files.length} more PDF file to enable merge.
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium">
                      ✓ Ready to merge {files.length} documents into one.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFiles([]);
                      setErrorMessage(null);
                    }}
                    disabled={isMerging}
                    className="rounded-full px-4 py-2.5 text-xs font-semibold text-slate hover:text-ink disabled:opacity-40 focus-ring"
                  >
                    Clear All
                  </button>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={files.length < 2 || isMerging}
                    className="w-full sm:w-auto min-w-[160px]"
                    onClick={handleMergePdf}
                  >
                    {isMerging ? (
                      <span className="inline-flex items-center gap-2">
                        <SpinnerIcon className="size-4 animate-spin text-white" />
                        Merging PDFs...
                      </span>
                    ) : (
                      `Merge ${files.length} PDFs`
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
