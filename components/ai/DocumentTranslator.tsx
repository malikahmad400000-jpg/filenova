"use client";

import { useState, useRef, type SVGProps } from "react";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { Button } from "@/components/ui/Button";
import { TranslateIcon } from "@/components/icons";
import {
  SOURCE_LANGUAGES,
  SUPPORTED_LANGUAGES,
  getLanguageName,
  type TranslationMode,
  type TranslatedPage,
} from "@/lib/ai/translator";

interface TranslationApiResponse {
  success: boolean;
  filename: string;
  fileSize: number;
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage: string;
  translationMode: TranslationMode;
  pageCount: number;
  pages: TranslatedPage[];
  translatedText: string;
}

type UiStage =
  | "upload"
  | "file-selected"
  | "reading"
  | "ocr"
  | "translating"
  | "finalizing"
  | "result"
  | "error";

function SwapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M4 7h12M13 4l3 3-3 3M16 13H4M7 16l-3-3 3-3"
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

const TRANSLATION_MODES: { value: TranslationMode; label: string; description: string }[] = [
  {
    value: "fast",
    label: "Fast",
    description: "Compact chunks and concise prompts for rapid translation.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Recommended. Balanced context and structure preservation.",
  },
  {
    value: "high_quality",
    label: "High Quality",
    description: "Maximum context, nuanced phrasing, and refined legal/literary accuracy.",
  },
];

const STAGE_MESSAGES: Record<string, string> = {
  reading: "Reading document structure & extracting text…",
  ocr: "Extracting text with Smart OCR…",
  translating: "Translating content with AI…",
  finalizing: "Formatting & structuring translated pages…",
};

