import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Checks whether a buffer starts with standard PDF magic bytes "%PDF-"
 */
function hasPdfMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 5) return false;
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

    // Check file count: accept exactly one file
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
          error: "Split PDF only accepts exactly one file at a time. Please select a single PDF.",
        },
        { status: 400 }
      );
    }

    const file = allFiles[0];

    // Check size limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File "${file.name}" exceeds the maximum allowed size of 25 MB.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Verify magic bytes
    if (!hasPdfMagicBytes(bytes)) {
      return NextResponse.json(
        {
          error: `File "${file.name}" is not a valid PDF document (header signature mismatch).`,
        },
        { status: 400 }
      );
    }

    // Load PDF
    let sourceDoc: PDFDocument;
    try {
      sourceDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parsing error";
      return NextResponse.json(
        {
          error: `Could not parse "${file.name}". The document may be corrupted or password-protected: ${msg}`,
        },
        { status: 400 }
      );
    }

    const totalPages = sourceDoc.getPageCount();
    if (totalPages === 0) {
      return NextResponse.json(
        { error: "The provided PDF document contains no readable pages." },
        { status: 400 }
      );
    }

    const mode = formData.get("mode")?.toString() || "range";

    // Mode A: Extract Page Range
    if (mode === "range") {
      const rawStart = formData.get("startPage")?.toString();
      const rawEnd = formData.get("endPage")?.toString();

      if (!rawStart || !rawEnd) {
        return NextResponse.json(
          { error: "Start page and End page are required for range extraction." },
          { status: 400 }
        );
      }

      const startPage = parseInt(rawStart, 10);
      const endPage = parseInt(rawEnd, 10);

      if (Number.isNaN(startPage) || Number.isNaN(endPage)) {
        return NextResponse.json(
          { error: "Start page and End page must be valid integers." },
          { status: 400 }
        );
      }

      if (startPage < 1) {
        return NextResponse.json(
          { error: `Start page must be at least 1. Received: ${startPage}.` },
          { status: 400 }
        );
      }

      if (endPage > totalPages) {
        return NextResponse.json(
          {
            error: `End page (${endPage}) cannot exceed the document's total pages (${totalPages}).`,
          },
          { status: 400 }
        );
      }

      if (startPage > endPage) {
        return NextResponse.json(
          {
            error: `Start page (${startPage}) cannot be greater than End page (${endPage}).`,
          },
          { status: 400 }
        );
      }

      // Extract specified range
      const rangeDoc = await PDFDocument.create();
      const pageIndices: number[] = [];
      for (let i = startPage - 1; i <= endPage - 1; i++) {
        pageIndices.push(i);
      }

      const copiedPages = await rangeDoc.copyPages(sourceDoc, pageIndices);
      for (const page of copiedPages) {
        rangeDoc.addPage(page);
      }

      const originalBaseName = file.name.replace(/\.[^/.]+$/, "");
      const outputName = `${originalBaseName}-pages-${startPage}-to-${endPage}.pdf`;

      rangeDoc.setTitle(outputName);
      rangeDoc.setCreator("FileNova Split Tool");
      rangeDoc.setProducer("FileNova");

      const resultBytes = await rangeDoc.save();

      return new NextResponse(Buffer.from(resultBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${outputName}"`,
          "Content-Length": resultBytes.byteLength.toString(),
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Mode B: Split Every Page
    if (mode === "all") {
      const zip = new JSZip();
      const originalBaseName = file.name.replace(/\.[^/.]+$/, "");

      for (let i = 0; i < totalPages; i++) {
        const singleDoc = await PDFDocument.create();
        const [copiedPage] = await singleDoc.copyPages(sourceDoc, [i]);
        singleDoc.addPage(copiedPage);

        singleDoc.setTitle(`${originalBaseName}-page-${i + 1}`);
        singleDoc.setCreator("FileNova Split Tool");
        singleDoc.setProducer("FileNova");

        const pageBytes = await singleDoc.save();
        zip.file(`page-${i + 1}.pdf`, pageBytes);
      }

      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const zipOutputName = `${originalBaseName}-split-pages.zip`;

      return new NextResponse(zipBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${zipOutputName}"`,
          "Content-Length": zipBuffer.byteLength.toString(),
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      { error: `Unsupported split mode "${mode}". Allowed modes are "range" or "all".` },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An error occurred while splitting your PDF: ${message}` },
      { status: 500 }
    );
  }
}
