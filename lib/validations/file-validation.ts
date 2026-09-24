export interface FileValidationOptions {
  /**
   * Accepted MIME types or extensions.
   * Can be an array (e.g. ['application/pdf', '.pdf']) or comma-separated string (e.g. '.pdf, application/pdf').
   * If not specified, all file types are accepted.
   */
  accept?: string[] | string;

  /**
   * Maximum file size in bytes for each file.
   * If not specified, no size limit is enforced.
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
}

export type FileErrorCode =
  | "INVALID_TYPE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_FILES"
  | "DUPLICATE_FILE";

export interface FileValidationError {
  code: FileErrorCode;
  message: string;
  fileName?: string;
  file?: File;
}

export interface FileValidationResult {
  validFiles: File[];
  errors: FileValidationError[];
  isValid: boolean;
}

/**
 * Formats a byte number into a human-readable size string (e.g. "10 MB", "450 KB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const size = bytes / Math.pow(1024, exponent);
  const formatted = size >= 10 || exponent === 0 ? Math.round(size) : size.toFixed(1);

  return `${formatted} ${units[exponent]}`;
}

/**
 * Normalizes accept options into an array of lowercase strings.
 */
export function normalizeAcceptedTypes(accept?: string[] | string): string[] {
  if (!accept) return [];

  const rawList = Array.isArray(accept) ? accept : accept.split(",");
  return rawList
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

/**
 * Formats accepted types for user-friendly display in UI error messages or hints.
 */
export function formatAcceptedTypes(accept?: string[] | string): string {
  const normalized = normalizeAcceptedTypes(accept);
  if (normalized.length === 0) return "All files";

  const labels = normalized.map((type) => {
    if (type === "application/pdf" || type === ".pdf") return "PDF (.pdf)";
    if (type.startsWith("image/")) {
      const sub = type.replace("image/", "");
      return sub === "*" ? "Images" : `Image (${sub.toUpperCase()})`;
    }
    if (type.startsWith(".")) {
      return type.toUpperCase();
    }
    return type;
  });

  // Deduplicate readable labels
  const uniqueLabels = Array.from(new Set(labels));
  return uniqueLabels.join(", ");
}

/**
 * Determines whether a single file matches the accepted MIME types or file extensions.
 */
export function isFileTypeAccepted(file: File, accept?: string[] | string): boolean {
  const normalizedAccept = normalizeAcceptedTypes(accept);
  if (normalizedAccept.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const fileType = (file.type || "").toLowerCase();

  return normalizedAccept.some((pattern) => {
    // Check wildcard mime type e.g. "image/*"
    if (pattern.endsWith("/*")) {
      const category = pattern.slice(0, -1);
      return fileType.startsWith(category);
    }

    // Check extension e.g. ".pdf"
    if (pattern.startsWith(".")) {
      return fileName.endsWith(pattern);
    }

    // Check exact MIME type e.g. "application/pdf"
    if (fileType === pattern) {
      return true;
    }

    // Fallback: if MIME check failed but pattern matches common file extension
    if (pattern.includes("/")) {
      const ext = pattern.split("/")[1];
      if (ext && fileName.endsWith(`.${ext}`)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Validates an incoming list of files against current files and validation options.
 */
export function validateFiles(
  newFiles: File[],
  currentFiles: File[] = [],
  options: FileValidationOptions = {}
): FileValidationResult {
  const errors: FileValidationError[] = [];
  const validFiles: File[] = [];

  const {
    accept,
    maxSize,
    maxFiles,
    multiple = true,
  } = options;

  // 1. Multiple files check
  if (!multiple && newFiles.length > 1) {
    errors.push({
      code: "TOO_MANY_FILES",
      message: "Multiple file selection is disabled. Please choose a single file.",
    });
    return { validFiles: [], errors, isValid: false };
  }

  // 2. Total file count check
  const totalCountAfterAdding = currentFiles.length + newFiles.length;
  if (maxFiles !== undefined && totalCountAfterAdding > maxFiles) {
    const slotsLeft = Math.max(0, maxFiles - currentFiles.length);
    errors.push({
      code: "TOO_MANY_FILES",
      message:
        slotsLeft === 0
          ? `Maximum limit of ${maxFiles} file(s) reached. Remove a file before adding more.`
          : `Cannot add ${newFiles.length} file(s). Only ${slotsLeft} more file(s) allowed (limit: ${maxFiles}).`,
    });
    return { validFiles: [], errors, isValid: false };
  }

  // 3. Validate each individual file
  for (const file of newFiles) {
    // Check for duplicate in existing files or in currently accumulated validFiles
    const isDuplicate = [...currentFiles, ...validFiles].some(
      (existing) =>
        existing.name === file.name &&
        existing.size === file.size &&
        existing.lastModified === file.lastModified
    );

    if (isDuplicate) {
      errors.push({
        code: "DUPLICATE_FILE",
        fileName: file.name,
        file,
        message: `"${file.name}" has already been selected.`,
      });
      continue;
    }

    // Check file type
    if (!isFileTypeAccepted(file, accept)) {
      errors.push({
        code: "INVALID_TYPE",
        fileName: file.name,
        file,
        message: `"${file.name}" has an unsupported format. Allowed: ${formatAcceptedTypes(accept)}.`,
      });
      continue;
    }

    // Check file size
    if (maxSize !== undefined && file.size > maxSize) {
      errors.push({
        code: "FILE_TOO_LARGE",
        fileName: file.name,
        file,
        message: `"${file.name}" (${formatFileSize(file.size)}) exceeds the maximum allowed size of ${formatFileSize(maxSize)}.`,
      });
      continue;
    }

    validFiles.push(file);
  }

  return {
    validFiles,
    errors,
    isValid: errors.length === 0,
  };
}