export function DocumentTranslator() {
  const [uiStage, setUiStage] = useState<UiStage>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [mode, setMode] = useState<TranslationMode>("balanced");
  const [result, setResult] = useState<TranslationApiResponse | null>(null);
  const [editableText, setEditableText] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | number>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

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

  const handleSwapLanguages = () => {
    if (sourceLanguage === "auto") return;
    const temp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(temp);
  };

  const handleTranslate = async () => {
    const file = selectedFile || fileInputRef.current;
    if (!file) return;

    if (sourceLanguage !== "auto" && sourceLanguage === targetLanguage) {
      setErrorMessage("Source and target languages cannot be identical. Please choose a different target language.");
      setUiStage("file-selected");
      return;
    }

    setErrorMessage(null);
    setUiStage("reading");

    // Dynamic stage transition
    await new Promise((resolve) => setTimeout(resolve, 300));
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png)$/i.test(file.name);
    if (isImage) {
      setUiStage("ocr");
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setUiStage("translating");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceLanguage", sourceLanguage);
      formData.append("targetLanguage", targetLanguage);
      formData.append("mode", mode);

      const res = await fetch("/api/ai/document-translator", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Translation failed to process document.");
        setUiStage("error");
        return;
      }

      setUiStage("finalizing");
      await new Promise((resolve) => setTimeout(resolve, 200));

      setResult(data);
      setEditableText(data.translatedText);
      setUiStage("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error during translation.";
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
    a.download = `${baseName}_${result.targetLanguage}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async () => {
    if (!result) return;
    setExportingDocx(true);
    try {
      const res = await fetch("/api/ai/document-translator/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${result.filename} - Translation`,
          pages: result.pages,
          targetLanguage: result.targetLanguage,
          filename: result.filename,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate DOCX document");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = result.filename.replace(/\.[^/.]+$/, "");
      a.download = `${baseName}_${result.targetLanguage}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "DOCX download failed";
      alert(msg);
    } finally {
      setExportingDocx(false);
    }
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
    uiStage === "reading" || uiStage === "ocr" || uiStage === "translating" || uiStage === "finalizing";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Error Alert */}
      {errorMessage && (uiStage === "error" || uiStage === "file-selected") && (
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
          {uiStage === "error" && (
            <button
              type="button"
              onClick={handleStartOver}
              className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 hover:text-red-900 focus-ring"
            >
              Start Over
            </button>
          )}
        </div>
      )}

      {/* ── 1. Upload Dropzone ────────────────────────────────────────────── */}
      {uiStage === "upload" && (
        <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
          <FileUpload
            title="Drop your document to translate, or browse"
            description="Supports PDF (text or scanned), JPG, JPEG, and PNG (up to 25 MB). Translates into 11 major languages."
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

      {/* ── 2. File Selected — Choose Languages, Mode & Execute ──────────── */}
      {uiStage === "file-selected" && selectedFile && (
        <div className="rounded-3xl border border-line bg-card p-5 shadow-xs sm:p-7 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
              <TranslateIcon className="size-5" />
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

          {/* Language Selection Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
            {/* Source Language */}
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="source-lang-select" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">
                From (Source Language)
              </label>
              <select
                id="source-lang-select"
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full rounded-2xl border border-line bg-background px-3.5 py-2.5 text-xs font-medium text-ink focus-ring sm:text-sm"
              >
                {SOURCE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} {l.nativeName !== l.name ? `(${l.nativeName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center sm:col-span-1">
              <button
                type="button"
                onClick={handleSwapLanguages}
                disabled={sourceLanguage === "auto"}
                title={sourceLanguage === "auto" ? "Cannot swap with Auto Detect" : "Swap source and target"}
                className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-card text-slate transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
              >
                <SwapIcon className="size-4" />
              </button>
            </div>

            {/* Target Language */}
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="target-lang-select" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">
                To (Target Language)
              </label>
              <select
                id="target-lang-select"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full rounded-2xl border border-line bg-background px-3.5 py-2.5 text-xs font-medium text-ink focus-ring sm:text-sm"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Selector */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-slate mb-3">
              Translation Quality Mode
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {TRANSLATION_MODES.map((m) => {
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
                      name="translationMode"
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
            <Button type="button" variant="primary" onClick={handleTranslate}>
              <TranslateIcon className="size-4" />
              Translate to {getLanguageName(targetLanguage)}
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
                {STAGE_MESSAGES[uiStage] || "Translating document…"}
              </p>
              {selectedFile && (
                <p className="mt-1 text-xs text-slate">
                  {selectedFile.name} · {formatFileSize(selectedFile.size)} · Translating to{" "}
                  {getLanguageName(targetLanguage)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Translation Result State ───────────────────────────────────── */}
      {uiStage === "result" && result && (
        <div className="space-y-6">
          {/* Result Header Bar */}
          <div className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 shadow-xs">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                <TranslateIcon className="size-5" />
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
                  <span className="inline-flex items-center rounded-md bg-ember/10 px-1.5 py-0.5 font-semibold text-[11px] text-ember border border-ember/20">
                    {getLanguageName(result.detectedLanguage || result.sourceLanguage)} →{" "}
                    {getLanguageName(result.targetLanguage)}
                  </span>
                  <span aria-hidden="true" className="text-line">•</span>
                  <span className="capitalize text-slate">{result.translationMode.replace("_", " ")} mode</span>
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
                {copied ? "Copied!" : "Copy Translation"}
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
                onClick={handleDownloadDocx}
                disabled={exportingDocx}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-slate hover:bg-ink/5 hover:text-ink disabled:opacity-50 focus-ring"
              >
                <DownloadIcon className="size-3.5" />
                {exportingDocx ? "Exporting…" : "DOCX"}
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
                  Page {p.page}
                </button>
              ))}
            </div>
          )}

          {/* Translated Text Box */}
          <div className="rounded-3xl border border-line bg-card shadow-sm overflow-hidden p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate px-1">
              <span className="font-semibold uppercase tracking-wider">
                {activeTab === "all" ? "Translated Document Text" : `Page ${activeTab} Translated Text`}
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
              placeholder="No translation content."
              className="w-full resize-y rounded-2xl border border-line bg-background p-4 text-xs font-sans leading-relaxed text-ink placeholder:text-slate focus-ring sm:text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
