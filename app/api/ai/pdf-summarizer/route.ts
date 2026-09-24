import { NextResponse, type NextRequest } from "next/server";
import { extractTextFromPdf, hasPdfMagicBytes } from "@/lib/ai/pdf-text-extractor";
import { chunkPages } from "@/lib/ai/chunker";
import {
  generateSummary,
  VALID_SUMMARY_LEVELS,
  type SummaryLevel,
} from "@/lib/ai/summarizer";
import { MissingApiKeyError } from "@/lib/ai/provider";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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

    // ── Validate file ────────────────────────────────────────────────────────
    const fileEntries = formData.getAll("file");
    const allFiles = fileEntries.filter((e): e is File => e instanceof File);

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: "No PDF file provided. Please upload a PDF document." },
        { status: 400 }
      );
    }

    if (allFiles.length > 1) {
      return NextResponse.json(
        { error: "PDF Summarizer accepts exactly one file at a time. Please select a single PDF." },
        { status: 400 }
      );
    }

    const file = allFiles[0];

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File "${file.name}" exceeds the maximum allowed size of 50 MB.` },
        { status: 413 }
      );
    }

    // ── Validate summary level ───────────────────────────────────────────────
    const rawLevel = formData.get("summaryLevel")?.toString()?.trim() ?? "";
    if (!rawLevel) {
      return NextResponse.json(
        { error: 'summaryLevel is required. Must be one of: "quick", "standard", "detailed".' },
        { status: 400 }
      );
    }

    if (!VALID_SUMMARY_LEVELS.includes(rawLevel as SummaryLevel)) {
      return NextResponse.json(
        {
          error: `Invalid summaryLevel "${rawLevel}". Must be one of: "quick", "standard", "detailed".`,
        },
        { status: 400 }
      );
    }

    const summaryLevel = rawLevel as SummaryLevel;

    // ── Read file bytes ──────────────────────────────────────────────────────
    let bytes: Uint8Array;
    try {
      const buffer = await file.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } catch {
      return NextResponse.json(
        { error: "Failed to read the uploaded file." },
        { status: 400 }
      );
    }

    // ── Validate PDF signature ───────────────────────────────────────────────
    if (!hasPdfMagicBytes(bytes)) {
      return NextResponse.json(
        {
          error: `File "${file.name}" is not a valid PDF document (header signature mismatch).`,
        },
        { status: 400 }
      );
    }

    // ── Extract text ─────────────────────────────────────────────────────────
    let extracted;
    try {
      extracted = await extractTextFromPdf(bytes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parsing error";
      return NextResponse.json(
        {
          error: `Could not parse "${file.name}". The document may be corrupted or password-protected: ${msg}`,
        },
        { status: 400 }
      );
    }

    // ── Scanned PDF guard ────────────────────────────────────────────────────
    if (extracted.isScanned) {
      return NextResponse.json(
        {
          error:
            "This PDF appears to be scanned or image-based. Smart OCR is required to generate a reliable summary.",
          isScanned: true,
        },
        { status: 422 }
      );
    }

    // ── Chunk text ───────────────────────────────────────────────────────────
    const chunks = chunkPages(extracted.pages);

    // ── Generate summary ─────────────────────────────────────────────────────
    let summary;
    try {
      summary = await generateSummary({
        chunks,
        summaryLevel,
        filename: file.name,
        totalPages: extracted.totalPages,
        totalWords: extracted.totalWords,
      });
    } catch (aiErr) {
      if (aiErr instanceof MissingApiKeyError) {
        return NextResponse.json({ error: aiErr.message }, { status: 503 });
      }
      const msg = aiErr instanceof Error ? aiErr.message : "AI service error";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // ── Return result ────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      filename: file.name,
      fileSize: file.size,
      totalPages: extracted.totalPages,
      totalWords: extracted.totalWords,
      summaryLevel,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An unexpected error occurred while processing the PDF: ${message}` },
      { status: 500 }
    );
  }
}
