import { NextResponse, type NextRequest } from "next/server";
import { extractTextFromPdf, hasPdfMagicBytes } from "@/lib/ai/pdf-text-extractor";
import { chunkPages } from "@/lib/ai/chunker";
import { documentStore } from "@/lib/ai/doc-store";

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

    const formData = await request.formData();

    const fileEntries = formData.getAll("file");
    const filesEntries = formData.getAll("files");
    const allFiles = [...fileEntries, ...filesEntries].filter(
      (entry): entry is File => entry instanceof File
    );

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: "No PDF file provided. Please upload a PDF document." },
        { status: 400 }
      );
    }

    if (allFiles.length > 1) {
      return NextResponse.json(
        {
          error: "Chat with PDF accepts exactly one file at a time. Please select a single PDF.",
        },
        { status: 400 }
      );
    }

    const file = allFiles[0];

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File "${file.name}" exceeds the maximum allowed size of 50 MB.`,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Validate PDF magic bytes (%PDF-)
    if (!hasPdfMagicBytes(bytes)) {
      return NextResponse.json(
        {
          error: `File "${file.name}" is not a valid PDF document (header signature mismatch).`,
        },
        { status: 400 }
      );
    }

    // Extract text from pages
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

    // Chunk pages
    const chunks = chunkPages(extracted.pages);

    // Create session document ID
    const documentId = crypto.randomUUID();

    // Store in document store
    await documentStore.saveDocument({
      documentId,
      filename: file.name,
      fileSize: file.size,
      totalPages: extracted.totalPages,
      totalWords: extracted.totalWords,
      isScanned: extracted.isScanned,
      chunks,
    });

    return NextResponse.json({
      success: true,
      documentId,
      filename: file.name,
      fileSize: file.size,
      totalPages: extracted.totalPages,
      totalWords: extracted.totalWords,
      chunkCount: chunks.length,
      isScanned: extracted.isScanned,
      warning: extracted.isScanned
        ? "This PDF appears to contain little or no searchable text. Smart OCR will be required to chat reliably with this document."
        : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An unexpected error occurred while processing PDF: ${message}` },
      { status: 500 }
    );
  }
}
