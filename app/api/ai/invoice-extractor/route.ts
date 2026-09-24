import { NextResponse, type NextRequest } from "next/server";
import { extractTextFromPdf } from "@/lib/ai/pdf-text-extractor";
import { detectDocumentType, ocrImageBuffer } from "@/lib/ai/ocr";
import { ocrPdfDocument } from "@/lib/ai/pdf-ocr";
import { extractInvoiceData } from "@/lib/ai/invoice-extractor";
import { MissingApiKeyError } from "@/lib/ai/provider";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_PDF_PAGES = 15;
const MAX_OCR_PAGES = 10;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid Content-Type. Request must be multipart/form-data." },
        { status: 400 }
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
        { error: "No document provided. Please upload an invoice PDF, JPG, or PNG." },
        { status: 400 }
      );
    }

    if (allFiles.length > 1) {
      return NextResponse.json(
        {
          error:
            "Invoice Extractor accepts exactly one invoice document at a time. Please select a single file.",
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

    // Read binary bytes & validate file signature
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

    let extractedText = "";
    let pageCount = 1;

    // ── Document Ingestion / Text Extraction ──────────────────────────────────
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
            error: `This document has too many pages for invoice extraction. Maximum limit is ${MAX_PDF_PAGES} pages (received ${extracted.totalPages}).`,
          },
          { status: 400 }
        );
      }

      pageCount = extracted.totalPages;

      // Scanned PDF detection -> OCR fallback
      if (extracted.isScanned || extracted.totalWords < 5) {
        try {
          const ocrResult = await ocrPdfDocument(bytes, "balanced", "eng", MAX_OCR_PAGES);
          extractedText = ocrResult.pages.map((p) => p.text).join("\n\n");
          pageCount = ocrResult.pageCount;
        } catch (ocrErr) {
          const msg = ocrErr instanceof Error ? ocrErr.message : "OCR failed";
          return NextResponse.json(
            { error: `OCR extraction failed on scanned PDF: ${msg}` },
            { status: 400 }
          );
        }
      } else {
        extractedText = extracted.pages.map((p) => p.text).join("\n\n");
      }
    } else {
      // JPG or PNG image invoice
      try {
        const imageBuffer = Buffer.from(arrayBuffer);
        const ocrResult = await ocrImageBuffer(imageBuffer, "balanced", "eng");
        extractedText = ocrResult.text;
        pageCount = 1;
      } catch (imgErr) {
        const msg = imgErr instanceof Error ? imgErr.message : "Image processing failed";
        return NextResponse.json(
          { error: `Could not process image for invoice extraction: ${msg}` },
          { status: 400 }
        );
      }
    }

    // Check minimum readable text
    const totalWords = extractedText.split(/\s+/).filter(Boolean).length;
    if (totalWords < 3) {
      return NextResponse.json(
        {
          error:
            "Unable to extract readable text from this document. Try a clearer scan or a text-based PDF.",
        },
        { status: 422 }
      );
    }

    // ── Execute AI Invoice Extraction ─────────────────────────────────────────
    let invoiceData;
    try {
      invoiceData = await extractInvoiceData({
        text: extractedText,
        totalPages: pageCount,
        filename: file.name,
      });
    } catch (aiErr: unknown) {
      if (aiErr instanceof MissingApiKeyError) {
        return NextResponse.json(
          {
            error:
              aiErr.message ||
              "AI Invoice Extractor is not available. The server-side AI API key has not been configured.",
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
        { error: `AI invoice extraction error: ${message}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      fileSize: file.size,
      fileType: docType,
      ...invoiceData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[invoice-extractor] Unexpected error:", message);
    return NextResponse.json(
      { error: `Processing failed: ${message}` },
      { status: 500 }
    );
  }
}
