import { createWorker } from "tesseract.js";
import sharp from "sharp";
import path from "path";

export type OcrMode = "fast" | "balanced" | "accurate";
export const VALID_OCR_MODES: OcrMode[] = ["fast", "balanced", "accurate"];

export type SupportedSourceType = "pdf" | "jpeg" | "png";

/**
 * Creates a Tesseract.js worker with an explicitly resolved workerPath.
 * This ensures compatibility with Next.js Turbopack and production builds.
 */
export async function createOcrWorker(lang = "eng") {
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "tesseract.js",
    "src",
    "worker-script",
    "node",
    "index.js"
  );

  return await createWorker(lang, 1, {
    workerPath,
  });
}

export interface OcrPageResult {
  page: number;
  text: string;
  confidence: number;
}

export interface OcrResult {
  text: string;
  pages: OcrPageResult[];
  pageCount: number;
  averageConfidence: number;
  mode: OcrMode;
  sourceType: "pdf" | "image";
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
 * Validates JPEG magic signature FF D8 FF
 */
export function hasJpegMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 3) return false;
  return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

/**
 * Validates PNG magic signature 89 50 4E 47 0D 0A 1A 0A
 */
export function hasPngMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 8) return false;
  return (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

/**
 * Detects the document type strictly from the binary magic bytes.
 */
export function detectDocumentType(buffer: Uint8Array): SupportedSourceType | null {
  if (hasPdfMagicBytes(buffer)) return "pdf";
  if (hasJpegMagicBytes(buffer)) return "jpeg";
  if (hasPngMagicBytes(buffer)) return "png";
  return null;
}

/**
 * Preprocesses an image buffer with sharp to optimize Tesseract OCR accuracy.
 */
export async function preprocessImageForOcr(
  imageBuffer: Buffer,
  mode: OcrMode
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer);

  const metadata = await pipeline.metadata();
  const width = metadata.width || 1000;
  const height = metadata.height || 1000;
  const maxDim = Math.max(width, height);

  if (mode === "fast") {
    // Fast mode: constrain image resolution for rapid processing
    if (maxDim > 1600) {
      pipeline = pipeline.resize({
        width: width > height ? 1600 : undefined,
        height: height >= width ? 1600 : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    // Grayscale only
    return await pipeline.grayscale().png().toBuffer();
  }

  if (mode === "balanced") {
    // Balanced mode: moderate resolution, grayscale, normalize contrast
    if (maxDim > 2400) {
      pipeline = pipeline.resize({
        width: width > height ? 2400 : undefined,
        height: height >= width ? 2400 : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    return await pipeline
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.0 })
      .png()
      .toBuffer();
  }

  // Accurate mode: high resolution, normalize contrast, sharpen
  if (maxDim > 3200) {
    pipeline = pipeline.resize({
      width: width > height ? 3200 : undefined,
      height: height >= width ? 3200 : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  return await pipeline
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.2 })
    .png()
    .toBuffer();
}

/**
 * Performs OCR on a single image buffer using Tesseract.js.
 */
export async function ocrImageBuffer(
  rawImageBuffer: Buffer,
  mode: OcrMode = "balanced",
  lang = "eng"
): Promise<{ text: string; confidence: number }> {
  // Preprocess with sharp
  const preprocessed = await preprocessImageForOcr(rawImageBuffer, mode);

  // Initialize a fresh worker for isolated OCR job
  const worker = await createOcrWorker(lang);

  try {
    const result = await worker.recognize(preprocessed);
    const text = result.data?.text ? result.data.text.trim() : "";
    const rawConf = result.data?.confidence ?? 0;
    const confidence = Math.round(rawConf * 10) / 10;

    return {
      text,
      confidence,
    };
  } finally {
    await worker.terminate();
  }
}
