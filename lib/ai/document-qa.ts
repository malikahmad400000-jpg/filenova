import type { DocumentChunk } from "./chunker";
import type { StoredDocument } from "./doc-store";

// ─── Public Types ──────────────────────────────────────────────────────────────

export interface QaConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface QaAskResult {
  answer: string;
  sources: number[];
  chunkCount: number;
  provider?: string;
  model?: string;
}

export interface QaUploadResult {
  documentId: string;
  filename: string;
  fileSize: number;
  totalPages: number;
  totalWords: number;
  isScanned: boolean;
  chunkCount: number;
}

// ─── Context Assembly ─────────────────────────────────────────────────────────

/**
 * Assembles a formatted context string from retrieved chunks, applying
 * deduplication and token budget enforcement.
 * Exported for unit testing.
 */
export function assembleContext(chunks: DocumentChunk[], maxChars = 6000): string {
  if (!chunks || chunks.length === 0) return "";

  const seen = new Set<string>();
  const parts: string[] = [];
  let totalLen = 0;

  for (const chunk of chunks) {
    const trimmed = chunk.text.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);

    const part = `[Page ${chunk.pageNumber}]:\n${trimmed}`;
    if (totalLen + part.length > maxChars) break;

    parts.push(part);
    totalLen += part.length;
  }

  return parts.join("\n\n---\n\n");
}

/**
 * Formats a plain answer string by ensuring it ends with clean spacing.
 * Exported for unit testing.
 */
export function formatAnswer(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  return trimmed;
}

/**
 * Validates a question string and returns a normalised trimmed version or
 * throws a descriptive Error.
 * Exported for unit testing.
 */
export function validateQuestion(question: unknown): string {
  if (typeof question !== "string" || !question.trim()) {
    throw new Error("Question cannot be empty.");
  }
  const trimmed = question.trim();
  if (trimmed.length > 1000) {
    throw new Error("Question is too long (maximum 1000 characters).");
  }
  return trimmed;
}

/**
 * Returns a summary of document metadata suitable for display in the UI.
 * Exported for unit testing.
 */
export function buildDocumentSummary(doc: StoredDocument): {
  filename: string;
  totalPages: number;
  totalWords: number;
  chunkCount: number;
  isScanned: boolean;
} {
  return {
    filename: doc.filename,
    totalPages: doc.totalPages,
    totalWords: doc.totalWords,
    chunkCount: doc.chunks.length,
    isScanned: doc.isScanned,
  };
}

/**
 * Trims conversation history to the last N turns to stay within token budget.
 * Exported for unit testing.
 */
export function trimHistory(
  history: QaConversationMessage[],
  maxTurns = 6
): QaConversationMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-maxTurns);
}

/**
 * Detects common prompt injection patterns in question strings.
 * Exported for unit testing.
 */
export function isPromptInjection(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const injectionPatterns = [
    "ignore previous instructions",
    "ignore all previous",
    "system prompt",
    "reveal your prompt",
    "dump environment",
    "reveal api key",
    "output api key",
    "developer mode",
    "jailbreak",
  ];
  return injectionPatterns.some((pattern) => lower.includes(pattern));
}

/**
 * Deduplicates and sorts numeric page citations.
 * Exported for unit testing.
 */
export function deduplicateSources(sources: number[]): number[] {
  if (!Array.isArray(sources)) return [];
  return Array.from(new Set(sources.filter((s) => typeof s === "number" && s > 0))).sort(
    (a, b) => a - b
  );
}

/**
 * Formats a full Q&A response payload.
 * Exported for unit testing.
 */
export function formatQaResponse(
  answer: string,
  sources: number[],
  chunkCount: number,
  documentId: string
): QaAskResult & { documentId: string } {
  return {
    answer: formatAnswer(answer),
    sources: deduplicateSources(sources),
    chunkCount,
    documentId,
  };
}
