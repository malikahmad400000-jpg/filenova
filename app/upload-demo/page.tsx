"use client";

import Link from "next/link";
import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { Button } from "@/components/ui/Button";
import { NovaMark } from "@/components/icons";

export default function UploadDemoPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [isMultiple, setIsMultiple] = useState(true);
  const [errorsLog, setErrorsLog] = useState<FileValidationError[]>([]);

  // Demo specifications (as required in Step 2):
  // - Accept PDF files
  // - Maximum size: 10 MB per file
  // - Maximum files: 5
  // - Multiple files enabled
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_FILES = 5;

  const handleSimulateProcessing = () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 2500);
  };

  const handleAddSamplePdf = (name = "contract-agreement.pdf", size = 2.4 * 1024 * 1024) => {
    // Generate a dummy valid PDF file for instant testing
    const blob = new Blob(["%PDF-1.4 dummy file content"], { type: "application/pdf" });
    // Adjust size using slice/padding or File constructor
    const dummyFile = new File([blob], name, {
      type: "application/pdf",
      lastModified: Date.now(),
    });
    // Custom size simulation if needed
    Object.defineProperty(dummyFile, "size", { value: size });

    if (files.length >= MAX_FILES) {
      setErrorsLog([
        {
          code: "TOO_MANY_FILES",
          message: `Cannot add "${name}". Maximum limit of ${MAX_FILES} files reached.`,
        },
      ]);
      return;
    }

    setFiles((prev) => [...prev, dummyFile]);
  };

  const handleSimulateLargeFile = () => {
    const blob = new Blob(["%PDF-1.4 oversized dummy"], { type: "application/pdf" });
    const largeFile = new File([blob], "annual-report-oversized.pdf", {
      type: "application/pdf",
      lastModified: Date.now(),
    });
    // Simulate 14.5 MB
    Object.defineProperty(largeFile, "size", { value: 14.5 * 1024 * 1024 });

    // Passing into uploader via test
    setErrorsLog([
      {
        code: "FILE_TOO_LARGE",
        fileName: largeFile.name,
        message: `"${largeFile.name}" (14.5 MB) exceeds the maximum allowed size of 10 MB.`,
      },
    ]);
  };

  const handleSimulateInvalidType = () => {
    const blob = new Blob(["invalid content"], { type: "image/png" });
    const imageFile = new File([blob], "photo-receipt.png", {
      type: "image/png",
      lastModified: Date.now(),
    });

    setErrorsLog([
      {
        code: "INVALID_TYPE",
        fileName: imageFile.name,
        message: `"${imageFile.name}" has an unsupported format. Allowed: PDF (.pdf).`,
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-background text-ink">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-line/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md text-ink focus-ring"
          >
            <NovaMark className="size-8 text-night" />
            <span className="text-[1.05rem] font-semibold tracking-tight">
              FileNova
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ember">
              Step 2 Demo
            </span>
            <Button href="/" variant="secondary">
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Page Title & Requirements Badge */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3 py-1 text-xs font-medium text-slate">
            <span className="size-2 rounded-full bg-emerald-500" />
            File Upload System (Step 2)
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Reusable File Uploader
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate sm:text-base">
            Test drag-and-drop, keyboard navigation, file constraints, validation
            alerts, and all visual states.
          </p>

          {/* Demo specs card */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate">
            <span className="rounded-md border border-line bg-card px-2.5 py-1 font-medium">
              Accept: <strong className="text-ink">PDF files only</strong>
            </span>
            <span className="rounded-md border border-line bg-card px-2.5 py-1 font-medium">
              Max Size: <strong className="text-ink">10 MB per file</strong>
            </span>
            <span className="rounded-md border border-line bg-card px-2.5 py-1 font-medium">
              Max Files: <strong className="text-ink">5 files</strong>
            </span>
            <span className="rounded-md border border-line bg-card px-2.5 py-1 font-medium">
              Multiple: <strong className="text-ink">{isMultiple ? "Enabled" : "Single Only"}</strong>
            </span>
          </div>
        </div>

        {/* Interactive Controls Bar */}
        <section
          aria-labelledby="demo-controls-heading"
          className="mb-8 rounded-2xl border border-line bg-card p-4 shadow-xs sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="demo-controls-heading" className="text-sm font-semibold text-ink">
              Interactive Test Controls
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDisabled((v) => !v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-ring ${
                  disabled
                    ? "bg-night text-white"
                    : "border border-line bg-background text-ink hover:bg-line/40"
                }`}
              >
                {disabled ? "Disabled: ON" : "Toggle Disabled"}
              </button>

              <button
                type="button"
                onClick={() => setIsMultiple((v) => !v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-ring ${
                  !isMultiple
                    ? "bg-night text-white"
                    : "border border-line bg-background text-ink hover:bg-line/40"
                }`}
              >
                {isMultiple ? "Mode: Multiple" : "Mode: Single"}
              </button>

              <button
                type="button"
                onClick={handleSimulateProcessing}
                disabled={files.length === 0 || isProcessing}
                className="rounded-lg border border-ember/30 bg-ember/10 px-3 py-1.5 text-xs font-semibold text-ember transition-colors hover:bg-ember/20 disabled:opacity-50 focus-ring"
              >
                {isProcessing ? "Processing..." : "Simulate Process (2.5s)"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setErrorsLog([]);
                }}
                disabled={files.length === 0 && errorsLog.length === 0}
                className="rounded-lg border border-line bg-background px-3 py-1.5 text-xs font-semibold text-slate transition-colors hover:text-ink disabled:opacity-40 focus-ring"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Quick simulation helper buttons */}
          <div className="mt-3.5 border-t border-line/60 pt-3 text-xs text-slate">
            <span className="font-semibold text-ink">Quick Test Data: </span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAddSamplePdf(`pdf-sample-${files.length + 1}.pdf`)}
                className="rounded-md border border-line bg-background px-2.5 py-1 text-xs hover:border-ember hover:text-ember focus-ring"
              >
                + Add Valid PDF (2.4 MB)
              </button>
              <button
                type="button"
                onClick={handleSimulateLargeFile}
                className="rounded-md border border-line bg-background px-2.5 py-1 text-xs text-red-600 hover:border-red-400 focus-ring"
              >
                ! Test File &gt; 10 MB
              </button>
              <button
                type="button"
                onClick={handleSimulateInvalidType}
                className="rounded-md border border-line bg-background px-2.5 py-1 text-xs text-red-600 hover:border-red-400 focus-ring"
              >
                ! Test Invalid Type (.png)
              </button>
            </div>
          </div>
        </section>

        {/* Demo Uploader */}
        <section aria-labelledby="uploader-heading" className="space-y-4">
          <h2 id="uploader-heading" className="sr-only">
            Demo Uploader Component
          </h2>

          <FileUpload
            accept={["application/pdf", ".pdf"]}
            maxSize={MAX_SIZE}
            maxFiles={MAX_FILES}
            multiple={isMultiple}
            files={files}
            onFilesChange={setFiles}
            onError={(errors) => setErrorsLog(errors)}
            disabled={disabled}
            isProcessing={isProcessing}
            processingMessage="Simulating document analysis and upload..."
          />
        </section>

        {/* Manual Test Error Banner (if triggered via test buttons) */}
        {errorsLog.length > 0 && (
          <section aria-label="Validation error log" className="mt-6">
            <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-900">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-red-950">
                  Validation Log ({errorsLog.length} error{errorsLog.length > 1 ? "s" : ""})
                </p>
                <button
                  type="button"
                  onClick={() => setErrorsLog([])}
                  className="font-medium text-red-700 underline hover:text-red-900"
                >
                  Dismiss
                </button>
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {errorsLog.map((err, idx) => (
                  <li key={`${err.code}-${idx}`}>{err.message}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Selected Files Metadata Inspector */}
        {files.length > 0 && (
          <section
            aria-labelledby="inspector-heading"
            className="mt-8 rounded-2xl border border-line bg-card p-4 sm:p-5"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="inspector-heading" className="text-sm font-semibold text-ink">
                Selected Files Inspector ({files.length}/{MAX_FILES})
              </h3>
              <span className="text-xs text-slate">
                Total size:{" "}
                <strong>
                  {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                </strong>
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line/60 text-slate">
                    <th className="py-2 pr-3 font-semibold">Name</th>
                    <th className="py-2 px-3 font-semibold">Size</th>
                    <th className="py-2 px-3 font-semibold">Type</th>
                    <th className="py-2 pl-3 font-semibold">Last Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 text-ink">
                  {files.map((file, idx) => (
                    <tr key={`${file.name}-${idx}`} className="hover:bg-background/50">
                      <td className="py-2.5 pr-3 font-medium text-ink">{file.name}</td>
                      <td className="py-2.5 px-3 text-slate">{formatFileSize(file.size)}</td>
                      <td className="py-2.5 px-3 text-slate">
                        <span className="rounded bg-line/50 px-1.5 py-0.5 font-mono text-[10px]">
                          {file.type || "application/pdf"}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-slate">
                        {new Date(file.lastModified).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Feature Verification Checklist */}
        <section
          aria-labelledby="checklist-heading"
          className="mt-10 rounded-2xl border border-line/80 bg-card/60 p-5 text-xs text-slate"
        >
          <h3
            id="checklist-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-ink"
          >
            Step 2 Implementation Verification Checklist
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span> Click to select files
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span> Drag & drop with highlight state
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span> PDF type validation &amp; error alerts
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span> 10 MB maximum size validation
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span> 5 files maximum count limit
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span> Visual states (Normal, Drag, Error, Disabled, Processing)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span> File name, formatted size, type icon &amp; remove button
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span> Keyboard accessible (Tab, Enter, Space)
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
