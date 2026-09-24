import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

interface RawTextChunk {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

interface MergedCellChunk {
  text: string;
  x: number;
  width: number;
  fontSize: number;
}

interface ParsedLine {
  y: number;
  cells: MergedCellChunk[];
  fullText: string;
  maxFontSize: number;
  isTableCandidate: boolean;
}

/**
 * Validates that the buffer starts with the PDF magic signature %PDF- (0x25, 0x50, 0x44, 0x46, 0x2d)
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
 * Parses and formats cell value into number, currency, percentage, date, or string
 */
function assignCellValue(cell: ExcelJS.Cell, rawValue: string): void {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    cell.value = "";
    return;
  }

  // 1. Currency format: e.g. $1,250.00 or €99.50 or £45.00
  const currMatch = trimmed.match(/^([$€£])\s*(-?[\d,]+(?:\.\d+)?)$/);
  if (currMatch) {
    const num = Number(currMatch[2].replace(/,/g, ""));
    if (!Number.isNaN(num)) {
      cell.value = num;
      cell.numFmt = `"${currMatch[1]}"#,##0.00`;
      cell.alignment = { horizontal: "right", vertical: "middle" };
      return;
    }
  }

  // 2. Pure Numeric (integer or decimal, optional commas): e.g. 10, -5.2, 1,450.50
  if (/^-?[\d,]+(?:\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed.replace(/,/g, ""));
    if (!Number.isNaN(num)) {
      cell.value = num;
      cell.alignment = { horizontal: "right", vertical: "middle" };
      return;
    }
  }

  // 3. Percentage: e.g. 15% or 24.5%
  if (/^-?[\d,]+(?:\.\d+)?%$/.test(trimmed)) {
    const num = Number(trimmed.replace(/[%]/g, "")) / 100;
    if (!Number.isNaN(num)) {
      cell.value = num;
      cell.numFmt = "0.0%";
      cell.alignment = { horizontal: "right", vertical: "middle" };
      return;
    }
  }

