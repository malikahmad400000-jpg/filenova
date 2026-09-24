"use client";

import { useEffect, useState, type SVGProps } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { FileIcon } from "@/components/file-preview";
import { Button } from "@/components/ui/Button";
import { ExcelIcon } from "@/components/icons";

interface ExcelConversionResult {
  url: string;
  filename: string;
  totalPages: number;
  extractedTables: number;
  extractedRows: number;
  extractedColumns: number;
  isScanned: boolean;
  fileSize: number;
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

export function PdfToExcelTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfMeta, setPdfMeta] = useState<LoadedPdfMeta | null>(null);
  const [isReadingPdf, setIsReadingPdf] = useState(false);

  // Conversion State
  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ExcelConversionResult | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  // Clean up object URLs on unmount or reset
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
  };

  const handleConvert = async () => {
    if (!selectedFile || !pdfMeta || isConverting) return;

    setIsConverting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/pdf/to-excel", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errText = "Failed to convert PDF to Excel.";
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

      // Metadata headers
      const totalPages = parseInt(
        response.headers.get("X-Total-Pages") || pdfMeta.totalPages.toString(),
        10
      );
      const extractedTables = parseInt(
        response.headers.get("X-Extracted-Tables") || "0",
        10
      );
      const extractedRows = parseInt(
        response.headers.get("X-Extracted-Rows") || "0",
        10
      );
      const extractedColumns = parseInt(
        response.headers.get("X-Extracted-Columns") || "0",
        10
      );
      const isScanned = response.headers.get("X-Scanned-Pdf") === "true";

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      const outputFilename = `${baseName}.xlsx`;

      setResult({
        url: downloadUrl,
        filename: outputFilename,
        totalPages,
        extractedTables,
        extractedRows,
        extractedColumns,
        isScanned,
        fileSize: blob.size,
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
            Excel Workbook Ready!
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate sm:text-base">
            Your PDF tables and data have been converted into an editable Microsoft Excel (.xlsx)
            spreadsheet with preserved columns and number formats.
          </p>

          {/* Scanned Notice if detected */}
          {result.isScanned && (
            <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-left text-xs text-amber-950 shadow-2xs">
              <p className="font-semibold text-amber-900">⚠️ Scanned PDF Notice</p>
              <p className="mt-1 leading-relaxed text-amber-800">
                This PDF appears to be scanned/image-based. Smart OCR is required to extract
                editable tables. An informational workbook was created, but full OCR table
                reconstruction requires the Smart OCR engine.
              </p>
            </div>
          )}

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
                Tables
              </span>
              <span className="mt-1 block text-sm font-bold text-emerald-700 sm:text-base">
                {result.extractedTables} {result.extractedTables === 1 ? "table" : "tables"}
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                Rows
              </span>
              <span className="mt-1 block text-sm font-bold text-ink sm:text-base">
                {result.extractedRows.toLocaleString()}
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-background/80 p-3.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate">
                Format
              </span>
              <span className="mt-1 block text-sm font-bold text-emerald-800 sm:text-base">
                XLSX
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-7 py-3 text-sm font-semibold tracking-tight text-white shadow-[0_10px_24px_-12px_rgba(5,150,105,0.85)] transition-all hover:bg-emerald-700 focus-ring"
            >
              <DownloadIcon className="size-4" />
              Download Excel (.xlsx)
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
      ) : (
        /* Active Workflow */
        <div className="space-y-6">
          {!pdfMeta ? (
            /* Upload Dropzone */
            <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
              <FileUpload
                title="Drop a PDF table or report to convert to Excel, or browse"
                description="Upload exactly 1 PDF document (up to 50 MB) to extract tabular data into an editable .xlsx workbook."
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
            /* File Info Card & Conversion Options */
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
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 border border-emerald-200">
                        {pdfMeta.totalPages} {pdfMeta.totalPages === 1 ? "page" : "pages"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartOver}
                  disabled={isConverting}
                  className="rounded-full p-2 text-slate transition-colors hover:bg-ink/5 hover:text-ink focus-ring disabled:opacity-50"
                  aria-label="Remove selected PDF"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>

              {/* Action Banner */}
              <div className="rounded-3xl border border-line bg-card/50 p-6 shadow-xs">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-ink">
                      Ready to extract spreadsheet tables
                    </h4>
                    <p className="text-xs text-slate">
                      Each page and detected table will be extracted into structured cells with
                      preserved numbers, formulas, and dates.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="w-full shrink-0 sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-[0_10px_24px_-12px_rgba(5,150,105,0.85)]"
                  >
                    {isConverting ? (
                      <span className="inline-flex items-center gap-2">
                        <SpinnerIcon className="size-4 animate-spin" />
                        Extracting Tables...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <ExcelIcon className="size-4" />
                        Convert to Excel (.xlsx)
                      </span>
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
