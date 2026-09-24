"use client";

import { useState, type DragEvent, type SVGProps } from "react";
import { formatFileSize } from "@/lib/validations/file-validation";
import { FileIcon } from "@/components/file-preview";

export interface MergePdfReorderListProps {
  files: File[];
  onReorder: (reorderedFiles: File[]) => void;
  onRemove: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

function GripVerticalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <circle cx="7" cy="5" r="1.5" fill="currentColor" />
      <circle cx="13" cy="5" r="1.5" fill="currentColor" />
      <circle cx="7" cy="10" r="1.5" fill="currentColor" />
      <circle cx="13" cy="10" r="1.5" fill="currentColor" />
      <circle cx="7" cy="15" r="1.5" fill="currentColor" />
      <circle cx="13" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ArrowUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="M8 12.5V3.5M4.5 7 8 3.5 11.5 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="M8 3.5v9m3.5-3.5L8 12.5 4.5 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
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

export function MergePdfReorderList({
  files,
  onReorder,
  onRemove,
  disabled = false,
  className = "",
}: MergePdfReorderListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    if (disabled || draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (disabled || draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const next = [...files];
    const [movedItem] = next.splice(draggedIndex, 1);
    next.splice(index, 0, movedItem);

    onReorder(next);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveUp = (index: number) => {
    if (disabled || index === 0) return;
    const next = [...files];
    const [item] = next.splice(index, 1);
    next.splice(index - 1, 0, item);
    onReorder(next);
  };

  const moveDown = (index: number) => {
    if (disabled || index === files.length - 1) return;
    const next = [...files];
    const [item] = next.splice(index, 1);
    next.splice(index + 1, 0, item);
    onReorder(next);
  };

  if (files.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
            Merge Order Sequence ({files.length} documents)
          </h3>
          <p className="text-xs text-slate">
            Drag items or use the arrows to set the exact order they will be merged.
          </p>
        </div>
        <span className="text-xs text-slate">
          Total Size: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
        </span>
      </div>

      <ul
        aria-label="Reorderable list of PDFs to merge"
        className="space-y-2"
      >
        {files.map((file, index) => {
          const isDraggingThis = draggedIndex === index;
          const isTargeted = dragOverIndex === index;

          return (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`group relative flex items-center justify-between gap-3 rounded-xl border p-3 shadow-xs transition-all duration-150 sm:p-3.5 ${
                isDraggingThis
                  ? "opacity-40 border-ember/60 bg-ember/5"
                  : isTargeted
                  ? "border-ember ring-2 ring-ember/30 bg-ember/10 scale-[1.01]"
                  : "border-line bg-card hover:border-ink/20 hover:bg-white"
              } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-grab active:cursor-grabbing"}`}
            >
              {/* Left Section: Drag handle + Order index + PDF Icon + File Info */}
              <div className="flex min-w-0 items-center gap-3">
                {/* Drag handle */}
                <div
                  className="hidden text-slate/50 transition-colors group-hover:text-slate sm:block"
                  title="Drag to reorder"
                  aria-hidden="true"
                >
                  <GripVerticalIcon className="size-5" />
                </div>

                {/* Numerical order badge */}
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-night text-[11px] font-bold text-white shadow-xs">
                  {index + 1}
                </span>

                {/* PDF Icon */}
                <div className="shrink-0">
                  <FileIcon file={file} className="size-9 sm:size-10" />
                </div>

                {/* File Details */}
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-semibold tracking-tight text-ink"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate">
                    <span>{formatFileSize(file.size)}</span>
                    <span aria-hidden="true" className="text-line">
                      •
                    </span>
                    <span className="text-[11px] font-medium text-ember">
                      Page part {index + 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Section: Move Up/Down + Remove Button */}
              <div className="flex shrink-0 items-center gap-1">
                {/* Reorder Buttons (for mobile or keyboard users) */}
                <div className="flex items-center gap-0.5 rounded-lg border border-line bg-background/80 p-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveUp(index);
                    }}
                    disabled={disabled || index === 0}
                    aria-label={`Move ${file.name} up`}
                    title="Move up in order"
                    className="inline-flex size-7 items-center justify-center rounded text-slate transition-colors hover:bg-card hover:text-ink disabled:opacity-25 focus-ring"
                  >
                    <ArrowUpIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveDown(index);
                    }}
                    disabled={disabled || index === files.length - 1}
                    aria-label={`Move ${file.name} down`}
                    title="Move down in order"
                    className="inline-flex size-7 items-center justify-center rounded text-slate transition-colors hover:bg-card hover:text-ink disabled:opacity-25 focus-ring"
                  >
                    <ArrowDownIcon className="size-3.5" />
                  </button>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(file);
                  }}
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                  title="Remove file"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-slate transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 focus-ring"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
