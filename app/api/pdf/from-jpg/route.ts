import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

const MAX_INDIVIDUAL_FILE_SIZE = 25 * 1024 * 1024; // 25 MB per image
const MAX_TOTAL_BATCH_SIZE = 100 * 1024 * 1024; // 100 MB total
const MAX_FILES_COUNT = 50; // Up to 50 images

export type PageSizeMode = "fit" | "a4" | "letter";
export type MarginMode = "none" | "small" | "normal";

/**
 * Validates whether the buffer begins with standard JPEG magic bytes: FF D8 FF
 */
function hasJpegMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 3) return false;
  return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
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

    // Extract file entries in user-provided order
    const fileEntries = formData.getAll("file");
    const filesEntries = formData.getAll("files");
    const allFiles = [...fileEntries, ...filesEntries].filter(
      (entry): entry is File => entry instanceof File
    );

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: "No JPG image files provided. Please upload at least one image." },
        { status: 400 }
      );
    }

    if (allFiles.length > MAX_FILES_COUNT) {
      return NextResponse.json(
        {
          error: `Too many files. Maximum allowed is ${MAX_FILES_COUNT} images per conversion.`,
        },
        { status: 400 }
      );
    }

    // Check individual and total file sizes
    let totalBatchSize = 0;
    for (const file of allFiles) {
      if (file.size === 0) {
        return NextResponse.json(
          { error: `File "${file.name}" is empty (0 bytes).` },
          { status: 400 }
        );
      }

      if (file.size > MAX_INDIVIDUAL_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds the maximum allowed size of 25 MB per image.`,
          },
          { status: 400 }
        );
      }
      totalBatchSize += file.size;
    }

    if (totalBatchSize > MAX_TOTAL_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Total upload size exceeds the maximum limit of 100 MB. Please convert fewer images at once.`,
        },
        { status: 400 }
      );
    }

    // Page layout settings
    const pageSizeMode = (formData.get("pageSize")?.toString() || "fit") as PageSizeMode;
    const marginMode = (formData.get("margin")?.toString() || (pageSizeMode === "fit" ? "none" : "small")) as MarginMode;

    const marginPt =
      marginMode === "none" ? 0 : marginMode === "normal" ? 36 : 18; // 0, 0.5in, 0.25in

    // Create target PDF document
    const pdfDoc = await PDFDocument.create();

    // Process each image in exact order
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Verify JPEG magic bytes
      if (!hasJpegMagicBytes(bytes)) {
        return NextResponse.json(
          {
            error: `File "${file.name}" is not a valid JPEG image (missing FF D8 FF signature).`,
          },
          { status: 400 }
        );
      }

      // Embed JPEG into PDF
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let embeddedImage: any;
      try {
        embeddedImage = await pdfDoc.embedJpg(bytes);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid or corrupt JPEG";
        return NextResponse.json(
          {
            error: `Could not process "${file.name}". The image may be corrupt or encoded in an unsupported JPEG variant: ${msg}`,
          },
          { status: 400 }
        );
      }

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      if (pageSizeMode === "fit") {
        // MODE 1: Page dimensions match image dimensions exactly (100% natural resolution)
        const page = pdfDoc.addPage([imgWidth, imgHeight]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: imgWidth,
          height: imgHeight,
        });
      } else {
        // MODE 2 & 3: Standard A4 or US Letter page with proportional scaling and centering
        const isLandscape = imgWidth > imgHeight;
        let baseWidth = 595.28; // A4 portrait width
        let baseHeight = 841.89; // A4 portrait height

        if (pageSizeMode === "letter") {
          baseWidth = 612.0; // Letter portrait width
          baseHeight = 792.0; // Letter portrait height
        }

        const pageWidth = isLandscape ? baseHeight : baseWidth;
        const pageHeight = isLandscape ? baseWidth : baseHeight;

        const availableWidth = Math.max(1, pageWidth - marginPt * 2);
        const availableHeight = Math.max(1, pageHeight - marginPt * 2);

        // Proportional scale factor
        const scale = Math.min(
          availableWidth / imgWidth,
          availableHeight / imgHeight
        );

        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;

        // Centered coordinates
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }
    }

    // Set PDF document metadata
    const firstBaseName = allFiles[0].name.replace(/\.[^/.]+$/, "");
    const safeBaseName = firstBaseName.replace(/[^a-zA-Z0-9_-]/g, "_") || "filenova";
    const outputFilename =
      allFiles.length === 1
        ? `${safeBaseName}-to-pdf.pdf`
        : `${safeBaseName}-and-${allFiles.length - 1}-more-to-pdf.pdf`;

    pdfDoc.setTitle(outputFilename);
    pdfDoc.setCreator("FileNova JPG to PDF Tool");
    pdfDoc.setProducer("FileNova");
    pdfDoc.setCreationDate(new Date());

    const resultPdfBytes = await pdfDoc.save({ useObjectStreams: true });

    return new NextResponse(Buffer.from(resultPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "Content-Length": resultPdfBytes.byteLength.toString(),
        "X-Total-Pages": allFiles.length.toString(),
        "X-Page-Size-Mode": pageSizeMode,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An unexpected error occurred while converting images to PDF: ${message}` },
      { status: 500 }
    );
  }
}
