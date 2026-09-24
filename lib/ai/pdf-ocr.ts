import { createCanvas } from "@napi-rs/canvas";
import {
  type OcrMode,
  type OcrPageResult,
  type OcrResult,
  preprocessImageForOcr,
  createOcrWorker,
} from "./ocr";

export const MAX_OCR_PAGES = 10;

const OCR_SCALE_CONFIG: Record<OcrMode, number> = {
  fast: 1.5,
  balanced: 2.0,
  accurate: 2.5,
};

/**
 * Renders each page of a PDF document onto a canvas, preprocesses it, and runs OCR sequentially.
 */
export async function ocrPdfDocument(
  pdfBytes: Uint8Array,
  mode: OcrMode = "balanced",
  lang = "eng",
  maxPages = MAX_OCR_PAGES
): Promise<OcrResult> {
  // Dynamically import pdfjs-dist legacy build
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

  const numPages = pdfDoc.numPages;
  if (numPages === 0) {
    throw new Error("The PDF document contains no readable pages.");
  }

  if (numPages > maxPages) {
    throw new Error(
      `This document has too many pages for OCR. Maximum limit is ${maxPages} pages (received ${numPages}).`
    );
  }

  const scale = OCR_SCALE_CONFIG[mode] || OCR_SCALE_CONFIG.balanced;
  const pages: OcrPageResult[] = [];

  // Create a single worker for all pages in this document to maximize performance
  const worker = await createOcrWorker(lang);

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvasWidth = Math.round(viewport.width);
      const canvasHeight = Math.round(viewport.height);

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      // White background for scanned content
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      // Convert canvas to PNG buffer
      const pngBuffer = canvas.toBuffer("image/png");

      // Preprocess image with sharp
      const preprocessed = await preprocessImageForOcr(pngBuffer, mode);

      // Perform OCR
      const ret = await worker.recognize(preprocessed);
      const pageText = ret.data?.text ? ret.data.text.trim() : "";
      const rawConf = ret.data?.confidence ?? 0;
      const confidence = Math.round(rawConf * 10) / 10;

      pages.push({
        page: pageNum,
        text: pageText,
        confidence,
      });

      // Cleanup page reference
      page.cleanup();
    }
  } finally {
    await worker.terminate();
  }

  // Combined full text
  let combinedText = "";
  if (pages.length === 1) {
    combinedText = pages[0].text;
  } else {
    combinedText = pages
      .map((p) => `--- Page ${p.page} ---\n${p.text}`)
      .join("\n\n");
  }

  // Average confidence
  const totalConfidence = pages.reduce((acc, p) => acc + p.confidence, 0);
  const averageConfidence =
    pages.length > 0 ? Math.round((totalConfidence / pages.length) * 10) / 10 : 0;

  return {
    text: combinedText,
    pages,
    pageCount: pages.length,
    averageConfidence,
    mode,
    sourceType: "pdf",
  };
}
