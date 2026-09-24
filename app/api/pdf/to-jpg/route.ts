import { NextResponse, type NextRequest } from "next/server";
import JSZip from "jszip";
import { createCanvas } from "@napi-rs/canvas";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export type QualityLevel = "standard" | "high" | "maximum";

interface QualityConfig {
  scale: number;
  quality: number;
}

const QUALITY_CONFIGS: Record<QualityLevel, QualityConfig> = {
  standard: {
    scale: 1.5,
    quality: 0.8,
  },
  high: {
    scale: 2.0,
    quality: 0.9,
  },
  maximum: {
    scale: 3.0,
    quality: 0.95,
  },
};

/**
 * Validates that the buffer starts with the PDF magic signature %PDF-
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

    // Extract file entries
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
          error: "PDF to JPG only accepts exactly one file at a time. Please select a single PDF.",
        },
        { status: 400 }
      );
    }

    const file = allFiles[0];

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File "${file.name}" exceeds the maximum allowed size of 50 MB.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Verify PDF header magic bytes
    if (!hasPdfMagicBytes(bytes)) {
      return NextResponse.json(
        {
          error: `File "${file.name}" is not a valid PDF document (header signature mismatch).`,
        },
        { status: 400 }
      );
    }

    // Quality level
    const requestedQuality = (formData.get("quality")?.toString() || "high") as QualityLevel;
    const qualityConfig = QUALITY_CONFIGS[requestedQuality] || QUALITY_CONFIGS.high;

    // Dynamically import pdfjs-dist legacy build for Node.js environment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

    let pdfDoc;
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: bytes,
        disableFontFace: true,
        verbosity: 0,
      });
      pdfDoc = await loadingTask.promise;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parsing error";
      return NextResponse.json(
        {
          error: `Could not parse "${file.name}". The document may be corrupted or password-protected: ${msg}`,
        },
        { status: 400 }
      );
    }

    const totalPages = pdfDoc.numPages;
    if (totalPages === 0) {
      return NextResponse.json(
        { error: "The provided PDF document contains no readable pages." },
        { status: 400 }
      );
    }

    const rawBaseName = file.name.replace(/\.[^/.]+$/, "");
    const safeBaseName = rawBaseName.replace(/[^a-zA-Z0-9_-]/g, "_") || "filenova";

    // CASE 1: Single-page PDF -> Direct JPG download
    if (totalPages === 1) {
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: qualityConfig.scale });
      const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
      const ctx = canvas.getContext("2d");

      // Fill crisp white background (PDF pages default to transparent in canvas)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;

      const jpgBuffer = canvas.toBuffer(
        "image/jpeg",
        Math.round(qualityConfig.quality * 100)
      );

      const outputFilename = `${safeBaseName}-page-1.jpg`;

      return new NextResponse(jpgBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${outputFilename}"`,
          "Content-Length": jpgBuffer.byteLength.toString(),
          "X-Total-Pages": "1",
          "X-Quality-Level": requestedQuality,
          "X-Image-Width": Math.round(viewport.width).toString(),
          "X-Image-Height": Math.round(viewport.height).toString(),
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // CASE 2: Multi-page PDF -> Render all pages and bundle into ZIP
    const zip = new JSZip();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: qualityConfig.scale });
      const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
      const ctx = canvas.getContext("2d");

      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;

      const jpgBuffer = canvas.toBuffer(
        "image/jpeg",
        Math.round(qualityConfig.quality * 100)
      );

      const pageFilename = `filenova-page-${pageNum}.jpg`;
      zip.file(pageFilename, jpgBuffer);
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const zipFilename = `${safeBaseName}-jpg-pages.zip`;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipBuffer.byteLength.toString(),
        "X-Total-Pages": totalPages.toString(),
        "X-Quality-Level": requestedQuality,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An error occurred while converting your PDF to JPG: ${message}` },
      { status: 500 }
    );
  }
}
