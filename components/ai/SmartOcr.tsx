"use client";

import { useState, useRef, type SVGProps } from "react";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { Button } from "@/components/ui/Button";
import { OcrIcon } from "@/components/icons";
import type { OcrMode, OcrPageResult } from "@/lib/ai/ocr";

interface OcrApiResponse {
  success: boolean;
  filename: string;
  fileSize: number;
  text: string;
  pages: OcrPageResult[];
  pageCount: number;
  averageConfidence: number;
  mode: OcrMode;
  sourceType: "pdf" | "image";
}

type UiStage =
  | "upload"
  | "file-selected"
  | "preparing"
  | "processing"
  | "finalizing"
  | "result"
  | "error";

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

function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect
        x="6"
        y="6"
        width="10"
        height="11"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M14 6V4.5A1.5 1.5 0 0 0 12.5 3h-8A1.5 1.5 0 0 0 3 4.5v8A1.5 1.5 0 0 0 4.5 14H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M10 3v10M6 9l4 4 4-4M4 15h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const OCR_MODES: { value: OcrMode; label: string; description: string }[] = [
  {
    value: "fast",
    label: "Fast",
    description: "Lower render resolution. Best for clear scans and quick turnarounds.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Recommended. Balanced preprocessing & render scale for optimal accuracy.",
  },
  {
    value: "accurate",
    label: "Accurate",
    description: "High-resolution rendering & contrast tuning. Best for faint or noisy scans.",
  },
];

const STAGE_MESSAGES: Record<string, string> = {
  preparing: "Preparing scan & optimizing resolution…",
  processing: "Running Tesseract OCR text recognition…",
  finalizing: "Structuring extracted text…",
};

