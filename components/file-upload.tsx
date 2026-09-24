"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  formatAcceptedTypes,
  formatFileSize,
  validateFiles,
  type FileValidationError,
} from "@/lib/validations/file-validation";
import { FilePreviewList } from "@/components/file-preview";

export interface FileUploadProps {
  /**
   * Unique element ID for accessibility linking.
   */
  id?: string;

  /**
   * Primary title displayed in the dropzone.
   * Defaults to "Drag and drop your files here, or browse".
   */
  title?: string;

  /**
   * Custom subtitle / help text.
   * If omitted, a formatted summary of accepted types and size limits will be shown.
   */
  description?: string;

  /**
   * Accepted file types (e.g. ['application/pdf', '.pdf'] or '.pdf').
   */
  accept?: string[] | string;

  /**
   * Maximum file size in bytes per file (e.g. 10 * 1024 * 1024).
   */
  maxSize?: number;

  /**
   * Maximum total number of files allowed.
   */
  maxFiles?: number;

  /**
   * Whether multiple files can be selected.
   * Defaults to true.
   */
  multiple?: boolean;

  /**
   * Controlled files list.
   */
  files?: File[];

  /**
   * Initial files for uncontrolled usage.
   */
  defaultFiles?: File[];

  /**
   * Callback fired whenever the files list changes (added or removed).
   */
  onFilesChange?: (files: File[]) => void;

  /**
   * Callback fired when new valid files are selected.
   */
  onFilesSelected?: (files: File[]) => void;

  /**
   * Callback fired when validation errors occur.
   */
  onError?: (errors: FileValidationError[]) => void;

  /**
   * Disabled state for the uploader.
   */
  disabled?: boolean;

  /**
   * Processing / uploading state.
   */
  isProcessing?: boolean;

  /**
   * Custom processing label.
   */
  processingMessage?: string;

  /**
   * Whether to show the file preview list beneath the dropzone.
   * Defaults to true.
   */
  showPreview?: boolean;

  /**
   * Whether to automatically display inline validation error alerts.
   * Defaults to true.
   */
  showErrors?: boolean;

  /**
   * Custom action button or elements rendered inside or below.
   */
  children?: ReactNode;

  /**
   * Additional container CSS classes.
   */
  className?: string;
}

function UploadCloudIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M7 18a4.5 4.5 0 0 1-1-8.9 6 6 0 0 1 11.8-1.6 4.5 4.5 0 0 1 2.2 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12v9M8.5 15.5 12 12l3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertTriangleIcon(props: SVGProps<SVGSVGElement>) {
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
        className="opacity-20"
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

function DismissIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="m4 4 8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Reusable, accessible, and robust FileUpload component.
 */
export function FileUpload({
  id: customId,
  title = "Drag and drop your files here, or browse",
  description,
  accept,
  maxSize,
  maxFiles,
  multiple = true,
  files: controlledFiles,
  defaultFiles = [],
  onFilesChange,
  onFilesSelected,
  onError,
  disabled = false,
  isProcessing = false,
  processingMessage = "Processing your files...",
  showPreview = true,
  showErrors = true,
  children,
  className = "",
}: FileUploadProps) {
  const autoId = useId();
  const inputId = customId || `file-upload-${autoId}`;
  const errorAlertId = `${inputId}-error-alert`;
  const hintId = `${inputId}-hint`;

  // Internal files state when uncontrolled
  const [internalFiles, setInternalFiles] = useState<File[]>(defaultFiles);
  const isControlled = controlledFiles !== undefined;
  const currentFiles = isControlled ? controlledFiles : internalFiles;

  // Visual states
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<FileValidationError[]>([]);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const formattedAccept = formatAcceptedTypes(accept);
  const formattedMaxSize = maxSize ? formatFileSize(maxSize) : null;

  const defaultHint = [
    formattedAccept !== "All files" ? formattedAccept : null,
    formattedMaxSize ? `up to ${formattedMaxSize} per file` : null,
    maxFiles ? `max ${maxFiles} file${maxFiles > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const helperText = description || defaultHint;

  // Process incoming files
  const processFiles = useCallback(
    (incoming: File[]) => {
      if (disabled || isProcessing || incoming.length === 0) return;

      const result = validateFiles(incoming, currentFiles, {
        accept,
        maxSize,
        maxFiles,
        multiple,
      });

      if (!result.isValid) {
        setErrors(result.errors);
        onError?.(result.errors);
      } else {
        // Clear previous errors on successful addition
        setErrors([]);
      }

      if (result.validFiles.length > 0) {
        const nextFiles = multiple
          ? [...currentFiles, ...result.validFiles]
          : result.validFiles.slice(0, 1);

        if (!isControlled) {
          setInternalFiles(nextFiles);
        }
        onFilesSelected?.(result.validFiles);
        onFilesChange?.(nextFiles);
      }
    },
    [
      disabled,
      isProcessing,
      currentFiles,
      accept,
      maxSize,
      maxFiles,
      multiple,
      isControlled,
      onError,
      onFilesSelected,
      onFilesChange,
    ]
  );

  // File input change handler
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      processFiles(selected);
    }
    // Reset input value so the same file can be picked again if deleted
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isProcessing) return;

    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isProcessing) return;
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isProcessing) return;

    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    if (disabled || isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles);
    }
  };

  // Keyboard navigation on the dropzone
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || isProcessing) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  // Remove file handler
  const handleRemoveFile = useCallback(
    (fileToRemove: File) => {
      if (disabled || isProcessing) return;

      const nextFiles = currentFiles.filter((f) => f !== fileToRemove);
      if (!isControlled) {
        setInternalFiles(nextFiles);
      }
      onFilesChange?.(nextFiles);

      // If we cleared files, also clear any previous errors
      if (nextFiles.length === 0) {
        setErrors([]);
      }
    },
    [disabled, isProcessing, currentFiles, isControlled, onFilesChange]
  );

  // Clear all errors
  const handleClearErrors = () => {
    setErrors([]);
  };

  // Format accept string for native file input
  const nativeAccept = Array.isArray(accept) ? accept.join(",") : accept;

  // Determine current visual border/background style
  const getDropzoneStateClasses = () => {
    if (disabled) {
      return "border-line bg-card/40 cursor-not-allowed opacity-60";
    }
    if (isProcessing) {
      return "border-ember/40 bg-ember/[0.03] cursor-wait";
    }
    if (errors.length > 0) {
      return "border-red-300 hover:border-red-400 bg-red-50/20 cursor-pointer";
    }
    if (isDragging) {
      return "border-ember bg-ember/[0.08] ring-2 ring-ember/30 scale-[1.006] shadow-md cursor-copy";
    }
    return "border-line/90 hover:border-ember/50 bg-card/70 hover:bg-card cursor-pointer shadow-xs";
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Hidden native input */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple={multiple}
        accept={nativeAccept}
        disabled={disabled || isProcessing}
        onChange={handleInputChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Interactive Dropzone */}
      <div
        role="button"
        tabIndex={disabled || isProcessing ? -1 : 0}
        aria-label={`${title}. ${helperText}`}
        aria-describedby={`${hintId} ${errors.length > 0 ? errorAlertId : ""}`}
        aria-disabled={disabled || isProcessing}
        onClick={() => {
          if (!disabled && !isProcessing) {
            inputRef.current?.click();
          }
        }}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 focus-ring sm:min-h-[220px] sm:px-10 sm:py-10 ${getDropzoneStateClasses()}`}
      >
        {/* Processing Overlay / State */}
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <SpinnerIcon className="size-10 animate-spin text-ember" />
            <div>
              <p className="text-sm font-semibold text-ink sm:text-base">
                {processingMessage}
              </p>
              <p className="mt-1 text-xs text-slate">Please wait a moment...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Visual Icon Badge */}
            <div
              className={`mb-3.5 inline-flex size-13 items-center justify-center rounded-2xl transition-all duration-200 sm:size-14 ${
                isDragging
                  ? "scale-110 bg-ember text-white shadow-md shadow-ember/20"
                  : errors.length > 0
                  ? "bg-red-100 text-red-600"
                  : "bg-ember/10 text-ember"
              }`}
            >
              {errors.length > 0 ? (
                <AlertTriangleIcon className="size-7" />
              ) : (
                <UploadCloudIcon className="size-7" />
              )}
            </div>

            {/* Title & Prompt */}
            <div className="max-w-md space-y-1">
              <p className="text-sm font-semibold tracking-tight text-ink sm:text-base">
                {isDragging ? "Drop your files here" : title}
              </p>
              <p
                id={hintId}
                className="text-xs leading-relaxed text-slate sm:text-xs"
              >
                {helperText}
              </p>
            </div>

            {/* Click to browse button hint */}
            {!disabled && (
              <div className="mt-4">
                <span className="inline-flex items-center rounded-full border border-line bg-white/90 px-3.5 py-1.5 text-xs font-medium text-ink shadow-xs transition-colors group-hover:border-ink/20">
                  <span className="font-semibold text-ember">Browse files</span>
                  <span className="ml-1 text-slate">from device</span>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Inline Validation Errors */}
      {showErrors && errors.length > 0 && (
        <div
          id={errorAlertId}
          role="alert"
          aria-live="assertive"
          className="relative flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900 shadow-xs sm:text-sm"
        >
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold text-red-950">
              {errors.length === 1 ? "Upload warning" : `${errors.length} upload issues`}
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-red-800">
              {errors.map((err, idx) => (
                <li key={`${err.code}-${idx}`} className="leading-snug">
                  {err.message}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={handleClearErrors}
            aria-label="Dismiss errors"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-red-700 hover:bg-red-100 hover:text-red-900 focus-ring"
          >
            <DismissIcon className="size-3.5" />
          </button>
        </div>
      )}

      {/* Selected Files Preview List */}
      {showPreview && currentFiles.length > 0 && (
        <FilePreviewList
          files={currentFiles}
          onRemove={handleRemoveFile}
          disabled={disabled}
          isProcessing={isProcessing}
        />
      )}

      {/* Optional slot for additional actions/buttons */}
      {children}
    </div>
  );
}
