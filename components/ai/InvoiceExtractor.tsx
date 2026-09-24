"use client";

import { useState, useRef, type SVGProps } from "react";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { Button } from "@/components/ui/Button";
import { ExtractIcon } from "@/components/icons";
import {
  exportInvoiceToCsv,
  type ExtractedInvoiceData,
  type InvoiceLineItem,
} from "@/lib/ai/invoice-extractor";

interface InvoiceApiResponse extends ExtractedInvoiceData {
  success: boolean;
  filename: string;
  fileSize: number;
  fileType: "pdf" | "jpeg" | "png";
}

type UiStage = "upload" | "file-selected" | "extracting" | "result" | "error";

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

function SpinnerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

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

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M4 10l5 5 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M10 2.5 1.5 17.5h17L10 2.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 8v4M10 14.5h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function FileTextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M4 4a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 2v4a1 1 0 0 0 1 1h4M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number | null | undefined, currency?: string | null): string {
  if (amount === null || amount === undefined) return "—";
  const curr = currency ? currency.toUpperCase() : "";
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return curr ? `${curr} ${formatted}` : formatted;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoiceExtractor() {
  const [stage, setStage] = useState<UiStage>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [result, setResult] = useState<InvoiceApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ── Handle file selection ────────────────────────────────────────────────────
  const handleFilesChange = (files: File[]) => {
    setFileError(null);
    setErrorMsg(null);
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setStage("file-selected");
    } else {
      setSelectedFile(null);
      setStage("upload");
    }
  };

  const handleFileError = (errors: FileValidationError[]) => {
    if (errors.length > 0) {
      setFileError(errors[0].message);
    }
  };

  const resetAll = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setSelectedFile(null);
    setFileError(null);
    setResult(null);
    setErrorMsg(null);
    setCopied(false);
    setStage("upload");
  };

  // ── Process invoice ──────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!selectedFile) return;

    setStage("extracting");
    setErrorMsg(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/ai/invoice-extractor", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Invoice extraction failed (HTTP ${res.status}).`);
      }

      setResult(data);
      setStage("result");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to extract invoice data.";
      setErrorMsg(message);
      setStage("error");
    } finally {
      abortRef.current = null;
    }
  };

  // ── Export Actions ───────────────────────────────────────────────────────────
  const handleCopyJson = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeInv = (result.invoiceNumber || "invoice").replace(/[^a-zA-Z0-9_-]/g, "_");
    a.download = `invoice-${safeInv}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (!result) return;
    const csvContent = exportInvoiceToCsv(result);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeInv = (result.invoiceNumber || "invoice").replace(/[^a-zA-Z0-9_-]/g, "_");
    a.download = `invoice-${safeInv}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* ── STAGE: Upload / Dropzone ─────────────────────────────────────────── */}
      {(stage === "upload" || stage === "file-selected") && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-card p-6 shadow-xs sm:p-8">
            <FileUpload
              multiple={false}
              maxSize={25 * 1024 * 1024}
              accept={[
                "application/pdf",
                ".pdf",
                "image/jpeg",
                ".jpg",
                ".jpeg",
                "image/png",
                ".png",
              ]}
              title="Upload your invoice, bill, or receipt"
              description="Drop a digital PDF, scanned document, or JPG/PNG image up to 25 MB"
              onFilesChange={handleFilesChange}
              onError={handleFileError}
            />

            {fileError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-600 dark:text-rose-400">
                <AlertIcon className="size-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Selected File Card */}
            {selectedFile && (
              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                    <FileTextIcon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{selectedFile.name}</p>
                    <p className="text-xs text-slate">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={resetAll} className="text-xs">
                    Remove
                  </Button>
                  <Button
                    type="button"
                    onClick={handleExtract}
                    className="gap-2 bg-ember text-white hover:bg-ember-deep"
                  >
                    <ExtractIcon className="size-4" />
                    Extract Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STAGE: Extracting (Loading) ───────────────────────────────────────── */}
      {stage === "extracting" && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line bg-card p-12 text-center shadow-xs">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-ember/10 text-ember animate-pulse">
            <SpinnerIcon className="size-7 animate-spin" />
          </div>
          <h3 className="mt-6 text-lg font-bold text-ink">Analyzing Invoice Document</h3>
          <p className="mt-2 max-w-md text-sm text-slate">
            Reading text, parsing totals, vendor info, and line items with AI...
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate">
            <span className="size-2 rounded-full bg-ember animate-ping" />
            <span>Processing with Gemini AI</span>
          </div>
        </div>
      )}

      {/* ── STAGE: Error ────────────────────────────────────────────────────── */}
      {stage === "error" && (
        <div className="rounded-3xl border border-rose-500/20 bg-card p-8 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertIcon className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-ink">Extraction Failed</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate">{errorMsg}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button type="button" variant="secondary" onClick={resetAll} className="gap-2 text-xs">
              <RefreshIcon className="size-3.5" />
              Try Another File
            </Button>
            <Button
              type="button"
              onClick={handleExtract}
              className="gap-2 bg-ember text-white hover:bg-ember-deep text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* ── STAGE: Extraction Results ───────────────────────────────────────── */}
      {stage === "result" && result && (
        <div className="space-y-6">
          {/* Header Card: Vendor & Invoice ID */}
          <div className="rounded-3xl border border-line bg-card p-6 shadow-xs sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckIcon className="size-3.5" />
                  Extracted with {result.confidence}% Confidence
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {result.vendorName || "Invoice Details"}
                </h2>
                <p className="mt-1 text-sm text-slate">
                  Invoice #{result.invoiceNumber || "—"}
                  {result.referenceNumber ? ` • Ref: ${result.referenceNumber}` : ""}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCopyJson}
                  className="gap-1.5 text-xs"
                >
                  {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
                  {copied ? "Copied!" : "Copy JSON"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDownloadJson}
                  className="gap-1.5 text-xs"
                >
                  <DownloadIcon className="size-3.5" />
                  JSON
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDownloadCsv}
                  className="gap-1.5 text-xs"
                >
                  <DownloadIcon className="size-3.5" />
                  CSV
                </Button>
                <Button
                  type="button"
                  onClick={resetAll}
                  className="gap-1.5 bg-ember text-white hover:bg-ember-deep text-xs"
                >
                  <RefreshIcon className="size-3.5" />
                  New Extract
                </Button>
              </div>
            </div>

            {/* Warnings Banner if any */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertIcon className="size-4 shrink-0" />
                  Extraction Notes
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {result.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Financial Summary Cards */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-ember/30 bg-ember/10 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ember">
                  Total Amount
                </span>
                <p className="mt-1 text-xl font-bold text-ink sm:text-2xl">
                  {formatCurrency(result.totalAmount, result.currency)}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-background/60 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate">
                  Amount Due
                </span>
                <p className="mt-1 text-lg font-bold text-ink">
                  {formatCurrency(result.amountDue, result.currency)}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-background/60 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate">
                  Subtotal
                </span>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {formatCurrency(result.subtotal, result.currency)}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-background/60 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate">
                  Tax
                </span>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {formatCurrency(result.taxAmount, result.currency)}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-background/60 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate">
                  Discount
                </span>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {formatCurrency(result.discountAmount, result.currency)}
                </p>
              </div>
            </div>

            {/* Metadata & Dates Grid */}
            <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-line bg-background/40 p-4 sm:grid-cols-4 text-xs">
              <div>
                <span className="font-semibold text-slate uppercase tracking-wider">Issue Date</span>
                <p className="mt-1 font-medium text-ink">{result.issueDate || "—"}</p>
              </div>
              <div>
                <span className="font-semibold text-slate uppercase tracking-wider">Due Date</span>
                <p className="mt-1 font-medium text-ink">{result.dueDate || "—"}</p>
              </div>
              <div>
                <span className="font-semibold text-slate uppercase tracking-wider">Currency</span>
                <p className="mt-1 font-medium text-ink">{result.currency || "—"}</p>
              </div>
              <div>
                <span className="font-semibold text-slate uppercase tracking-wider">Payment Terms</span>
                <p className="mt-1 font-medium text-ink">{result.paymentTerms || "—"}</p>
              </div>
            </div>

            {/* Vendor & Customer Grid */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-background/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate">
                  Vendor / Issuer
                </h4>
                <p className="mt-2 text-sm font-semibold text-ink">{result.vendorName || "—"}</p>
                {result.vendorAddress && <p className="mt-1 text-xs text-slate">{result.vendorAddress}</p>}
                {result.vendorEmail && <p className="mt-1 text-xs text-slate">Email: {result.vendorEmail}</p>}
                {result.vendorPhone && <p className="mt-1 text-xs text-slate">Tel: {result.vendorPhone}</p>}
              </div>

              <div className="rounded-2xl border border-line bg-background/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate">
                  Customer / Recipient
                </h4>
                <p className="mt-2 text-sm font-semibold text-ink">{result.customerName || "—"}</p>
                {result.customerAddress && <p className="mt-1 text-xs text-slate">{result.customerAddress}</p>}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-3xl border border-line bg-card p-6 shadow-xs sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-ink">
                Line Items ({result.lineItems?.length || 0})
              </h3>
              <span className="text-xs text-slate">
                {result.currency ? `Values in ${result.currency}` : ""}
              </span>
            </div>

            {result.lineItems && result.lineItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-line text-slate">
                      <th className="py-3 pr-4 font-semibold w-8">#</th>
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold text-right">Qty</th>
                      <th className="py-3 px-4 font-semibold text-right">Unit Price</th>
                      <th className="py-3 px-4 font-semibold text-right">Tax</th>
                      <th className="py-3 pl-4 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {result.lineItems.map((item: InvoiceLineItem, idx: number) => (
                      <tr key={idx} className="hover:bg-background/40 transition-colors">
                        <td className="py-3 pr-4 text-slate">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-ink">{item.description}</td>
                        <td className="py-3 px-4 text-right text-slate">{item.quantity ?? "—"}</td>
                        <td className="py-3 px-4 text-right text-slate">
                          {formatCurrency(item.unitPrice, result.currency)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate">
                          {formatCurrency(item.tax, result.currency)}
                        </td>
                        <td className="py-3 pl-4 text-right font-semibold text-ink">
                          {formatCurrency(item.lineTotal, result.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate">
                No individual line items were detected on this document.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
