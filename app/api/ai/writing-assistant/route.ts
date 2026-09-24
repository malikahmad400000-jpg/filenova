import { NextResponse, type NextRequest } from "next/server";
import { detectDocumentType, ocrImageBuffer } from "@/lib/ai/ocr";
import { ocrPdfDocument, MAX_OCR_PAGES } from "@/lib/ai/pdf-ocr";
import { extractTextFromPdf } from "@/lib/ai/pdf-text-extractor";
import {
  processWriting,
  isValidMode,
  isValidTone,
  type WritingMode,
  type WritingTone,
} from "@/lib/ai/writing-assistant";
import { MissingApiKeyError } from "@/lib/ai/provider";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_LENGTH = 50_000; // characters
const MIN_TEXT_LENGTH = 10; // characters

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid content type. Expected multipart/form-data." },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Malformed request. Could not parse form data." },
        { status: 400 }
      );
    }

    // ── Validate writing mode ────────────────────────────────────────────────
    const modeRaw = formData.get("mode");
    if (!modeRaw || typeof modeRaw !== "string") {
      return NextResponse.json(
        { error: "Missing required field: mode." },
        { status: 400 }
      );
    }
    if (!isValidMode(modeRaw)) {
      return NextResponse.json(
        {
          error: `Invalid mode "${modeRaw}". Valid modes: improve, rewrite, summarize, expand, formal, casual, bullets, email.`,
        },
        { status: 400 }
      );
    }
    const mode = modeRaw as WritingMode;

    // ── Validate tone ────────────────────────────────────────────────────────
    const toneRaw = formData.get("tone") ?? "neutral";
    if (typeof toneRaw !== "string" || !isValidTone(toneRaw)) {
      return NextResponse.json(
        {
          error: `Invalid tone "${toneRaw}". Valid tones: neutral, professional, friendly, academic.`,
        },
        { status: 400 }
      );
    }
    const tone = toneRaw as WritingTone;

    // ── Determine input source: text or file ─────────────────────────────────
    const rawTextInput = formData.get("text");
    const fileEntry = formData.get("file") ?? formData.get("files");
    const hasText =
      typeof rawTextInput === "string" && rawTextInput.trim().length > 0;
    const hasFile = fileEntry instanceof File && fileEntry.size > 0;

    if (!hasText && !hasFile) {
      return NextResponse.json(
        {
          error:
            "No input provided. Please paste text or upload a PDF, JPG, or PNG file.",
        },
        { status: 400 }
      );
    }

    // ── Text-only path ───────────────────────────────────────────────────────
    let extractedText = "";
    let filename = "pasted-text";
    let fileType: "text" | "pdf" | "image" = "text";

    if (hasText) {
      const rawText = (rawTextInput as string).trim();
      if (rawText.length < MIN_TEXT_LENGTH) {
        return NextResponse.json(
          { error: "Text is too short. Please provide at least 10 characters." },
          { status: 400 }
        );
      }
      if (rawText.length > MAX_TEXT_LENGTH) {
        return NextResponse.json(
          {
            error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
          },
          { status: 400 }
        );
      }
      extractedText = rawText;
    } else {
      // ── File upload path ─────────────────────────────────────────────────
      const file = fileEntry as File;
      filename = file.name || "document";

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const docType = detectDocumentType(bytes);

      if (docType === "pdf") {
        fileType = "pdf";
        // Try direct text extraction first; fall back to OCR for scanned PDFs
        const extracted = await extractTextFromPdf(bytes);

        if (extracted.totalPages > 15) {
          return NextResponse.json(
            {
              error: `Document has too many pages. Maximum allowed is 15 pages (received ${extracted.totalPages}).`,
            },
            { status: 400 }
          );
        }

        if (extracted.isScanned) {
          // Scanned / image-based PDF — run OCR
          const ocrResult = await ocrPdfDocument(bytes, "balanced", "eng", MAX_OCR_PAGES);
          extractedText = ocrResult.pages
            .map((p) => p.text.trim())
            .filter(Boolean)
            .join("\n\n");
        } else {
          extractedText = extracted.pages
            .map((p) => p.text.trim())
            .filter(Boolean)
            .join("\n\n");
        }
      } else if (docType === "jpeg" || docType === "png") {
        fileType = "image";
        const ocrResult = await ocrImageBuffer(Buffer.from(arrayBuffer), "balanced", "eng");
        extractedText = ocrResult.text.trim();
      } else {
        return NextResponse.json(
          {
            error:
              "Unsupported file type. Please upload a PDF, JPG, or PNG file.",
          },
          { status: 400 }
        );
      }

      if (!extractedText || extractedText.length < MIN_TEXT_LENGTH) {
        return NextResponse.json(
          {
            error:
              "No readable text could be extracted from the uploaded file. Try a different document or paste the text directly.",
          },
          { status: 422 }
        );
      }

      if (extractedText.length > MAX_TEXT_LENGTH) {
        extractedText = extractedText.slice(0, MAX_TEXT_LENGTH);
      }
    }

    // ── Run AI Writing Processing ────────────────────────────────────────────
    let result;
    try {
      result = await processWriting({
        text: extractedText,
        mode,
        tone,
        filename,
      });
    } catch (aiErr: unknown) {
      if (aiErr instanceof MissingApiKeyError) {
        return NextResponse.json(
          {
            error:
              aiErr.message ||
              "AI Writing Assistant is not available. The server-side AI API key has not been configured.",
            code: "AI_NOT_CONFIGURED",
          },
          { status: 503 }
        );
      }

      const message = aiErr instanceof Error ? aiErr.message : "Unknown error";
      const lowerMessage = message.toLowerCase();

      if (
        message.includes("401") ||
        lowerMessage.includes("incorrect api key") ||
        lowerMessage.includes("api_key_invalid") ||
        lowerMessage.includes("invalid api key")
      ) {
        return NextResponse.json(
          { error: "Invalid AI credentials. Please check your AI API key configuration." },
          { status: 503 }
        );
      }

      if (
        message.includes("429") ||
        lowerMessage.includes("rate limit") ||
        lowerMessage.includes("resource_exhausted") ||
        lowerMessage.includes("quota") ||
        lowerMessage.includes("too many requests")
      ) {
        return NextResponse.json(
          {
            error:
              "AI service rate limit exceeded. Please wait a moment and try again.",
          },
          { status: 429 }
        );
      }

      if (
        lowerMessage.includes("timeout") ||
        lowerMessage.includes("timed out") ||
        lowerMessage.includes("aborted")
      ) {
        return NextResponse.json(
          { error: "AI service request timed out. Please try again." },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: `AI service error: ${message}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: result.mode,
      tone: result.tone,
      outputText: result.outputText,
      wordCountBefore: result.wordCountBefore,
      wordCountAfter: result.wordCountAfter,
      filename,
      fileType,
      inputTextLength: extractedText.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[writing-assistant] Unexpected error:", message);
    return NextResponse.json(
      { error: `Processing failed: ${message}` },
      { status: 500 }
    );
  }
}
