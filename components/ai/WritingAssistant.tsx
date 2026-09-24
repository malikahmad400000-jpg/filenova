"use client";

import { useState, useRef, type SVGProps } from "react";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { Button } from "@/components/ui/Button";
import { WritingIcon } from "@/components/icons";
import {
  WRITING_MODE_OPTIONS,
  WRITING_TONE_OPTIONS,
  type WritingMode,
  type WritingTone,
} from "@/lib/ai/writing-assistant";

// ─── Local icon helpers ─────────────────────────────────────────────────────────

function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M10 3v9m0 0 3-3m-3 3L7 9M3 14v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M3.5 10a6.5 6.5 0 1 1 1.9 4.6M3.5 15v-5h5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M4 10l5 5 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────────

interface WritingApiResponse {
  success: boolean;
  mode: WritingMode;
  tone: WritingTone;
  outputText: string;
  wordCountBefore: number;
  wordCountAfter: number;
  filename: string;
  fileType: "text" | "pdf" | "image";
  inputTextLength: number;
}

type InputTab = "text" | "file";
type UiStage =
  | "idle"
  | "processing"
  | "result"
  | "error";

// ─── Component ──────────────────────────────────────────────────────────────────

export function WritingAssistant() {
  const [inputTab, setInputTab] = useState<InputTab>("text");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [mode, setMode] = useState<WritingMode>("improve");
  const [tone, setTone] = useState<WritingTone>("neutral");

  const [stage, setStage] = useState<UiStage>("idle");
  const [result, setResult] = useState<WritingApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ── File handling ────────────────────────────────────────────────────────────

  function handleFilesChange(files: File[]) {
    if (files.length === 0) return;
    setSelectedFile(files[0]);
    setFileError(null);
  }

  function handleValidationErrors(errors: FileValidationError[]) {
    if (errors.length > 0) {
      setFileError(errors[0].message);
      setSelectedFile(null);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setStage("processing");
    setErrorMsg(null);
    setResult(null);

    abortRef.current = new AbortController();

    try {
      const fd = new FormData();
      fd.append("mode", mode);
      fd.append("tone", tone);

      if (inputTab === "text") {
        fd.append("text", pastedText);
      } else if (selectedFile) {
        fd.append("file", selectedFile);
      } else {
        setStage("error");
        setErrorMsg("Please upload a file or paste text.");
        return;
      }

      const res = await fetch("/api/ai/writing-assistant", {
        method: "POST",
        body: fd,
        signal: abortRef.current.signal,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      setResult(data as WritingApiResponse);
      setStage("result");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error occurred.");
      setStage("error");
    }
  }

  // ── Copy to clipboard ────────────────────────────────────────────────────────

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Download TXT ─────────────────────────────────────────────────────────────

  function handleDownloadTxt() {
    if (!result) return;
    const blob = new Blob([result.outputText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.filename || "output"}-${result.mode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Download DOCX ─────────────────────────────────────────────────────────────

  async function handleDownloadDocx() {
    if (!result || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/ai/writing-assistant/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outputText: result.outputText,
          mode: result.mode,
          tone: result.tone,
          filename: result.filename,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed." }));
        throw new Error(err.error || "Export failed.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.filename || "output"}-${result.mode}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "DOCX export failed.");
    } finally {
      setDownloading(false);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  function handleReset() {
    abortRef.current?.abort();
    setStage("idle");
    setResult(null);
    setErrorMsg(null);
    setCopied(false);
    setPastedText("");
    setSelectedFile(null);
    setFileError(null);
  }

  // ── Derived state ─────────────────────────────────────────────────────────────

  const isProcessing = stage === "processing";
  const canSubmit =
    !isProcessing &&
    (inputTab === "text" ? pastedText.trim().length >= 10 : !!selectedFile);

  const selectedModeOption = WRITING_MODE_OPTIONS.find((m) => m.value === mode);

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Mode + Tone Selector ─────────────────────────────────────────────── */}
      <section aria-labelledby="mode-heading" className="rounded-3xl border border-line bg-card p-6 sm:p-8">
        <h2 id="mode-heading" className="mb-5 text-sm font-semibold text-ink">
          1. Choose Writing Mode
        </h2>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WRITING_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMode(opt.value)}
              disabled={isProcessing}
              aria-pressed={mode === opt.value}
              className={`group flex flex-col gap-1 rounded-xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 ${
                mode === opt.value
                  ? "border-ember bg-ember/10 text-ink shadow-sm"
                  : "border-line bg-background text-slate hover:border-ember/40 hover:bg-ember/5"
              }`}
            >
              <span className="text-base leading-none">{opt.icon}</span>
              <span className="text-xs font-semibold">{opt.label}</span>
              <span className="text-[10px] leading-tight text-slate">{opt.description}</span>
            </button>
          ))}
        </div>

        {/* Tone selector */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate">Tone:</span>
          {WRITING_TONE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTone(t.value)}
              disabled={isProcessing}
              aria-pressed={tone === t.value}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 ${
                tone === t.value
                  ? "border-ember bg-ember text-white"
                  : "border-line bg-background text-slate hover:border-ember/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Input ───────────────────────────────────────────────────────────── */}
      {stage !== "result" && (
        <section aria-labelledby="input-heading" className="rounded-3xl border border-line bg-card p-6 sm:p-8">
          <h2 id="input-heading" className="mb-5 text-sm font-semibold text-ink">
            2. Add Your Content
          </h2>

          {/* Tab switcher */}
          <div className="mb-5 flex gap-1 rounded-xl border border-line bg-background p-1 w-fit">
            {(["text", "file"] as InputTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setInputTab(tab)}
                disabled={isProcessing}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 ${
                  inputTab === tab
                    ? "bg-card text-ink shadow-sm"
                    : "text-slate hover:text-ink"
                }`}
              >
                {tab === "text" ? "Paste Text" : "Upload File"}
              </button>
            ))}
          </div>

          {inputTab === "text" ? (
            <div>
              <label htmlFor="writing-input" className="sr-only">
                Text to process
              </label>
              <textarea
                id="writing-input"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                disabled={isProcessing}
                rows={10}
                placeholder="Paste your text here… (minimum 10 characters)"
                className="w-full resize-y rounded-2xl border border-line bg-background px-4 py-3 text-sm text-ink placeholder:text-slate/60 focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/20 disabled:opacity-60"
              />
              <div className="mt-1.5 flex justify-between text-[11px] text-slate">
                <span>
                  {pastedText.trim().length < 10 && pastedText.length > 0
                    ? "Minimum 10 characters required"
                    : ""}
                </span>
                <span>{pastedText.length.toLocaleString()} chars</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <FileUpload
                title="Drop PDF, JPG, or PNG here, or browse"
                description="Supports PDF (text or scan), JPG, JPEG, and PNG (up to 10 MB)"
                accept={[
                  "application/pdf",
                  ".pdf",
                  "image/jpeg",
                  ".jpg",
                  ".jpeg",
                  "image/png",
                  ".png",
                ]}
                maxSize={10 * 1024 * 1024}
                maxFiles={1}
                multiple={false}
                disabled={isProcessing}
                onFilesChange={handleFilesChange}
                onError={handleValidationErrors}
                showPreview={false}
              />
              {fileError && (
                <p role="alert" className="text-xs text-red-500">
                  {fileError}
                </p>
              )}
              {selectedFile && !fileError && (
                <div className="flex items-center gap-2 rounded-xl border border-line bg-background px-4 py-2.5">
                  <span className="text-sm">📄</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit button */}
          <div className="mt-6">
            {!isProcessing ? (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full sm:w-auto"
              >
                <WritingIcon className="size-4" />
                <span>
                  {selectedModeOption?.icon} {selectedModeOption?.label} with AI
                </span>
              </Button>
            ) : (
              <div className="flex items-center gap-3 text-sm text-slate">
                <SpinnerIcon className="size-5 animate-spin text-ember" />
                <span>Processing with AI…</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Error State ──────────────────────────────────────────────────────── */}
      {stage === "error" && errorMsg && (
        <section
          role="alert"
          className="rounded-3xl border border-red-200 bg-red-50 p-6 sm:p-8"
        >
          <h2 className="mb-2 text-sm font-semibold text-red-700">
            Processing Failed
          </h2>
          <p className="text-sm text-red-600">{errorMsg}</p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <RefreshIcon className="size-4" />
            Try Again
          </button>
        </section>
      )}

      {/* ── Result Panel ─────────────────────────────────────────────────────── */}
      {stage === "result" && result && (
        <section aria-labelledby="result-heading" className="rounded-3xl border border-emerald-200 bg-card p-6 sm:p-8">
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="result-heading" className="text-sm font-semibold text-ink">
                ✅ Result
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-line bg-background px-2.5 py-1 font-medium text-slate">
                  Mode: {selectedModeOption?.icon} {selectedModeOption?.label}
                </span>
                <span className="rounded-full border border-line bg-background px-2.5 py-1 font-medium text-slate">
                  Tone: {result.tone}
                </span>
                <span className="rounded-full border border-line bg-background px-2.5 py-1 font-medium text-slate">
                  {result.wordCountBefore} → {result.wordCountAfter} words
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-background px-3 py-1.5 text-xs font-semibold text-slate transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60"
            >
              <RefreshIcon className="size-3.5" />
              Start Over
            </button>
          </div>

          {/* Output text */}
          <div className="relative rounded-2xl border border-line bg-background p-5">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink">
              {result.outputText}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            {/* Copy */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-background px-4 py-2 text-xs font-semibold text-ink transition hover:border-ember/40 hover:bg-ember/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-4 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="size-4" />
                  Copy
                </>
              )}
            </button>

            {/* Download TXT */}
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-background px-4 py-2 text-xs font-semibold text-ink transition hover:border-ember/40 hover:bg-ember/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60"
            >
              <DownloadIcon className="size-4" />
              Download TXT
            </button>

            {/* Download DOCX */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-xl border border-ember bg-ember px-4 py-2 text-xs font-semibold text-white transition hover:bg-ember/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 disabled:opacity-60"
            >
              {downloading ? (
                <>
                  <SpinnerIcon className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <DownloadIcon className="size-4" />
                  Download DOCX
                </>
              )}
            </button>
          </div>

          {/* Error after result (e.g. docx export fail) */}
          {errorMsg && (
            <p role="alert" className="mt-3 text-xs text-red-500">
              {errorMsg}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