export function SmartOcr() {
  const [uiStage, setUiStage] = useState<UiStage>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<OcrMode>("balanced");
  const [result, setResult] = useState<OcrApiResponse | null>(null);
  const [editableText, setEditableText] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | number>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<File | null>(null);
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

  const handleFilesChange = (files: File[]) => {
    if (files.length === 0) return;
    setSelectedFile(files[0]);
    fileInputRef.current = files[0];
    setUiStage("file-selected");
    setErrorMessage(null);
    setResult(null);
    setActiveTab("all");
  };

  const handleValidationErrors = (errors: FileValidationError[]) => {
    if (errors.length > 0) {
      setErrorMessage(errors[0].message);
      setUiStage("error");
    }
  };

  const handleRunOcr = async () => {
    const file = selectedFile || fileInputRef.current;
    if (!file) return;

    setErrorMessage(null);
    setUiStage("preparing");

    // Artificial staged transitions for user responsiveness
    await new Promise((resolve) => setTimeout(resolve, 350));
    setUiStage("processing");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      const res = await fetch("/api/ai/smart-ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "OCR failed to process document.");
        setUiStage("error");
        return;
      }

      setUiStage("finalizing");
      await new Promise((resolve) => setTimeout(resolve, 200));

      setResult(data);
      setEditableText(data.text);
      setUiStage("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error during OCR processing.";
      setErrorMessage(msg);
      setUiStage("error");
    }
  };

  const handleCopy = async () => {
    const textToCopy =
      activeTab === "all" || !result
        ? editableText
        : result.pages.find((p) => p.page === activeTab)?.text || "";

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const blob = new Blob([editableText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = result.filename.replace(/\.[^/.]+$/, "");
    a.download = `${baseName}_ocr.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartOver = () => {
    setUiStage("upload");
    setSelectedFile(null);
    fileInputRef.current = null;
    setResult(null);
    setEditableText("");
    setErrorMessage(null);
    setCopied(false);
    setActiveTab("all");
  };

  const isProcessing =
    uiStage === "preparing" || uiStage === "processing" || uiStage === "finalizing";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Error Alert */}
      {errorMessage && uiStage === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-900 shadow-xs sm:text-sm"
        >
          <AlertIcon className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-950">Notice</p>
            <p className="mt-0.5 leading-relaxed text-red-800">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={handleStartOver}
            className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 hover:text-red-900 focus-ring"
          >
            Start Over
          </button>
        </div>
      )}

      {/* ── 1. Upload Dropzone ────────────────────────────────────────────── */}
      {uiStage === "upload" && (
        <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
          <FileUpload
            title="Drop your scanned PDF or image here, or browse"
            description="Supports Scanned PDF, JPG, JPEG, and PNG (up to 25 MB). Powered by high-accuracy Tesseract OCR."
            accept={[
              "application/pdf",
              ".pdf",
              "image/jpeg",
              ".jpg",
              ".jpeg",
              "image/png",
              ".png",
            ]}
            maxSize={MAX_FILE_SIZE}
            maxFiles={1}
            multiple={false}
            onFilesChange={handleFilesChange}
            onError={handleValidationErrors}
            disabled={false}
            showPreview={false}
          />
        </div>
      )}

      {/* ── 2. File Selected — Choose Mode & Execute ──────────────────────── */}
      {uiStage === "file-selected" && selectedFile && (
        <div className="rounded-3xl border border-line bg-card p-5 shadow-xs sm:p-7 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
              <OcrIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h3
                className="truncate text-sm font-semibold tracking-tight text-ink sm:text-base"
                title={selectedFile.name}
              >
                {selectedFile.name}
              </h3>
              <p className="mt-0.5 text-xs text-slate">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>

          {/* Mode Selector */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-slate mb-3">
              OCR Accuracy &amp; Speed Mode
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {OCR_MODES.map((m) => {
                const isSelected = mode === m.value;
                return (
                  <label
                    key={m.value}
                    className={`flex cursor-pointer flex-col rounded-2xl border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-ember/40 ${
                      isSelected
                        ? "border-ember bg-ember/5 shadow-xs"
                        : "border-line bg-card hover:border-ink/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ocrMode"
                      value={m.value}
                      checked={isSelected}
                      onChange={() => setMode(m.value)}
                      className="sr-only"
                    />
                    <span
                      className={`text-sm font-semibold ${isSelected ? "text-ember" : "text-ink"}`}
                    >
                      {m.label}
                    </span>
                    <span className="mt-1 text-xs leading-relaxed text-slate">{m.description}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleStartOver}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-xs font-semibold text-slate hover:bg-ink/5 hover:text-ink focus-ring"
            >
              <RefreshIcon className="size-3.5" />
              Choose Different File
            </button>
            <Button type="button" variant="primary" onClick={handleRunOcr}>
              <OcrIcon className="size-4" />
              Extract Text ({OCR_MODES.find((m) => m.value === mode)?.label})
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. Processing State ───────────────────────────────────────────── */}
      {isProcessing && (
        <div className="rounded-3xl border border-line bg-card p-8 shadow-xs sm:p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <SpinnerIcon className="size-8 animate-spin text-ember" />
            <div>
              <p className="text-sm font-semibold text-ink" aria-live="polite">
                {STAGE_MESSAGES[uiStage] || "Extracting text…"}
              </p>
              {selectedFile && (
                <p className="mt-1 text-xs text-slate">
                  {selectedFile.name} · {formatFileSize(selectedFile.size)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. OCR Result State ───────────────────────────────────────────── */}
      {uiStage === "result" && result && (
        <div className="space-y-6">
          {/* Result Header Bar */}
          <div className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 shadow-xs">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                <OcrIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <h3
                  className="truncate text-sm font-semibold tracking-tight text-ink sm:text-base"
                  title={result.filename}
                >
                  {result.filename}
                </h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate">
                  <span>{formatFileSize(result.fileSize)}</span>
                  <span aria-hidden="true" className="text-line">•</span>
                  <span className="font-medium text-ink">
                    {result.pageCount} {result.pageCount === 1 ? "page" : "pages"}
                  </span>
                  <span aria-hidden="true" className="text-line">•</span>
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold text-[11px] ${
                      result.averageConfidence >= 80
                        ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                    }`}
                  >
                    {result.averageConfidence}% confidence
                  </span>
                  <span aria-hidden="true" className="text-line">•</span>
                  <span className="text-ember font-medium capitalize">{result.mode} mode</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-slate hover:bg-ink/5 hover:text-ink focus-ring"
              >
                <CopyIcon className="size-3.5" />
                {copied ? "Copied!" : "Copy Text"}
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-slate hover:bg-ink/5 hover:text-ink focus-ring"
              >
                <DownloadIcon className="size-3.5" />
                Download TXT
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-ink/30 hover:bg-white focus-ring"
              >
                <RefreshIcon className="size-3.5" />
                Start Over
              </button>
            </div>
          </div>

          {/* Per-Page Selector Tabs if Multi-page */}
          {result.pageCount > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors focus-ring ${
                  activeTab === "all"
                    ? "bg-ember text-white"
                    : "border border-line bg-card text-slate hover:text-ink"
                }`}
              >
                All Pages ({result.pageCount})
              </button>
              {result.pages.map((p) => (
                <button
                  key={p.page}
                  type="button"
                  onClick={() => setActiveTab(p.page)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-ring ${
                    activeTab === p.page
                      ? "bg-ember text-white"
                      : "border border-line bg-card text-slate hover:text-ink"
                  }`}
                >
                  <span>Page {p.page}</span>
                  <span className="text-[10px] opacity-75">({p.confidence}%)</span>
                </button>
              ))}
            </div>
          )}

          {/* Extracted Text Box */}
          <div className="rounded-3xl border border-line bg-card shadow-sm overflow-hidden p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate px-1">
              <span className="font-semibold uppercase tracking-wider">
                {activeTab === "all" ? "Extracted Document Text" : `Page ${activeTab} OCR Text`}
              </span>
              <span>Editable text area</span>
            </div>

            <textarea
              rows={16}
              value={
                activeTab === "all"
                  ? editableText
                  : result.pages.find((p) => p.page === activeTab)?.text || ""
              }
              onChange={(e) => {
                if (activeTab === "all") {
                  setEditableText(e.target.value);
                }
              }}
              readOnly={activeTab !== "all"}
              placeholder="No text recognized in document."
              className="w-full resize-y rounded-2xl border border-line bg-background p-4 text-xs font-mono leading-relaxed text-ink placeholder:text-slate focus-ring sm:text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
