# PDF to JPG (developer notes)

## Rendering stack

FileNova renders PDF pages with **pdfjs-dist** (Mozilla PDF.js) in a Node.js route handler.

PDF.js Node rendering uses **@napi-rs/canvas** (Skia), not the browser Canvas API. This is why `@napi-rs/canvas` is a direct dependency even though `pdfjs-dist` lists it as optional.

JPEG bytes are encoded from the rendered canvas (`image/jpeg`). Uploads stay in memory and are not written to disk.

Quality presets change both raster scale and JPEG quality:

| Option    | Scale | JPEG quality |
|-----------|-------|--------------|
| standard  | 1.5×  | 72           |
| high      | 2×    | 88           |
| maximum   | 3×    | 95           |

The longest canvas edge is capped at 4500 px to limit memory.

## Why this library

- Already present in the project (`pdfjs-dist`, `jszip`).
- `@napi-rs/canvas` ships prebuilt binaries for Windows, macOS, and Linux (including musl), so it does not require Cairo / node-gyp on a typical Windows machine.
- `pdf-lib` cannot rasterize pages; it only manipulates PDF structure.

The separate `canvas` (node-canvas) package is **not** used by this route. PDF.js’s Node canvas factory requires `@napi-rs/canvas`.

## Deployment notes (Vercel / Node)

- Route: `POST /api/pdf/to-jpg` (`runtime = "nodejs"`).
- `pdfjs-dist` and `@napi-rs/canvas` are listed in `serverExternalPackages` so Next.js does not bundle native/ESM internals incorrectly.
- `@napi-rs/canvas` needs a matching native binary for the deploy OS/arch. Vercel Linux x64 GNU/musl is supported by upstream prebuilds.
- pdfjs-dist 6 expects a recent Node (22.13+ / 24+). Match that in local and production runtimes.
- Large or dense PDFs can exceed serverless memory or `maxDuration` (60s). Keep the 25 MB upload cap in mind.
- Encrypted/password PDFs are rejected; there is no password field.
- Complex PDFs (rare fonts, optional content, some XFA) may render incompletely even when conversion succeeds.

## Local install

A clean `npm install` is enough. No extra system packages are required on Windows when `@napi-rs/canvas` prebuilds are available.
