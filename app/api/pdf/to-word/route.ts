import { NextResponse, type NextRequest } from "next/server";
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  Packer,
  WidthType,
  BorderStyle,
  ImageRun,
} from "docx";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

interface TextChunk {
  text: string;
  x: number;
  fontSize: number;
  fontName: string;
}

interface TextLine {
  y: number;
  items: TextChunk[];
  fullText: string;
  maxFontSize: number;
  isTableCandidate: boolean;
}

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

/**
 * Extracts embedded JPEG images from PDF indirect objects
 */
async function extractEmbeddedImages(pdfBytes: Uint8Array): Promise<Buffer[]> {
  const images: Buffer[] = [];
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const context = pdfDoc.context;

    for (const [, obj] of context.enumerateIndirectObjects()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawObj = obj as any;
      if (rawObj && rawObj.dict && rawObj.contents) {
        const dictMap = rawObj.dict.dict || rawObj.dict;
        let isImage = false;
        let isJpeg = false;

        if (typeof dictMap.entries === "function") {
          for (const [key, val] of dictMap.entries()) {
            const kStr = key?.toString?.() || "";
            const vStr = val?.toString?.() || "";
            if (kStr === "/Subtype" && vStr === "/Image") isImage = true;
            if (kStr === "/Filter" && vStr.includes("DCTDecode")) isJpeg = true;
          }
        }

        if (isImage && isJpeg && rawObj.contents.length > 50) {
          images.push(Buffer.from(rawObj.contents));
        }
      }
    }
  } catch {
    // Gracefully continue if image extraction encounters unusual stream formats
  }
  return images;
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
          error: "PDF to Word only accepts exactly one file at a time. Please select a single PDF.",
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

    // Extract embedded images from a pristine buffer copy
    const embeddedImages = await extractEmbeddedImages(new Uint8Array(arrayBuffer.slice(0)));

    // Dynamically import pdfjs-dist for text extraction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

    let pdfDoc;
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer.slice(0)),
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

    // Analyze text and structure across pages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docxChildren: any[] = [];
    let totalExtractedWords = 0;
    let totalExtractedParagraphs = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Page break between pages (except before page 1)
      if (pageNum > 1) {
        docxChildren.push(
          new Paragraph({
            pageBreakBefore: true,
            children: [new TextRun({ text: "" })],
          })
        );
      }

      // Group text items by vertical coordinate (Y)
      const lineMap = new Map<number, TextChunk[]>();

      for (const item of textContent.items) {
        if (!item.str || !item.str.trim()) continue;
        const textStr = item.str.trim();
        const y = Math.round(item.transform[5]);
        const x = Math.round(item.transform[4]);
        const fontSize = Math.round(item.transform[0]);
        const fontName = item.fontName || "";

        totalExtractedWords += textStr.split(/\s+/).filter(Boolean).length;

        // Find matching line within 4pt tolerance
        let matchedY: number | null = null;
        for (const existingY of lineMap.keys()) {
          if (Math.abs(existingY - y) <= 4) {
            matchedY = existingY;
            break;
          }
        }

        const targetY = matchedY !== null ? matchedY : y;
        if (!lineMap.has(targetY)) {
          lineMap.set(targetY, []);
        }
        lineMap.get(targetY)!.push({
          text: textStr,
          x,
          fontSize,
          fontName,
        });
      }

      // Sort lines descending by Y (top of page to bottom)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      const pageLines: TextLine[] = [];
      for (const y of sortedYs) {
        const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
        const fullText = items.map((i) => i.text).join(" ");
        const maxFontSize = Math.max(...items.map((i) => i.fontSize));

        // Check if line has multiple distinct column gaps (>= 2 items with gap >= 35pt)
        let isTableCandidate = false;
        if (items.length >= 2) {
          let hasColumnGap = false;
          for (let k = 0; k < items.length - 1; k++) {
            if (items[k + 1].x - items[k].x >= 35) {
              hasColumnGap = true;
              break;
            }
          }
          if (hasColumnGap) isTableCandidate = true;
        }

        pageLines.push({
          y,
          items,
          fullText,
          maxFontSize,
          isTableCandidate,
        });
      }

      // Process lines into paragraphs or tables
      let lineIndex = 0;
      while (lineIndex < pageLines.length) {
        const currentLine = pageLines[lineIndex];

        // 1. Table Detection: check if consecutive lines are table candidates
        if (currentLine.isTableCandidate && currentLine.items.length >= 2) {
          const tableRows: TextLine[] = [currentLine];
          let nextIdx = lineIndex + 1;

          while (
            nextIdx < pageLines.length &&
            pageLines[nextIdx].isTableCandidate &&
            Math.abs(pageLines[nextIdx - 1].y - pageLines[nextIdx].y) <= 30
          ) {
            tableRows.push(pageLines[nextIdx]);
            nextIdx++;
          }

          // If at least 2 consecutive multi-column lines found -> render as Word Table
          if (tableRows.length >= 2) {
            const maxCols = Math.max(...tableRows.map((r) => r.items.length));
            const docxRows: TableRow[] = [];

            for (let rIdx = 0; rIdx < tableRows.length; rIdx++) {
              const rowLine = tableRows[rIdx];
              const cells: TableCell[] = [];

              for (let cIdx = 0; cIdx < maxCols; cIdx++) {
                const cellItem = rowLine.items[cIdx];
                const cellText = cellItem ? cellItem.text : "";
                const isHeaderRow = rIdx === 0;

                cells.push(
                  new TableCell({
                    width: {
                      size: Math.floor(100 / maxCols),
                      type: WidthType.PERCENTAGE,
                    },
                    shading: isHeaderRow
                      ? { fill: "F3F0E8" } // FileNova warm light header
                      : undefined,
                    margins: {
                      top: 100,
                      bottom: 100,
                      left: 120,
                      right: 120,
                    },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: "E2DDD4" },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2DDD4" },
                      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cellText,
                            bold: isHeaderRow,
                            size: 20, // 10pt
                          }),
                        ],
                      }),
                    ],
                  })
                );
              }

              docxRows.push(new TableRow({ children: cells }));
            }

            docxChildren.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: docxRows,
              })
            );

            // Spacing after table
            docxChildren.push(
              new Paragraph({
                spacing: { before: 100, after: 100 },
                children: [new TextRun({ text: "" })],
              })
            );

            totalExtractedParagraphs += tableRows.length;
            lineIndex = nextIdx;
            continue;
          }
        }

        // 2. Heading & Paragraph Processing
        const text = currentLine.fullText;
        const fontSize = currentLine.maxFontSize;

        if (fontSize >= 20) {
          // Major Title / Heading 1
          docxChildren.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            })
          );
        } else if (fontSize >= 15) {
          // Section Heading 2
          docxChildren.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            })
          );
        } else if (fontSize >= 13) {
          // Subsection Heading 3
          docxChildren.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 160, after: 80 },
            })
          );
        } else {
          // Standard Paragraph
          docxChildren.push(
            new Paragraph({
              text,
              spacing: { after: 120, line: 276 }, // 1.15 line spacing
            })
          );
        }

        totalExtractedParagraphs++;
        lineIndex++;
      }
    }

    // Check if the PDF has virtually zero text (Scanned / Image-only PDF)
    const isScanned = totalExtractedWords < 5;

    if (isScanned) {
      docxChildren.unshift(
        new Paragraph({
          children: [
            new TextRun({
              text: "⚠️ [Notice: This document appears to be a scanned PDF or contains image-only pages. Full searchable text extraction requires OCR.]",
              italics: true,
              color: "888888",
              size: 20,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Embed any extracted JPEG images into the document
    if (embeddedImages.length > 0) {
      for (const imgBytes of embeddedImages) {
        try {
          docxChildren.push(
            new Paragraph({
              spacing: { before: 150, after: 150 },
              children: [
                new ImageRun({
                  data: Buffer.from(imgBytes),
                  transformation: { width: 400, height: 300 },
                  type: "jpg",
                }),
              ],
            })
          );
        } catch {
          // Gracefully skip image if dimensions/format cannot be parsed by docx
        }
      }
    }

    // If document ended up completely empty, add a default placeholder
    if (docxChildren.length === 0) {
      docxChildren.push(
        new Paragraph({
          text: "Converted PDF Document (Empty content)",
        })
      );
    }

    // Generate Word Document (.docx)
    const wordDoc = new Document({
      title: file.name.replace(/\.[^/.]+$/, ""),
      creator: "FileNova PDF to Word Tool",
      description: "Converted from PDF using FileNova",
      sections: [
        {
          properties: {},
          children: docxChildren,
        },
      ],
    });

    const docxBuffer = await Packer.toBuffer(wordDoc);

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_") || "filenova";
    const outputFilename = `${safeBaseName}.docx`;

    return new NextResponse(docxBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "Content-Length": docxBuffer.byteLength.toString(),
        "X-Total-Pages": totalPages.toString(),
        "X-Extracted-Words": totalExtractedWords.toString(),
        "X-Extracted-Paragraphs": totalExtractedParagraphs.toString(),
        "X-Scanned-Pdf": isScanned ? "true" : "false",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An unexpected error occurred while converting PDF to Word: ${message}` },
      { status: 500 }
    );
  }
}
