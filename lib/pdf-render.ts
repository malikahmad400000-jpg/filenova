import "@/lib/polyfill";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  createCanvas,
  DOMMatrix,
  ImageData,
  Path2D,
  type Canvas,
  type SKRSContext2D,
} from "@napi-rs/canvas";

/**
 * Shared PDF.js <-> canvas bridge for Node.js route handlers.
 *
 * ## Why this module exists
 *
 * `pdfjs-dist` lists `@napi-rs/canvas` as an *optional* dependency pinned to `^0.1.65`.
 * When the application depends on a newer major (`@napi-rs/canvas@1.x`), npm cannot
 * satisfy both ranges with one package, so it installs a **second, nested copy**
 * (`node_modules/pdfjs-dist/node_modules/@napi-rs/canvas`).
 *
 * That is fatal: two copies means two independent native Skia bindings in the same
 * process. On import, PDF.js installs `Path2D` / `DOMMatrix` / `ImageData` globals and
 * builds its internal "scratch" canvases (tiling patterns, shadings, image masks,
 * soft masks, Type3 fonts) from **its** copy, while the route hands PDF.js a context
 * created by the **application's** copy. Passing an object from one binding into the
 * other either throws `Value is none of these types 'String', 'Path' (InvalidArg)`
 * or segfaults the whole Node process, which takes the dev/production server down
 * (the browser then reports `ERR_CONNECTION_REFUSED`).
 *
 * The helpers below guarantee a single binding is used end-to-end:
 *
 * 1. `ensurePdfJsCanvasGlobals()` installs the globals from *our* copy **before**
 *    `pdfjs-dist` is imported (PDF.js only assigns them when they are missing).
 * 2. `PdfJsCanvasFactory` replaces PDF.js' internal `NodeCanvasFactory` so every
 *    scratch canvas is created by *our* copy too.
 *
 * `package.json` additionally pins `@napi-rs/canvas` through an npm `overrides`
 * entry so the duplicate is never installed in the first place.
 */

/** Longest allowed canvas edge, in pixels, to bound peak memory per page. */
export const MAX_CANVAS_EDGE_PX = 4500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJsModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJsPage = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJsDocument = any;

interface CanvasAndContext {
  canvas: Canvas | null;
  context: SKRSContext2D | null;
}

let globalsInstalled = false;

/**
 * Installs the canvas globals PDF.js expects from the same `@napi-rs/canvas`
 * instance this application renders with. Safe to call repeatedly; it must run
 * before `pdfjs-dist` is imported.
 */
export function ensurePdfJsCanvasGlobals(): void {
  if (globalsInstalled) return;
  const globals = globalThis as unknown as {
    Path2D?: unknown;
    DOMMatrix?: unknown;
    ImageData?: unknown;
  };
  globals.Path2D = Path2D;
  globals.DOMMatrix = DOMMatrix;
  globals.ImageData = ImageData;
  globalsInstalled = true;
}

/**
 * Drop-in replacement for PDF.js' `NodeCanvasFactory`.
 *
 * PDF.js instantiates it with `{ ownerDocument, enableHWA }`; both are irrelevant in
 * Node.js but accepted for signature compatibility.
 */
export class PdfJsCanvasFactory {
  // PDF.js constructs the factory as `new CanvasFactory({ ownerDocument, enableHWA })`;
  // neither option is relevant in Node.js, so the argument is intentionally ignored.
  constructor() {}

  create(width: number, height: number): CanvasAndContext {
    if (width <= 0 || height <= 0) {
      throw new Error("Invalid canvas size");
    }
    const canvas = createCanvas(Math.floor(width), Math.floor(height));
    return { canvas, context: canvas.getContext("2d") };
  }

  reset(canvasAndContext: CanvasAndContext, width: number, height: number): void {
    if (!canvasAndContext.canvas) {
      throw new Error("Canvas is not specified");
    }
    if (width <= 0 || height <= 0) {
      throw new Error("Invalid canvas size");
    }
    canvasAndContext.canvas.width = Math.floor(width);
    canvasAndContext.canvas.height = Math.floor(height);
  }

