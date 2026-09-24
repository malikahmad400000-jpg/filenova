import { NextResponse, type NextRequest } from "next/server";
import {
  type OcrMode,
  VALID_OCR_MODES,
  detectDocumentType,
  ocrImageBuffer,
  type OcrResult,
} from "@/lib/ai/ocr";
import { ocrPdfDocument, MAX_OCR_PAGES } from "@/lib/ai/pdf-ocr";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

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
        { error: "Smart OCR accepts exactly one document at a time. Please select a single file." },
        { status: 400 }
      );
    }

    const file = allFiles[0];

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File "${file.name}" exceeds the maximum allowed size of 25 MB.` },
        { status: 413 }
      );
    }

    // ── Validate OCR mode ────────────────────────────────────────────────────
    const rawMode = (formData.get("mode")?.toString()?.trim() || "balanced") as OcrMode;
    if (!VALID_OCR_MODES.includes(rawMode)) {
      return NextResponse.json(
        {
          error: `Invalid OCR mode "${rawMode}". Must be one of: "fast", "balanced", "accurate".`,
        },
        { status: 400 }
      );
    }
    const mode = rawMode;

    // ── Read file bytes ──────────────────────────────────────────────────────
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

    // ── Binary signature validation ──────────────────────────────────────────
    const docType = detectDocumentType(bytes);
    if (!docType) {
      return NextResponse.json(
        {
          error: `Unsupported file format for "${file.name}". Please upload a valid PDF, JPG, or PNG document (header signature mismatch).`,
        },
        { status: 400 }
      );
    }

    // ── Process PDF or Image ─────────────────────────────────────────────────
    let ocrResult: OcrResult;

    if (docType === "pdf") {
      try {
        ocrResult = await ocrPdfDocument(bytes, mode, "eng", MAX_OCR_PAGES);
      } catch (pdfErr) {
        const msg = pdfErr instanceof Error ? pdfErr.message : "PDF OCR processing failed";
        return NextResponse.json(
          { error: msg },
          { status: 400 }
        );
      }
    } else {
      // JPEG or PNG Image
      try {
        const imageBuffer = Buffer.from(arrayBuffer);
        const { text, confidence } = await ocrImageBuffer(imageBuffer, mode, "eng");

        ocrResult = {
          text,
          pages: [
            {
              page: 1,
              text,
              confidence,
            },
          ],
          pageCount: 1,
          averageConfidence: confidence,
          mode,
          sourceType: "image",
        };
      } catch (imgErr) {
        const msg = imgErr instanceof Error ? imgErr.message : "Image OCR processing failed";
        return NextResponse.json(
          { error: `This file appears to be corrupted or cannot be processed: ${msg}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      fileSize: file.size,
      ...ocrResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An unexpected error occurred while processing OCR: ${message}` },
      { status: 500 }
    );
  }
}
