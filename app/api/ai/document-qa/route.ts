import { NextResponse, type NextRequest } from "next/server";
import { extractTextFromPdf } from "@/lib/ai/pdf-text-extractor";
import { detectDocumentType, ocrImageBuffer } from "@/lib/ai/ocr";
import { ocrPdfDocument } from "@/lib/ai/pdf-ocr";
import { chunkPages, type DocumentChunk } from "@/lib/ai/chunker";
import { retrieveRelevantChunks } from "@/lib/ai/retrieval";
import { documentStore } from "@/lib/ai/doc-store";
import { generateAnswer, MissingApiKeyError } from "@/lib/ai/provider";
import { trimHistory, type QaConversationMessage } from "@/lib/ai/document-qa";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_QUESTION_LENGTH = 1000;
const MAX_PDF_PAGES = 30;
const MAX_OCR_PAGES = 10;

function mapAiError(aiErr: unknown): NextResponse {
  if (aiErr instanceof MissingApiKeyError) {
    return NextResponse.json(
      {
        error:
          aiErr.message ||
          "Document Q&A is not available. The server-side AI API key has not been configured.",
        code: "AI_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const message = aiErr instanceof Error ? aiErr.message : "Unknown error";
  const lower = message.toLowerCase();

  if (
    message.includes("401") ||
    lower.includes("incorrect api key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("invalid api key")
  ) {
    return NextResponse.json(
      { error: "Invalid AI credentials. Please check your AI API key configuration." },
      { status: 503 }
    );
  }

  if (
    message.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("too many requests")
  ) {
    return NextResponse.json(
      {
        error: "AI service rate limit exceeded. Please wait a moment and try again.",
      },
      { status: 429 }
    );
  }

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("aborted")
  ) {
    return NextResponse.json(
      { error: "AI service request timed out. Please try again." },
      { status: 504 }
    );
  }

  // Never leak internal API keys or secrets in error messages
  const sanitized = message.replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED]").replace(/sk-[0-9A-Za-z]{32,}/g, "[REDACTED]");

  return NextResponse.json(
    { error: `AI Document Q&A error: ${sanitized}` },
    { status: 502 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // ─── 1. Multipart Form Data: Upload (+ optional Question) ─────────────────
    if (contentType.includes("multipart/form-data")) {
      const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
      if (contentLength > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File exceeds the maximum allowed size of 25 MB." },
          { status: 413 }
        );
      }

      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return NextResponse.json(
          { error: "Could not parse multipart form data." },
          { status: 400 }
        );
      }

      const fileEntries = formData.getAll("file");
      const filesEntries = formData.getAll("files");
      const allFiles = [...fileEntries, ...filesEntries].filter(
        (entry): entry is File => entry instanceof File
      );

      if (allFiles.length === 0) {
        return NextResponse.json(
          { error: "No document provided. Please upload a PDF, JPG, or PNG document." },
          { status: 400 }
        );
      }

      if (allFiles.length > 1) {
        return NextResponse.json(
          {
            error:
              "Document Q&A accepts exactly one document at a time. Please select a single file.",
          },
          { status: 400 }
        );
      }

      const file = allFiles[0];

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the maximum allowed size of 25 MB.` },
          { status: 413 }
        );
      }

      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await file.arrayBuffer();
      } catch {
        return NextResponse.json(
          { error: "Failed to read the uploaded document." },
          { status: 400 }
        );
      }

      const bytes = new Uint8Array(arrayBuffer);
      const docType = detectDocumentType(bytes);

      if (!docType) {
        return NextResponse.json(
          {
            error: `Unsupported file format for "${file.name}". Please upload a valid PDF, JPG, or PNG document (header signature mismatch).`,
          },
          { status: 400 }
        );
      }

      let pages: { pageNumber: number; text: string; wordCount: number }[] = [];
      let totalWords = 0;
      let isScanned = false;

      // Extract document text based on detected format
      if (docType === "pdf") {
        let extracted;
        try {
          extracted = await extractTextFromPdf(bytes);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "PDF parsing failed";
          return NextResponse.json(
            { error: `Could not parse "${file.name}". The document may be corrupted: ${msg}` },
            { status: 400 }
          );
        }

        if (extracted.totalPages > MAX_PDF_PAGES) {
          return NextResponse.json(
            {
              error: `This document has too many pages. Maximum limit is ${MAX_PDF_PAGES} pages (received ${extracted.totalPages}).`,
            },
            { status: 400 }
          );
        }

        pages = extracted.pages;
        totalWords = extracted.totalWords;
        isScanned = extracted.isScanned;

        // Fallback to OCR for scanned PDFs
        if (extracted.isScanned || extracted.totalWords < 5) {
          try {
            const ocrResult = await ocrPdfDocument(bytes, "balanced", "eng", MAX_OCR_PAGES);
            pages = ocrResult.pages.map((p) => ({
              pageNumber: p.page,
              text: p.text,
              wordCount: p.text.split(/\s+/).filter(Boolean).length,
            }));
            totalWords = pages.reduce((sum, p) => sum + p.wordCount, 0);
            isScanned = true;
          } catch (ocrErr) {
            const msg = ocrErr instanceof Error ? ocrErr.message : "OCR failed";
            return NextResponse.json(
              { error: `OCR extraction failed on scanned PDF: ${msg}` },
              { status: 400 }
            );
          }
        }
      } else {
        // Image formats (JPG or PNG)
        try {
          const imageBuffer = Buffer.from(arrayBuffer);
          const ocrResult = await ocrImageBuffer(imageBuffer, "balanced", "eng");
          const words = ocrResult.text.split(/\s+/).filter(Boolean).length;
          pages = [
            {
              pageNumber: 1,
              text: ocrResult.text,
              wordCount: words,
            },
          ];
          totalWords = words;
          isScanned = true;
        } catch (imgErr) {
          const msg = imgErr instanceof Error ? imgErr.message : "Image processing failed";
          return NextResponse.json(
            { error: `Could not process image for Document Q&A: ${msg}` },
            { status: 400 }
          );
        }
      }

      // Validate minimum readable content
      if (totalWords < 3) {
        return NextResponse.json(
          {
            error:
              "Unable to extract readable text from this document. Try a clearer scan or a text-based document.",
          },
          { status: 422 }
        );
      }

      // Chunk document for retrieval
      const chunks: DocumentChunk[] = chunkPages(pages);
      if (chunks.length === 0) {
        return NextResponse.json(
          { error: "No usable content found in document." },
          { status: 422 }
        );
      }

      const documentId = crypto.randomUUID();
      const storedDoc = await documentStore.saveDocument({
        documentId,
        filename: file.name,
        fileSize: file.size,
        totalPages: pages.length,
        totalWords,
        isScanned,
        chunks,
      });

      // Check if a question was submitted along with the upload
      const questionRaw = formData.get("question");
      const question = typeof questionRaw === "string" ? questionRaw.trim() : "";

      if (question) {
        if (question.length > MAX_QUESTION_LENGTH) {
          return NextResponse.json(
            { error: `Question is too long (maximum ${MAX_QUESTION_LENGTH} characters).` },
            { status: 400 }
          );
        }

        const relevantChunks = retrieveRelevantChunks(storedDoc, question, 4);

        try {
          const result = await generateAnswer({
            question,
            contextChunks: relevantChunks,
            featureName: "Document Q&A",
          });

          return NextResponse.json({
            success: true,
            documentId,
            filename: file.name,
            fileSize: file.size,
            totalPages: pages.length,
            totalWords,
            answer: result.answer,
            sources: result.sources,
            chunkCount: result.chunkCount,
            provider: result.provider,
            model: result.model,
          });
        } catch (aiErr) {
          return mapAiError(aiErr);
        }
      }

      // Upload-only completion
      return NextResponse.json({
        success: true,
        documentId,
        filename: file.name,
        fileSize: file.size,
        totalPages: pages.length,
        totalWords,
        chunkCount: chunks.length,
        isScanned,
      });
    }

    // ─── 2. JSON: Ask Question on Existing Document ───────────────────────────
    if (contentType.includes("application/json")) {
      let body: Record<string, unknown>;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Malformed JSON in request body." },
          { status: 400 }
        );
      }

      const { documentId, question, history } = body || {};

      if (!documentId || typeof documentId !== "string" || !documentId.trim()) {
        return NextResponse.json(
          { error: "A valid documentId is required to ask questions." },
          { status: 400 }
        );
      }

      if (!question || typeof question !== "string" || !question.trim()) {
        return NextResponse.json(
          { error: "Question cannot be empty. Please ask a question about your document." },
          { status: 400 }
        );
      }

      const trimmedQuestion = question.trim();
      if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
        return NextResponse.json(
          { error: `Question is too long (maximum ${MAX_QUESTION_LENGTH} characters).` },
          { status: 400 }
        );
      }

      const doc = await documentStore.getDocument(documentId.trim());
      if (!doc) {
        return NextResponse.json(
          {
            error:
              "Document session expired or not found. Please upload your document again.",
          },
          { status: 404 }
        );
      }

      const relevantChunks = retrieveRelevantChunks(doc, trimmedQuestion, 4);
      const sanitizedHistory = trimHistory(
        Array.isArray(history) ? (history as QaConversationMessage[]) : []
      );

      try {
        const result = await generateAnswer({
          question: trimmedQuestion,
          contextChunks: relevantChunks,
          history: sanitizedHistory,
          featureName: "Document Q&A",
        });

        return NextResponse.json({
          success: true,
          documentId: doc.documentId,
          filename: doc.filename,
          answer: result.answer,
          sources: result.sources,
          chunkCount: result.chunkCount,
          provider: result.provider,
          model: result.model,
        });
      } catch (aiErr) {
        return mapAiError(aiErr);
      }
    }

    // Unsupported Content-Type
    return NextResponse.json(
      { error: "Invalid Content-Type. Request must be multipart/form-data or application/json." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[document-qa] Unexpected error:", message);
    return NextResponse.json(
      { error: `Processing failed: ${message}` },
      { status: 500 }
    );
  }
}