  destroy(canvasAndContext: CanvasAndContext): void {
    if (!canvasAndContext.canvas) {
      throw new Error("Canvas is not specified");
    }
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

let cachedPdfJsDir: string | null | undefined;

function withTrailingSeparator(dir: string): string {
  return dir.endsWith(path.sep) ? dir : dir + path.sep;
}

/**
 * Locates the installed `pdfjs-dist` package so its bundled `standard_fonts/` and
 * `cmaps/` assets can be read from disk (PDF.js reads them with `fs.readFile`).
 */
function resolvePdfJsDir(): string | null {
  if (cachedPdfJsDir !== undefined) return cachedPdfJsDir;

  const candidates: string[] = [];
  try {
    const requireFromHere = createRequire(import.meta.url);
    candidates.push(path.dirname(requireFromHere.resolve("pdfjs-dist/package.json")));
  } catch {
    // Fall through to the cwd-based candidate below.
  }
  candidates.push(path.join(process.cwd(), "node_modules", "pdfjs-dist"));

  for (const candidate of candidates) {
    try {
      if (existsSync(path.join(candidate, "standard_fonts"))) {
        cachedPdfJsDir = candidate;
        return cachedPdfJsDir;
      }
    } catch {
      // Ignore unreadable candidates and try the next one.
    }
  }

  cachedPdfJsDir = null;
  return cachedPdfJsDir;
}

export type PdfLoadFailure = "password" | "invalid" | "unknown";

/** Error thrown by {@link loadPdfForRendering}, tagged so callers can pick a message. */
export class PdfLoadError extends Error {
  readonly failure: PdfLoadFailure;

  constructor(message: string, failure: PdfLoadFailure) {
    super(message);
    this.name = "PdfLoadError";
    this.failure = failure;
  }
}

function classifyLoadError(err: unknown): PdfLoadFailure {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  const errObj = err as { name?: string; code?: number };

  if (errObj?.name === "PasswordException" || errObj?.code === 1 || lower.includes("password")) {
    return "password";
  }
  if (
    errObj?.name === "InvalidPDFException" ||
    lower.includes("invalid pdf") ||
    lower.includes("corrupt") ||
    lower.includes("format error")
  ) {
    return "invalid";
  }
  return "unknown";
}

/**
 * Loads a PDF document for rasterization in Node.js.
 *
 * `disableFontFace: true` is used so glyphs are painted as vector paths from the
 * standard font data bundled with `pdfjs-dist` instead of relying on system fonts
 * (slim container images ship none).
 *
 * Note: PDF.js may transfer (detach) the underlying ArrayBuffer of `bytes`.
 */
export async function loadPdfForRendering(bytes: Uint8Array): Promise<PdfJsDocument> {
  ensurePdfJsCanvasGlobals();

  const pdfjsLib: PdfJsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfJsDir = resolvePdfJsDir();

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      // Force PDF.js to create scratch/pattern canvases with our binding.
      CanvasFactory: PdfJsCanvasFactory,
      cMapUrl: pdfJsDir ? withTrailingSeparator(path.join(pdfJsDir, "cmaps")) : undefined,
      cMapPacked: true,
      standardFontDataUrl: pdfJsDir
        ? withTrailingSeparator(path.join(pdfJsDir, "standard_fonts"))
        : undefined,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
    });
    return await loadingTask.promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new PdfLoadError(message, classifyLoadError(err));
  }
}

export interface RenderedPageJpeg {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Renders one PDF page onto a canvas and encodes it as a JPEG.
 *
 * @param scale  Raster scale (1.0 = 72 DPI base). Reduced automatically when the
 *               resulting canvas would exceed {@link MAX_CANVAS_EDGE_PX}.
 * @param quality  JPEG quality, 0-100 (the scale `@napi-rs/canvas` 1.x expects).
 */
export async function renderPageToJpeg(
  page: PdfJsPage,
  scale: number,
  quality: number
): Promise<RenderedPageJpeg> {
  const baseViewport = page.getViewport({ scale: 1 });
  const longestEdge = Math.max(baseViewport.width, baseViewport.height);
  const effectiveScale =
    longestEdge > 0 ? Math.min(scale, MAX_CANVAS_EDGE_PX / longestEdge) : scale;

  const viewport = page.getViewport({ scale: effectiveScale });
  const width = Math.max(1, Math.round(viewport.width));
  const height = Math.max(1, Math.round(viewport.height));

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Fill crisp white background (PDF pages default to transparent in canvas)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  return {
    buffer: canvas.toBuffer("image/jpeg", quality),
    width,
    height,
  };
}

/** Releases the PDF.js document, ignoring cleanup errors. */
export async function destroyPdfDocument(pdfDoc: PdfJsDocument | null): Promise<void> {
  if (pdfDoc && typeof pdfDoc.destroy === "function") {
    try {
      await pdfDoc.destroy();
    } catch {
      // Ignore cleanup errors
    }
  }
}
