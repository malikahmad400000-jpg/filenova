"use client";

import { useState, useRef, type SVGProps } from "react";
import Link from "next/link";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { Button } from "@/components/ui/Button";
import { SummarizeIcon, OcrIcon } from "@/components/icons";

// ─── Types ──────────────────────────────────────────────────────────────────────

type SummaryLevel = "quick" | "standard" | "detailed";

interface SummaryResult {
  title: string;
  overview: string;
  shortSummary?: string;
  detailedSummary?: string;
  keyPoints: string[];
  importantFindings: string[];
  importantInformation?: string[];
  conclusions: string[];
  sourcePages: number[];
  summaryLevel: SummaryLevel;
}

interface ApiResponse {
  success: boolean;
  filename: string;
  fileSize: number;
  totalPages: number;
  totalWords: number;
  summaryLevel: SummaryLevel;
  summary: SummaryResult;
}

type UiState =
  | "upload"
  | "file-selected"
  | "reading"
  | "analyzing"
  | "generating"
  | "result"
  | "error"
  | "scanned";

// ─── Local icon helpers (same pattern as ChatWithPdf.tsx) ────────────────────

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

// ─── Summary level config ───────────────────────────────────────────────────────

const SUMMARY_LEVELS: { value: SummaryLevel; label: string; description: string }[] = [
  { value: "quick", label: "Quick", description: "Short overview to understand the document at a glance" },
  { value: "standard", label: "Standard", description: "Balanced summary with key points and findings" },
  { value: "detailed", label: "Detailed", description: "Comprehensive summary with facts, numbers, and conclusions" },
];

type ViewTab = "all" | "short" | "detailed" | "key-points" | "important-info";

