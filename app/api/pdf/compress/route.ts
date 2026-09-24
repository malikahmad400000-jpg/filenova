import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import sharp from "sharp";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export type CompressionLevel = "basic" | "recommended" | "maximum";

interface CompressionSettings {
  quality: number;
  maxDimension: number;
  stripMetadata: boolean;
}

const LEVEL_SETTINGS: Record<CompressionLevel, CompressionSettings> = {
  basic: {
    quality: 80,
    maxDimension: 1800,
    stripMetadata: false,
  },
  recommended: {
    quality: 65,
    maxDimension: 1200,
    stripMetadata: true,
  },
  maximum: {
    quality: 45,
    maxDimension: 800,
    stripMetadata: true,
  },
};

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
          error: "Compress PDF only accepts exactly one file at a time. Please select a single PDF.",
        },
        { status: 400 }
      );
    }

    const file = allFiles[0];

    // Check size limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File "${file.name}" exceeds the maximum allowed size of 50 MB.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const originalBytes = new Uint8Array(arrayBuffer);

    // Verify magic bytes
    if (!hasPdfMagicBytes(originalBytes)) {
      return NextResponse.json(
        {
          error: `File "${file.name}" is not a valid PDF document (header signature mismatch).`,
        },
        { status: 400 }
      );
    }

    // Determine compression level
    const rawLevel = (formData.get("level")?.toString() || "recommended").toLowerCase();
    const level: CompressionLevel =
      rawLevel === "basic" || rawLevel === "maximum" ? rawLevel : "recommended";
    const settings = LEVEL_SETTINGS[level];

    // Load PDF
    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parsing error";
      return NextResponse.json(
        {
          error: `Could not parse "${file.name}". The document may be corrupted or password-protected: ${msg}`,
        },
        { status: 400 }
      );
    }

    const totalPages = pdfDoc.getPageCount();
    if (totalPages === 0) {
      return NextResponse.json(
        { error: "The provided PDF document contains no readable pages." },
        { status: 400 }
      );
    }

    const context = pdfDoc.context;

    // 1. Image Optimization Phase:
    // Inspect indirect objects and optimize image streams
    for (const [ref, obj] of context.enumerateIndirectObjects()) {
      if (
        obj instanceof PDFRawStream &&
        obj.dict &&
        obj.dict.get(PDFName.of("Subtype")) === PDFName.of("Image")
      ) {
        const filter = obj.dict.get(PDFName.of("Filter"));

        // Process JPEG streams (/DCTDecode)
        if (filter === PDFName.of("DCTDecode") && obj.contents.length > 512) {
          try {
            const imageBuffer = Buffer.from(obj.contents);
            const metadata = await sharp(imageBuffer).metadata();

            if (metadata.width && metadata.height) {
              let pipeline = sharp(imageBuffer);

              // Downsample resolution if exceeding max dimension
              if (
                metadata.width > settings.maxDimension ||
                metadata.height > settings.maxDimension
              ) {
                pipeline = pipeline.resize({
                  width:
                    metadata.width >= metadata.height
                      ? settings.maxDimension
                      : undefined,
                  height:
                    metadata.height > metadata.width
                      ? settings.maxDimension
                      : undefined,
                  withoutEnlargement: true,
                  fit: "inside",
                });
              }

              const compressedBuffer = await pipeline
                .jpeg({
                  quality: settings.quality,
                  mozjpeg: true,
                  force: true,
                })
                .toBuffer();

              // Only update if smaller than original image stream
              if (compressedBuffer.length < obj.contents.length) {
                const newMeta = await sharp(compressedBuffer).metadata();
                obj.dict.set(PDFName.of("Length"), context.obj(compressedBuffer.length));

                if (newMeta.width && newMeta.height) {
                  obj.dict.set(PDFName.of("Width"), context.obj(newMeta.width));
                  obj.dict.set(PDFName.of("Height"), context.obj(newMeta.height));
                }

                const newStream = PDFRawStream.of(
                  obj.dict,
                  new Uint8Array(compressedBuffer)
                );
                context.assign(ref, newStream);
              }
            }
          } catch {
            // If an individual image fails to re-encode, safely preserve original
          }
        }
      }
    }

    // 2. Metadata Cleanup Phase:
    if (settings.stripMetadata) {
      try {
        const catalog = pdfDoc.catalog;
        catalog.delete(PDFName.of("Metadata"));
        catalog.delete(PDFName.of("PieceInfo"));
      } catch {
        // Continue if catalog metadata removal is not applicable
      }
    }

    // 3. Document Serialization with Object Streams:
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    // 4. Verification & Size Comparison:
    // If compressed size is actually larger than original (e.g. already compressed tiny file),
    // serve the original to prevent document inflation.
    const isSmaller = compressedPdfBytes.length < originalBytes.length;
    const finalBytes = isSmaller ? compressedPdfBytes : originalBytes;
    const originalSize = originalBytes.length;
    const finalSize = finalBytes.length;
    const savedBytes = Math.max(0, originalSize - finalSize);
    const reductionPercent =
      originalSize > 0
        ? Math.round(((originalSize - finalSize) / originalSize) * 100)
        : 0;

    const originalBaseName = file.name.replace(/\.[^/.]+$/, "");
    const outputName = `${originalBaseName}-compressed.pdf`;

    return new NextResponse(Buffer.from(finalBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Content-Length": finalSize.toString(),
        "X-Original-Size": originalSize.toString(),
        "X-Compressed-Size": finalSize.toString(),
        "X-Saved-Bytes": savedBytes.toString(),
        "X-Reduction-Percent": reductionPercent.toString(),
        "X-Already-Optimized": (!isSmaller).toString(),
        "X-Total-Pages": totalPages.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An error occurred while compressing your PDF: ${message}` },
      { status: 500 }
    );
  }
}
