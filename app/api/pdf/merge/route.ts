import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

// Server-side validation constants
const MIN_FILES = 2;
const MAX_FILES = 20;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB per file
const MAX_TOTAL_SIZE = 60 * 1024 * 1024; // 60 MB total

/**
 * Checks whether a buffer starts with standard PDF magic bytes "%PDF-"
 */
function hasPdfMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 5) return false;
  // %PDF- in ASCII is 0x25, 0x50, 0x44, 0x46, 0x2D
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

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
    // Support files submitted under 'files' key (multiple) or 'file'
    const fileEntries = formData.getAll("files");
    const rawFiles: File[] = [];

    for (const entry of fileEntries) {
      if (entry instanceof File) {
        rawFiles.push(entry);
      }
    }

    // 1. Validate file count
    if (rawFiles.length < MIN_FILES) {
      return NextResponse.json(
        {
          error: `At least ${MIN_FILES} PDF files are required for merging. Received ${rawFiles.length}.`,
        },
        { status: 400 }
      );
    }

    if (rawFiles.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: `A maximum of ${MAX_FILES} files can be merged at once. Received ${rawFiles.length}.`,
        },
        { status: 400 }
      );
    }

    // 2. Validate individual and total file sizes
    let totalSize = 0;
    for (const file of rawFiles) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds the maximum allowed size of 25 MB.`,
          },
          { status: 400 }
        );
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        {
          error: `Total upload size exceeds the maximum limit of 60 MB.`,
        },
        { status: 400 }
      );
    }

    // 3. Create merged PDF in memory using pdf-lib
    const mergedDoc = await PDFDocument.create();

    // Preserve exact client order
    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Verify file magic bytes
      if (!hasPdfMagicBytes(bytes)) {
        return NextResponse.json(
          {
            error: `File "${file.name}" is not a valid PDF document (header signature mismatch).`,
          },
          { status: 400 }
        );
      }

      let donorDoc: PDFDocument;
      try {
        donorDoc = await PDFDocument.load(bytes, {
          ignoreEncryption: true,
        });
      } catch (loadError) {
        const errorMsg =
          loadError instanceof Error ? loadError.message : "Unknown parsing error";
        return NextResponse.json(
          {
            error: `Could not parse "${file.name}". The document may be corrupted or password-encrypted: ${errorMsg}`,
          },
          { status: 400 }
        );
      }

      const pageCount = donorDoc.getPageCount();
      if (pageCount === 0) {
        continue; // Skip empty documents
      }

      const pageIndices = donorDoc.getPageIndices();
      const copiedPages = await mergedDoc.copyPages(donorDoc, pageIndices);

      for (const page of copiedPages) {
        mergedDoc.addPage(page);
      }
    }

    if (mergedDoc.getPageCount() === 0) {
      return NextResponse.json(
        {
          error: "The provided PDF files contained no readable pages to merge.",
        },
        { status: 400 }
      );
    }

    // Set document metadata
    mergedDoc.setTitle("Merged Document - FileNova");
    mergedDoc.setCreator("FileNova PDF Tools");
    mergedDoc.setProducer("FileNova");

    const mergedPdfBytes = await mergedDoc.save();

    // 4. Return the merged PDF binary stream
    return new NextResponse(Buffer.from(mergedPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="filenova-merged.pdf"',
        "Content-Length": mergedPdfBytes.byteLength.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      {
        error: `An error occurred while merging your PDF files: ${message}`,
      },
      { status: 500 }
    );
  }
}
