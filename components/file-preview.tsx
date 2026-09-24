"use client";

import type { SVGProps } from "react";
import { formatFileSize } from "@/lib/validations/file-validation";

export interface FileItemProps {
  file: File;
  onRemove?: (file: File) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  statusText?: string;
}

export interface FilePreviewListProps {
  files: File[];
  onRemove?: (file: File) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  className?: string;
}

function PdfBadgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="8" className="fill-red-500/10 dark:fill-red-500/20" />
      <path
        d="M9 8h9l5 5v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        className="fill-none stroke-red-600 stroke-[1.8] stroke-linejoin-round"
      />
      <path
        d="M18 8v5h5"
        className="fill-none stroke-red-600 stroke-[1.8] stroke-linejoin-round"
      />
      <text
        x="10"
        y="21"
        className="fill-red-700 text-[6.5px] font-bold tracking-tight select-none"
        fontFamily="system-ui, sans-serif"
      >
        PDF
      </text>
    </svg>
  );
}

function ImageFileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="8" className="fill-emerald-500/10" />
      <path
        d="M7 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z"
        className="fill-none stroke-emerald-600 stroke-[1.8] stroke-linejoin-round"
      />
      <circle cx="12" cy="13" r="1.5" className="fill-emerald-600" />
      <path
        d="m8.5 21.5 5-5 4 4 2.5-2.5 3.5 3.5"
        className="fill-none stroke-emerald-600 stroke-[1.8] stroke-linecap-round stroke-linejoin-round"
      />
    </svg>
  );
}

function DocFileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="8" className="fill-blue-500/10" />
      <path
        d="M9 8h9l5 5v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        className="fill-none stroke-blue-600 stroke-[1.8] stroke-linejoin-round"
      />
      <path
        d="M18 8v5h5M12 16h8M12 19h5"
        className="fill-none stroke-blue-600 stroke-[1.8] stroke-linecap-round stroke-linejoin-round"
      />
    </svg>
  );
}

function SheetFileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="8" className="fill-emerald-500/10" />
      <path
        d="M8 8h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        className="fill-none stroke-emerald-600 stroke-[1.8] stroke-linejoin-round"
      />
      <path
        d="M8 14h16M8 19h16M14 8v16"
        className="fill-none stroke-emerald-600 stroke-[1.6]"
      />
    </svg>
  );
}

function GenericFileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="8" className="fill-slate/10" />
      <path
        d="M9 8h9l5 5v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        className="fill-none stroke-slate stroke-[1.8] stroke-linejoin-round"
      />
      <path
        d="M18 8v5h5M12 16h8M12 20h6"
        className="fill-none stroke-slate stroke-[1.6] stroke-linecap-round"
      />
    </svg>
  );
}

function RemoveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M6 6l8 8M14 6l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Component that displays the appropriate icon for a given file type/extension.
 */
export function FileIcon({ file, className = "" }: { file: File; className?: string }) {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return <PdfBadgeIcon className={className} />;
  }
  if (
    type.startsWith("image/") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".svg")
  ) {
    return <ImageFileIcon className={className} />;
  }
  if (name.endsWith(".doc") || name.endsWith(".docx") || type.includes("word")) {
    return <DocFileIcon className={className} />;
  }
  if (
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv") ||
    type.includes("sheet") ||
    type.includes("excel")
  ) {
    return <SheetFileIcon className={className} />;
  }

  return <GenericFileIcon className={className} />;
}

/**
 * Displays an individual selected file with name, size, type icon, and accessible remove action.
 */
export function FileItem({
  file,
  onRemove,
  disabled = false,
  isProcessing = false,
  statusText,
}: FileItemProps) {
  const formattedSize = formatFileSize(file.size);

  return (
    <li
      className={`group relative flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-3 shadow-xs transition-all duration-150 sm:p-3.5 ${
        disabled
          ? "opacity-60 bg-card/60"
          : isProcessing
          ? "border-ember/30 bg-ember/[0.02]"
          : "hover:border-ink/20 hover:bg-white"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0">
          <FileIcon file={file} className="size-9 sm:size-10" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold tracking-tight text-ink"
            title={file.name}
          >
            {file.name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate">
            <span>{formattedSize}</span>
            {statusText ? (
              <>
                <span aria-hidden="true" className="text-line">
                  •
                </span>
                <span className="font-medium text-ember">{statusText}</span>
              </>
            ) : null}
            {isProcessing ? (
              <>
                <span aria-hidden="true" className="text-line">
                  •
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-ember">
                  <span className="inline-block size-1.5 animate-ping rounded-full bg-ember" />
                  Processing
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {onRemove && !disabled && !isProcessing ? (
        <button
          type="button"
          onClick={() => onRemove(file)}
          disabled={disabled || isProcessing}
          aria-label={`Remove ${file.name}`}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate transition-colors hover:bg-red-50 hover:text-red-600 focus-ring sm:size-8"
        >
          <RemoveIcon className="size-4" />
        </button>
      ) : null}
    </li>
  );
}

/**
 * Renders a list of selected files with header summary and remove actions.
 */
export function FilePreviewList({
  files,
  onRemove,
  disabled = false,
  isProcessing = false,
  className = "",
}: FilePreviewListProps) {
  if (files.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between px-0.5">
        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">
          Selected Files ({files.length})
        </h4>
        <span className="text-xs text-slate">
          Total: {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
        </span>
      </div>

      <ul
        aria-label="Selected files"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-1"
      >
        {files.map((file) => {
          // Use composite key in case files have similar names
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          return (
            <FileItem
              key={key}
              file={file}
              onRemove={onRemove}
              disabled={disabled}
              isProcessing={isProcessing}
            />
          );
        })}
      </ul>
    </div>
  );
}
