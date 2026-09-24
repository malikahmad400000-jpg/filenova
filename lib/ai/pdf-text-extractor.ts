export interface ExtractedPage {
  pageNumber: number;
  text: string;
  wordCount: number;
}

export interface ExtractedDocument {
  pages: ExtractedPage[];
  totalPages: number;
  totalWords: number;
  isScanned: boolean;
}

/**
 * Validates that the buffer starts with the PDF magic signature %PDF-
 */
export function hasPdfMagicBytes(buffer: Uint8Array): boolean {
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
 * Extracts searchable text page-by-page from a PDF buffer while preserving reading order and page numbers.
 */
export async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<ExtractedDocument> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  let pdfDoc;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBytes.slice(0)),
      disableFontFace: true,
      verbosity: 0,
    });
    pdfDoc = await loadingTask.promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parsing error";
    throw new Error(`Could not parse PDF document: ${msg}`);
  }

  const totalPages = pdfDoc.numPages;
  if (totalPages === 0) {
    throw new Error("The PDF document contains no readable pages.");
  }

  const pages: ExtractedPage[] = [];
  let totalWords = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items by vertical coordinate (Y) to maintain reading order
    const lineMap = new Map<number, { text: string; x: number }[]>();

    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;
      const textStr = item.str.trim();
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);

      // Match line within 4pt tolerance
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
      lineMap.get(targetY)!.push({ text: textStr, x });
    }

    // Sort lines descending by Y (top to bottom)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const pageLines: string[] = [];

    for (const y of sortedYs) {
      const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      const lineText = lineItems.map((i) => i.text).join(" ");
      if (lineText.trim()) {
        pageLines.push(lineText.trim());
      }
    }

    const fullPageText = pageLines.join("\n");
    const pageWords = fullPageText.split(/\s+/).filter(Boolean).length;
    totalWords += pageWords;

    pages.push({
      pageNumber: pageNum,
      text: fullPageText,
      wordCount: pageWords,
    });
  }

  const isScanned = totalWords < 5;

  return {
    pages,
    totalPages,
    totalWords,
    isScanned,
  };
}
