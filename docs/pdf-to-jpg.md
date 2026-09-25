# PDF to JPG (developer notes)

## Rendering stack

FileNova renders PDF pages with **pdfjs-dist** (Mozilla PDF.js) in a Node.js route handler.

PDF.js Node rendering uses **@napi-rs/canvas** (Skia), not the browser Canvas API. This is why `@napi-rs/canvas` is a direct dependency even though `pdfjs-dist` lists it as optional.

JPEG bytes are encoded from the rendered canvas (`image/jpeg`). Uploads stay in memory and are not written to disk.

Quality presets change both raster scale and JPEG quality:

| Option    | Scale | JPEG quality |
|-----------|-------|--------------|
| standard  | 1.5×  | 80           |
| high      | 2×    | 90           |
| maximum   | 3×    | 95           |

The longest canvas edge is capped at 4500 px (`MAX_CANVAS_EDGE_PX` in `lib/pdf-render.ts`) to limit memory.

## Why this library

- Already present in the project (`pdfjs-dist`, `jszip`).
- `@napi-rs/canvas` ships prebuilt binaries for Windows, macOS, and Linux (including musl), so it does not require Cairo / node-gyp on a typical Windows machine.
- `pdf-lib` cannot rasterize pages; it only manipulates PDF structure.

The separate `canvas` (node-canvas) package is **not** used by this route. PDF.js’s Node canvas factory requires `@napi-rs/canvas`.

## Single native binding (important)

`pdfjs-dist` declares `@napi-rs/canvas` as an *optional* dependency pinned to `^0.1.65`. If the
application uses a newer major (e.g. `1.x`), npm installs a **second, nested copy** under
`node_modules/pdfjs-dist/node_modules/@napi-rs/canvas`. Mixing objects from two native Skia
bindings in one process either throws `Value is none of these types 'String', 'Path'
(InvalidArg)` (vector text, `disableFontFace`) or **segfaults the process** (raster images,
patterns), killing the server so the browser reports `ERR_CONNECTION_REFUSED`.

Two layers keep the binding single:

1. `package.json` has an npm `overrides` entry pinning `@napi-rs/canvas` to the root version so
   the nested duplicate is never installed.
2. `lib/pdf-render.ts` installs the `Path2D` / `DOMMatrix` / `ImageData` globals and injects a
   `PdfJsCanvasFactory` so PDF.js uses the *application's* binding even if a duplicate copy is
   ever reintroduced.

All PDF rasterization (to-jpg and OCR) goes through `lib/pdf-render.ts` (`loadPdfForRendering`,
`renderPageToJpeg`) so this invariant holds everywhere.

## Standard fonts

`disableFontFace: true` is used so glyphs are painted as vector paths. PDF.js therefore reads the
standard-font outlines and CMaps bundled with the package; `lib/pdf-render.ts` points it at
`node_modules/pdfjs-dist/standard_fonts/` and `node_modules/pdfjs-dist/cmaps/` so text renders
even on fontless container images.

## Deployment notes (Vercel / Node)

- Route: `POST /api/pdf/to-jpg` (`runtime = "nodejs"`).
- `pdfjs-dist` and `@napi-rs/canvas` are listed in `serverExternalPackages` so Next.js does not bundle native/ESM internals incorrectly.
- `@napi-rs/canvas` needs a matching native binary for the deploy OS/arch. Vercel Linux x64 GNU/musl is supported by upstream prebuilds.
- pdfjs-dist expects a recent Node (22.x). Match that in local and production runtimes.
- Large or dense PDFs can exceed serverless memory or `maxDuration` (60s). Keep the 50 MB upload cap in mind.
- Encrypted/password PDFs are rejected; there is no password field.
- Complex PDFs (rare fonts, optional content, some XFA) may render incompletely even when conversion succeeds.

## Local install

A clean `npm install` is enough. No extra system packages are required on Windows when `@napi-rs/canvas` prebuilds are available.

## Tests

Automated coverage lives in `scratch/test-pdf-to-jpg.js` (also wired into `scratch/run_all_tests.js`).
Start the dev server first (`npm run dev`), then:

```
node scratch/test-pdf-to-jpg.js
```

It verifies single-page JPG output, multi-page ZIP output, the image-bearing PDF case that used to
crash the server, quality presets, error handling, and that the server survives the suite.
