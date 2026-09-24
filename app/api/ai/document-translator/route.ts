import { NextResponse, type NextRequest } from "next/server";
import { detectDocumentType, ocrImageBuffer } from "@/lib/ai/ocr";
import { ocrPdfDocument, MAX_OCR_PAGES } from "@/lib/ai/pdf-ocr";
import { extractTextFromPdf } from "@/lib/ai/pdf-text-extractor";
import {
  translateDocument,
  isValidSourceLanguage,
  isValidTargetLanguage,
  type TranslationMode,
  VALID_TRANSLATION_MODES,
} from "@/lib/ai/translator";
import { MissingApiKeyError } from "@/lib/ai/provider";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_PDF_PAGES = 10;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid content type. Expected multipart/form-data." },
        { status: 400 }
      );
    }

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
        { error: "Malformed request. Could not parse form data." },
        { status: 400 }
      );
    }

    // ── Validate file input ──────────────────────────────────────────────────
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
        { error: "Document Translator accepts exactly one document at a time. Please select a single file." },
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

    // ── Validate languages ───────────────────────────────────────────────────
    const sourceLanguage = (formData.get("sourceLanguage")?.toString()?.trim() || "auto").toLowerCase();
    const targetLanguage = (formData.get("targetLanguage")?.toString()?.trim() || "en").toLowerCase();

    if (!isValidSourceLanguage(sourceLanguage)) {
      return NextResponse.json(
        { error: `Invalid source language code "${sourceLanguage}".` },
        { status: 400 }
      );
    }

    if (!isValidTargetLanguage(targetLanguage)) {
      return NextResponse.json(
        { error: `Invalid target language code "${targetLanguage}".` },
        { status: 400 }
      );
    }

    if (sourceLanguage !== "auto" && sourceLanguage === targetLanguage) {
      return NextResponse.json(
        { error: "Source and target languages cannot be identical. Please choose a different target language." },
        { status: 400 }
      );
    }

    // ── Validate translation mode ────────────────────────────────────────────
    let rawMode = (formData.get("mode")?.toString()?.trim() || "balanced").toLowerCase() as TranslationMode;
    if (rawMode === ("accurate" as unknown)) {
      rawMode = "high_quality";
    }

    if (!VALID_TRANSLATION_MODES.includes(rawMode)) {
      return NextResponse.json(
        { error: `Invalid translation mode "${rawMode}". Must be one of: fast, balanced, high_quality.` },
        { status: 400 }
      );
    }
    const mode = rawMode;

    // ── Read file bytes & validate binary magic bytes ────────────────────────
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

    // ── Extract or OCR document content ──────────────────────────────────────
    let documentPages: { pageNumber: number; text: string }[] = [];

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
            error: `This document has too many pages for translation. Maximum limit is ${MAX_PDF_PAGES} pages (received ${extracted.totalPages}).`,
          },
          { status: 400 }
        );
      }

      // If document is scanned / image-only (< 5 words), automatically run Smart OCR
      if (extracted.isScanned) {
        try {
          const ocrResult = await ocrPdfDocument(bytes, "balanced", "eng", MAX_OCR_PAGES);
          documentPages = ocrResult.pages.map((p) => ({
            pageNumber: p.page,
            text: p.text,
          }));
        } catch (ocrErr) {
          const msg = ocrErr instanceof Error ? ocrErr.message : "OCR failed";
          return NextResponse.json(
            { error: `OCR extraction failed on scanned PDF: ${msg}` },
            { status: 400 }
          );
        }
      } else {
        documentPages = extracted.pages.map((p) => ({
          pageNumber: p.pageNumber,
          text: p.text,
        }));
      }
    } else {
      // JPEG or PNG
      try {
        const imageBuffer = Buffer.from(arrayBuffer);
        const ocrResult = await ocrImageBuffer(imageBuffer, "balanced", "eng");
        documentPages = [{ pageNumber: 1, text: ocrResult.text }];
      } catch (imgErr) {
        const msg = imgErr instanceof Error ? imgErr.message : "Image processing failed";
        return NextResponse.json(
          { error: `Could not process image for translation: ${msg}` },
          { status: 400 }
        );
      }
    }

    // Check if any readable text was extracted
    const totalWords = documentPages.reduce(
      (sum, p) => sum + p.text.split(/\s+/).filter(Boolean).length,
      0
    );

    if (totalWords < 3) {
      return NextResponse.json(
        {
          error: "Unable to extract readable text from this document. Try a clearer scan or a text-based PDF.",
        },
        { status: 422 }
      );
    }

    // ── Translate with AI ────────────────────────────────────────────────────
    let translation;
    try {
      translation = await translateDocument({
        pages: documentPages,
        sourceLanguage,
        targetLanguage,
        mode,
        filename: file.name,
      });
    } catch (aiErr) {
      if (aiErr instanceof MissingApiKeyError) {
        return NextResponse.json({ error: aiErr.message }, { status: 503 });
      }
      const msg = aiErr instanceof Error ? aiErr.message : "AI translation failed";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      fileSize: file.size,
      ...translation,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An unexpected error occurred during translation: ${message}` },
      { status: 500 }
    );
  }
}