  // 4. ISO Date: e.g. 2024-05-15 or 2024/05/15
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(trimmed)) {
    const normalized = trimmed.replace(/\//g, "-");
    const d = new Date(`${normalized}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      cell.value = d;
      cell.numFmt = "yyyy-mm-dd";
      cell.alignment = { horizontal: "center", vertical: "middle" };
      return;
    }
  }

  // Default: text string
  cell.value = trimmed;
  cell.alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: trimmed.length > 40,
  };
}

/**
 * Cluster horizontal X coordinates into column boundaries across table rows
 */
function alignTableRows(tableLines: ParsedLine[]): string[][] {
  const allX: number[] = [];
  for (const line of tableLines) {
    for (const cell of line.cells) {
      allX.push(cell.x);
    }
  }

  allX.sort((a, b) => a - b);

  // Group X coordinates within 25pt tolerance to find column anchors
  const anchors: { avg: number; sum: number; count: number }[] = [];
  for (const x of allX) {
    let matched = false;
    for (const anchor of anchors) {
      if (Math.abs(anchor.avg - x) <= 25) {
        anchor.count++;
        anchor.sum += x;
        anchor.avg = anchor.sum / anchor.count;
        matched = true;
        break;
      }
    }
    if (!matched) {
      anchors.push({ avg: x, sum: x, count: 1 });
    }
  }

  anchors.sort((a, b) => a.avg - b.avg);
  const numCols = Math.max(anchors.length, 1);

  // Align each row into the detected column anchors
  return tableLines.map((line) => {
    const rowValues = new Array<string>(numCols).fill("");
    let lastAssignedCol = -1;

    for (const cell of line.cells) {
      // Find closest anchor starting after the last assigned column to preserve ordering
      let bestIdx = lastAssignedCol + 1;
      let minDiff = Infinity;

      for (let i = lastAssignedCol + 1; i < anchors.length; i++) {
        const diff = Math.abs(anchors[i].avg - cell.x);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = i;
        }
      }

      if (bestIdx < numCols) {
        rowValues[bestIdx] = rowValues[bestIdx]
          ? `${rowValues[bestIdx]} ${cell.text}`
          : cell.text;
        lastAssignedCol = bestIdx;
      } else if (lastAssignedCol >= 0 && lastAssignedCol < numCols) {
        rowValues[lastAssignedCol] += ` ${cell.text}`;
      }
    }

    return rowValues;
  });
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
          error: "PDF to Excel accepts exactly one file at a time. Please select a single PDF.",
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

    // Verify PDF header magic bytes (%PDF-)
    if (!hasPdfMagicBytes(bytes)) {
      return NextResponse.json(
        {
          error: `File "${file.name}" is not a valid PDF document (header signature mismatch).`,
        },
        { status: 400 }
      );
    }

    // Dynamically import pdfjs-dist for text & layout extraction
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

    // Initialize ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FileNova PDF to Excel Tool";
    workbook.created = new Date();

    let totalExtractedWords = 0;
    let totalDetectedTables = 0;
    let totalExtractedRows = 0;
    let maxDetectedColumns = 0;

    // Process each PDF page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      const rawItems: RawTextChunk[] = [];

      for (const item of textContent.items) {
        if (!item.str || !item.str.trim()) continue;
        const textStr = item.str.trim();
        const y = Math.round(item.transform[5]);
        const x = Math.round(item.transform[4]);
        const fontSize = Math.round(item.transform[0]) || 10;
        const width =
          typeof item.width === "number" && item.width > 0
            ? Math.round(item.width)
            : Math.round(textStr.length * fontSize * 0.6);
        const height =
          typeof item.height === "number" && item.height > 0
            ? Math.round(item.height)
            : fontSize;

        totalExtractedWords += textStr.split(/\s+/).filter(Boolean).length;

        rawItems.push({
          text: textStr,
          x,
          y,
          width,
          height,
          fontSize,
        });
      }

      // Group items into lines by Y coordinate (4pt tolerance)
      const lineMap = new Map<number, RawTextChunk[]>();
      for (const item of rawItems) {
        let matchedY: number | null = null;
        for (const existingY of lineMap.keys()) {
          if (Math.abs(existingY - item.y) <= 4) {
            matchedY = existingY;
            break;
          }
        }
        const targetY = matchedY !== null ? matchedY : item.y;
        if (!lineMap.has(targetY)) {
          lineMap.set(targetY, []);
        }
        lineMap.get(targetY)!.push(item);
      }

      // Sort lines descending by Y (top of page down to bottom)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      const parsedLines: ParsedLine[] = [];
      for (const y of sortedYs) {
        const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);

        // Merge adjacent items that belong to the same cell (gap < 14pt)
        const mergedCells: MergedCellChunk[] = [];
        for (const item of items) {
          if (mergedCells.length === 0) {
            mergedCells.push({
              text: item.text,
              x: item.x,
              width: item.width,
              fontSize: item.fontSize,
            });
          } else {
            const prev = mergedCells[mergedCells.length - 1];
            const gap = item.x - (prev.x + prev.width);
            if (gap < 14) {
              prev.text += ` ${item.text}`;
              prev.width = item.x + item.width - prev.x;
              prev.fontSize = Math.max(prev.fontSize, item.fontSize);
            } else {
              mergedCells.push({
                text: item.text,
                x: item.x,
                width: item.width,
                fontSize: item.fontSize,
              });
            }
          }
        }

        const fullText = mergedCells.map((c) => c.text).join(" ");
        const maxFontSize = Math.max(...mergedCells.map((c) => c.fontSize), 10);
        const isTableCandidate = mergedCells.length >= 2;

        parsedLines.push({
          y,
          cells: mergedCells,
          fullText,
          maxFontSize,
          isTableCandidate,
        });
      }

      // Worksheet for current page
      const sheetName = totalPages === 1 ? "Sheet 1" : `Page ${pageNum}`;
      const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: true }],
      });

      // Track column maximum character widths for styling
      const colWidthMap = new Map<number, number>();
      let currentRowIdx = 1;

      let lineIdx = 0;
      while (lineIdx < parsedLines.length) {
        const curLine = parsedLines[lineIdx];

        // Check for table candidate block: >= 2 consecutive lines with multi-column alignment
        if (curLine.isTableCandidate) {
          const tableBlock: ParsedLine[] = [curLine];
          let nextIdx = lineIdx + 1;

          while (
            nextIdx < parsedLines.length &&
            parsedLines[nextIdx].isTableCandidate &&
            Math.abs(parsedLines[nextIdx - 1].y - parsedLines[nextIdx].y) <= 30
          ) {
            tableBlock.push(parsedLines[nextIdx]);
            nextIdx++;
          }

          // If at least 2 consecutive multi-column lines -> output structured table
          if (tableBlock.length >= 2) {
            totalDetectedTables++;
            const alignedRows = alignTableRows(tableBlock);
            const numCols = alignedRows[0]?.length || 0;
            if (numCols > maxDetectedColumns) {
              maxDetectedColumns = numCols;
            }

            // Insert 1 empty spacing row before table if not at top
            if (currentRowIdx > 1) {
              currentRowIdx++;
            }

            for (let r = 0; r < alignedRows.length; r++) {
              const rowValues = alignedRows[r];
              const isHeader = r === 0;
              const row = worksheet.getRow(currentRowIdx);

              for (let c = 0; c < rowValues.length; c++) {
                const cellVal = rowValues[c] || "";
                const cell = row.getCell(c + 1);
                assignCellValue(cell, cellVal);

                // Update column width tracking
                const len = String(cell.value || "").length;
                const prevMax = colWidthMap.get(c + 1) || 10;
                if (len > prevMax) {
                  colWidthMap.set(c + 1, len);
                }

                // Table border styling
                cell.border = {
                  top: { style: "thin", color: { argb: "FFE2DDD4" } },
                  bottom: { style: "thin", color: { argb: "FFE2DDD4" } },
                  left: { style: "thin", color: { argb: "FFE2DDD4" } },
                  right: { style: "thin", color: { argb: "FFE2DDD4" } },
                };

                // Header row styling
                if (isHeader) {
                  cell.font = {
                    bold: true,
                    color: { argb: "FF1F2937" },
                    size: 11,
                  };
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF3F0E8" }, // FileNova warm light header
                  };
                }
              }

              totalExtractedRows++;
              currentRowIdx++;
            }

            // Leave spacing row after table
            currentRowIdx++;
            lineIdx = nextIdx;
            continue;
          }
        }

        // Non-table Line (Paragraph or Heading): place in Column A
        const row = worksheet.getRow(currentRowIdx);
        const cell = row.getCell(1);
        cell.value = curLine.fullText;

        if (curLine.maxFontSize >= 18) {
          cell.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
        } else if (curLine.maxFontSize >= 14) {
          cell.font = { bold: true, size: 12, color: { argb: "FF1E293B" } };
        } else {
          cell.font = { size: 10, color: { argb: "FF334155" } };
        }

        const len = curLine.fullText.length;
        const prevMax = colWidthMap.get(1) || 10;
        if (len > prevMax) {
          colWidthMap.set(1, Math.min(len, 60));
        }

        currentRowIdx++;
        lineIdx++;
      }

      // Apply calculated column widths with clean padding
      for (const [colIndex, maxLen] of colWidthMap.entries()) {
        const calculatedWidth = Math.min(Math.max(maxLen + 4, 12), 50);
        worksheet.getColumn(colIndex).width = calculatedWidth;
      }
    }

    // Check if document has virtually no text (Scanned / Image-only PDF)
    const isScanned = totalExtractedWords < 5;

    if (isScanned) {
      // Prepend or add a prominent scanned PDF warning sheet / banner
      const noticeSheet =
        workbook.worksheets.length > 0
          ? workbook.worksheets[0]
          : workbook.addWorksheet("Scanned Notice");

      noticeSheet.spliceRows(1, 0, [
        "⚠️ Notice: This PDF appears to be scanned or image-based. Searchable text and tables could not be extracted directly. Smart OCR is required to extract editable tables.",
      ]);

      const bannerRow = noticeSheet.getRow(1);
      const bannerCell = bannerRow.getCell(1);
      bannerCell.font = {
        italic: true,
        bold: true,
        size: 11,
        color: { argb: "FFB45309" }, // amber
      };
      bannerCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" }, // light amber
      };
      noticeSheet.getColumn(1).width = 75;
    }

    // Ensure at least one worksheet exists
    if (workbook.worksheets.length === 0) {
      const defaultSheet = workbook.addWorksheet("Sheet 1");
      defaultSheet.addRow(["Converted PDF Document (Empty content)"]);
    }

    // Write Excel workbook to binary buffer
    const xlsxBuffer = await workbook.xlsx.writeBuffer();

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_") || "filenova";
    const outputFilename = `${safeBaseName}.xlsx`;

    return new NextResponse(xlsxBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "Content-Length": xlsxBuffer.byteLength.toString(),
        "X-Total-Pages": totalPages.toString(),
        "X-Extracted-Tables": totalDetectedTables.toString(),
        "X-Extracted-Rows": totalExtractedRows.toString(),
        "X-Extracted-Columns": maxDetectedColumns.toString(),
        "X-Scanned-Pdf": isScanned ? "true" : "false",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An unexpected error occurred while converting PDF to Excel: ${message}` },
      { status: 500 }
    );
  }
}