const PROCESSING_MESSAGES: Record<string, string> = {
  reading: "Reading and extracting PDF text…",
  analyzing: "Analyzing document structure…",
  generating: "Generating AI summary…",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function buildSummaryText(data: ApiResponse): string {
  const s = data.summary;
  const lines: string[] = [];

  lines.push(`FileNova AI PDF Summary — ${s.summaryLevel.charAt(0).toUpperCase() + s.summaryLevel.slice(1)} Mode`);
  lines.push(`File: ${data.filename}`);
  lines.push(`Pages: ${data.totalPages} | Words: ${data.totalWords.toLocaleString()}`);
  lines.push("");

  if (s.title) {
    lines.push(`# ${s.title}`);
    lines.push("");
  }

  const shortSum = s.shortSummary || s.overview;
  if (shortSum) {
    lines.push("## Short Summary");
    lines.push(shortSum);
    lines.push("");
  }

  const detailedSum = s.detailedSummary || s.overview;
  if (detailedSum && detailedSum !== shortSum) {
    lines.push("## Detailed Summary");
    lines.push(detailedSum);
    lines.push("");
  }

  if (s.keyPoints.length > 0) {
    lines.push("## Key Points");
    s.keyPoints.forEach((pt) => lines.push(`• ${pt}`));
    lines.push("");
  }

  const importantInfo = (s.importantInformation && s.importantInformation.length > 0)
    ? s.importantInformation
    : s.importantFindings;
  if (importantInfo && importantInfo.length > 0) {
    lines.push("## Important Information");
    importantInfo.forEach((f) => lines.push(`• ${f}`));
    lines.push("");
  }

  if (s.conclusions.length > 0) {
    lines.push("## Conclusions & Stated Next Steps");
    s.conclusions.forEach((c) => lines.push(`• ${c}`));
    lines.push("");
  }

  if (s.sourcePages.length > 0) {
    lines.push(`Sources: Pages ${s.sourcePages.join(", ")}`);
  }

  return lines.join("\n");
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function PdfSummarizer() {
  const [uiState, setUiState] = useState<UiState>("upload");
  const [activeTab, setActiveTab] = useState<ViewTab>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summaryLevel, setSummaryLevel] = useState<SummaryLevel>("standard");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<File | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  // ── File selected ──────────────────────────────────────────────────────────
  const handleFilesChange = (files: File[]) => {
    if (files.length === 0) return;
    setSelectedFile(files[0]);
    fileInputRef.current = files[0];
    setUiState("file-selected");
    setErrorMessage(null);
    setResult(null);
  };

  const handleValidationErrors = (errors: FileValidationError[]) => {
    if (errors.length > 0) {
      setErrorMessage(errors[0].message);
      setUiState("error");
    }
  };

  // ── Generate summary ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const file = selectedFile || fileInputRef.current;
    if (!file) return;

    setErrorMessage(null);
    setUiState("reading");

    // Tiny artificial delay so the user can see the staged processing states
    await tick(300);
    setUiState("analyzing");
    await tick(200);
    setUiState("generating");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("summaryLevel", summaryLevel);

      const res = await fetch("/api/ai/pdf-summarizer", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.isScanned) {
          setErrorMessage(
            data.error ||
              "This PDF appears to be scanned or image-based. Smart OCR is required to generate a reliable summary."
          );
          setUiState("scanned");
          return;
        }
        setErrorMessage(data.error || "Failed to generate summary.");
        setUiState("error");
        return;
      }

      setResult(data);
      setUiState("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error while generating summary.";
      setErrorMessage(msg);
      setUiState("error");
    }
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!result) return;
    const text = buildSummaryText(result);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Download TXT ──────────────────────────────────────────────────────────
  const handleDownloadTxt = () => {
    if (!result) return;
    const text = buildSummaryText(result);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.filename.replace(/\.pdf$/i, "")}_summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Start over ────────────────────────────────────────────────────────────
  const handleStartOver = () => {
    setUiState("upload");
    setActiveTab("all");
    setSelectedFile(null);
    fileInputRef.current = null;
    setResult(null);
    setErrorMessage(null);
    setCopied(false);
  };

  const isProcessing = uiState === "reading" || uiState === "analyzing" || uiState === "generating";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Error Alert */}
      {errorMessage && uiState === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-900 shadow-xs sm:text-sm"
        >
          <AlertIcon className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-950">Error</p>
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

      {/* Scanned PDF Warning */}
      {uiState === "scanned" && (
        <div className="rounded-3xl border border-line bg-card/60 p-5 shadow-xs sm:p-7 space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 shadow-2xs">
            <p className="font-semibold text-amber-900">⚠️ Scanned PDF Detected</p>
            <p className="mt-1 leading-relaxed text-amber-800">
              {errorMessage ||
                "This PDF appears to be scanned or image-based. Smart OCR is required to generate a reliable summary."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/ai/smart-ocr"
              className="inline-flex items-center gap-1.5 rounded-full bg-ember px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-ember/90 focus-ring"
            >
              <OcrIcon className="size-3.5" />
              Open Smart OCR
            </Link>
            <button
              type="button"
              onClick={handleStartOver}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-xs font-semibold text-ink hover:border-ink/30 hover:bg-white focus-ring"
            >
              <RefreshIcon className="size-3.5" />
              Upload Another PDF
            </button>
          </div>
        </div>
      )}

      {/* ── Upload state ──────────────────────────────────────────────────── */}
      {uiState === "upload" && (
        <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
          <FileUpload
            title="Drop your PDF to summarize, or browse"
            description="Upload 1 PDF document (up to 50 MB). FileNova extracts its text and generates an AI-powered summary."
            accept={["application/pdf", ".pdf"]}
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

      {/* ── File selected — choose level & generate ────────────────────── */}
      {uiState === "file-selected" && selectedFile && (
        <div className="rounded-3xl border border-line bg-card p-5 shadow-xs sm:p-7 space-y-6">
          {/* File info */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
              <SummarizeIcon className="size-5" />
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

          {/* Summary level selector */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-slate mb-3">
              Summary Detail Level
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {SUMMARY_LEVELS.map((lvl) => {
                const isSelected = summaryLevel === lvl.value;
                return (
                  <label
                    key={lvl.value}
                    className={`flex cursor-pointer flex-col rounded-2xl border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-ember/40 ${
                      isSelected
                        ? "border-ember bg-ember/5 shadow-xs"
                        : "border-line bg-card hover:border-ink/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="summaryLevel"
                      value={lvl.value}
                      checked={isSelected}
                      onChange={() => setSummaryLevel(lvl.value)}
                      className="sr-only"
                    />
                    <span
                      className={`text-sm font-semibold ${isSelected ? "text-ember" : "text-ink"}`}
                    >
                      {lvl.label}
                    </span>
                    <span className="mt-1 text-xs leading-relaxed text-slate">{lvl.description}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleStartOver}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-xs font-semibold text-slate hover:bg-ink/5 hover:text-ink focus-ring"
            >
              <RefreshIcon className="size-3.5" />
              Choose Different File
            </button>
            <Button type="button" variant="primary" onClick={handleGenerate}>
              <SummarizeIcon className="size-4" />
              Generate {SUMMARY_LEVELS.find((l) => l.value === summaryLevel)?.label} Summary
            </Button>
          </div>
        </div>
      )}

      {/* ── Processing states ─────────────────────────────────────────── */}
      {isProcessing && (
        <div className="rounded-3xl border border-line bg-card p-8 shadow-xs sm:p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <SpinnerIcon className="size-8 animate-spin text-ember" />
            <div>
              <p className="text-sm font-semibold text-ink" aria-live="polite">
                {PROCESSING_MESSAGES[uiState] || "Processing…"}
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

      {/* ── Summary result ────────────────────────────────────────────── */}
      {uiState === "result" && result && (
        <div className="space-y-6">
          {/* Result header bar */}
          <div className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 shadow-xs">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                <SummarizeIcon className="size-5" />
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
                    {result.totalPages} {result.totalPages === 1 ? "page" : "pages"}
                  </span>
                  <span aria-hidden="true" className="text-line">•</span>
                  <span>{result.totalWords.toLocaleString()} words</span>
                  <span aria-hidden="true" className="text-line">•</span>
                  <span className="text-ember font-medium capitalize">{result.summaryLevel} summary</span>
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
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-slate hover:bg-ink/5 hover:text-ink focus-ring"
              >
                <DownloadIcon className="size-3.5" />
                TXT
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

          {/* Summary content card */}
          <div className="rounded-3xl border border-line bg-card shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-line bg-card/80 px-4 sm:px-6">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "short", label: "Short" },
                  { id: "detailed", label: "Detailed" },
                  { id: "key-points", label: "Key Points" },
                  { id: "important-info", label: "Important Info" },
                ] as { id: ViewTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold transition-colors focus-ring ${
                    activeTab === tab.id
                      ? "border-ember text-ember"
                      : "border-transparent text-slate hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-8 space-y-7">
              {/* Title — always shown */}
              {result.summary.title && (
                <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                  {result.summary.title}
                </h2>
              )}

              {/* ── Short Summary ── */}
              {(activeTab === "all" || activeTab === "short") && (() => {
                const text = result.summary.shortSummary || result.summary.overview;
                return text ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate mb-2">
                      Short Summary
                    </h3>
                    <p className="text-sm leading-relaxed text-ink">{text}</p>
                  </section>
                ) : null;
              })()}

              {/* ── Detailed Summary ── */}
              {(activeTab === "all" || activeTab === "detailed") && (() => {
                const text = result.summary.detailedSummary || result.summary.overview;
                const shortText = result.summary.shortSummary || result.summary.overview;
                // In "all" mode, skip if identical to shortSummary to avoid duplication
                if (activeTab === "all" && text === shortText) return null;
                return text ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate mb-2">
                      Detailed Summary
                    </h3>
                    <p className="text-sm leading-relaxed text-ink">{text}</p>
                  </section>
                ) : null;
              })()}

              {/* ── Key Points ── */}
              {(activeTab === "all" || activeTab === "key-points") &&
                result.summary.keyPoints.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate mb-2">
                      Key Points
                    </h3>
                    <ul className="space-y-1.5" role="list">
                      {result.summary.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-ink">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              {/* ── Important Information ── */}
              {(activeTab === "all" || activeTab === "important-info") && (() => {
                const items =
                  result.summary.importantInformation && result.summary.importantInformation.length > 0
                    ? result.summary.importantInformation
                    : result.summary.importantFindings;
                return items && items.length > 0 ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate mb-2">
                      Important Information
                    </h3>
                    <ul className="space-y-1.5" role="list">
                      {items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-ink">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null;
              })()}

              {/* ── Conclusions (shown in "all" only) ── */}
              {activeTab === "all" && result.summary.conclusions.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate mb-2">
                    Conclusions
                  </h3>
                  <ul className="space-y-1.5" role="list">
                    {result.summary.conclusions.map((conclusion, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-ink">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                        <span className="leading-relaxed">{conclusion}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ── Source Pages ── */}
              {result.summary.sourcePages.length > 0 && (
                <section className="border-t border-line pt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate mb-2">
                    Sources
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {result.summary.sourcePages.map((page) => (
                      <span
                        key={page}
                        className="inline-flex items-center rounded-md bg-ember/10 px-2 py-0.5 text-xs font-semibold text-ember border border-ember/20"
                      >
                        Page {page}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small async helper for staged UI transitions
function tick(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
