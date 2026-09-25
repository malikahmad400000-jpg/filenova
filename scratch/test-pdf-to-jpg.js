/*
 * FileNova — PDF to JPG automated test suite.
 *
 * Exercises POST /api/pdf/to-jpg against a running Next.js dev server
 * (http://localhost:3000). Start it first with `npm run dev`.
 *
 * This suite specifically guards the "server dies / ERR_CONNECTION_REFUSED"
 * regression caused by a duplicated @napi-rs/canvas native binding inside
 * pdfjs-dist. Image-bearing and vector-text PDFs are the exact inputs that used
 * to crash the process.
 *
 * Run standalone:  node scratch/test-pdf-to-jpg.js
 * Run via runner:  node scratch/run_all_tests.js
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const JSZip = require('jszip');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const BASE = process.env.FILENOVA_TEST_URL || 'http://localhost:3000';
const API = `${BASE}/api/pdf/to-jpg`;

let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  PASS ✓ ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failed++;
    console.log(`  FAIL ✗ ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function postPdf(bytes, name, extra) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), name);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
  }
  return fetch(API, { method: 'POST', body: form });
}

async function inspectJpeg(buf) {
  const magic = buf.subarray(0, 3).toString('hex') === 'ffd8ff';
  const img = await loadImage(buf);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);
  let nonWhite = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) nonWhite++;
  }
  return { magic, width: img.width, height: img.height, nonWhite };
}

async function makeTextPdf(pages) {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`FileNova Test Page ${i}`, { x: 60, y: 780, size: 28, font: bold, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(`Sample body text to exercise the PDF.js rasterizer. Line ${i}.`, { x: 60, y: 740, size: 12, font: reg });
    page.drawRectangle({ x: 60, y: 500, width: 200, height: 150, borderColor: rgb(0.8, 0.2, 0.1), borderWidth: 3 });
    page.drawCircle({ x: 400, y: 600, size: 70, color: rgb(0.2, 0.4, 0.8), opacity: 0.7 });
  }
  return doc.save();
}

async function makeImagePdf(pages, withText) {
  const src = createCanvas(240, 180);
  const sctx = src.getContext('2d');
  const grad = sctx.createLinearGradient(0, 0, 240, 180);
  grad.addColorStop(0, '#1d4ed8');
  grad.addColorStop(1, '#f59e0b');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 240, 180);
  const jpg = sctx.toBuffer ? sctx.toBuffer('image/jpeg', 90) : src.toBuffer('image/jpeg', 90);

  const doc = await PDFDocument.create();
  const img = await doc.embedJpg(jpg);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595.28, 841.89]);
    if (withText) {
      page.drawText(`Merged page ${i}`, { x: 60, y: 780, size: 22, font, color: rgb(0, 0, 0) });
    }
    page.drawImage(img, { x: 100, y: 400, width: 360, height: 270 });
  }
  return doc.save();
}

async function run() {
  console.log('=== PDF TO JPG TEST SUITE ===\n');

  const singleText = await makeTextPdf(1);
  const multiText = await makeTextPdf(3);
  const imageOnly = await makeImagePdf(2, false);
  const textAndImage = await makeImagePdf(2, true);

  // --- Test 1: single-page -> direct JPG ---
  console.log('--- Test 1: single-page PDF returns a single JPG ---');
  const r1 = await postPdf(singleText, 'single.pdf');
  check('status 200', r1.status === 200, `got ${r1.status}`);
  check('content-type image/jpeg', (r1.headers.get('content-type') || '').includes('image/jpeg'));
  check('X-Total-Pages = 1', r1.headers.get('X-Total-Pages') === '1');
  const j1 = Buffer.from(await r1.arrayBuffer());
  const i1 = await inspectJpeg(j1);
  check('valid JPEG magic', i1.magic);
  check('JPEG has rendered content (not blank)', i1.nonWhite > 2000, `nonWhite=${i1.nonWhite}`);
  check('width reflects high (2x) scale', i1.width >= 1100 && i1.width <= 1300, `w=${i1.width}`);

  // --- Test 2: multi-page -> ZIP of JPGs ---
  console.log('\n--- Test 2: multi-page PDF returns a ZIP ---');
  const r2 = await postPdf(multiText, 'multi.pdf');
  check('status 200', r2.status === 200, `got ${r2.status}`);
  check('content-type application/zip', (r2.headers.get('content-type') || '').includes('application/zip'));
  check('X-Total-Pages = 3', r2.headers.get('X-Total-Pages') === '3');
  const zip2 = await JSZip.loadAsync(Buffer.from(await r2.arrayBuffer()));
  const names2 = Object.keys(zip2.files).sort();
  check('ZIP has 3 page entries', names2.length === 3, names2.join(','));
  const firstJpg = await zip2.file(names2[0]).async('nodebuffer');
  const i2 = await inspectJpeg(firstJpg);
  check('ZIP entry is a valid JPEG', i2.magic);
  check('ZIP entry has rendered text', i2.nonWhite > 2000, `nonWhite=${i2.nonWhite}`);

  // --- Test 3: image-only PDF (the crash case) ---
  console.log('\n--- Test 3: image-only PDF does not crash the server ---');
  const r3 = await postPdf(imageOnly, 'image-only.pdf');
  check('status 200 (no crash)', r3.status === 200, `got ${r3.status}`);
  const zip3 = await JSZip.loadAsync(Buffer.from(await r3.arrayBuffer()));
  const imgJpg = await zip3.file('filenova-page-1.jpg').async('nodebuffer');
  const i3 = await inspectJpeg(imgJpg);
  check('embedded image rasterized (large area)', i3.nonWhite > 50000, `nonWhite=${i3.nonWhite}`);

  // --- Test 4: merged text+image PDF ---
  console.log('\n--- Test 4: merged text + image PDF ---');
  const r4 = await postPdf(textAndImage, 'merged.pdf');
  check('status 200', r4.status === 200, `got ${r4.status}`);
  const zip4 = await JSZip.loadAsync(Buffer.from(await r4.arrayBuffer()));
  check('ZIP has 2 entries', Object.keys(zip4.files).length === 2);

  // --- Test 5: quality presets change scale ---
  console.log('\n--- Test 5: quality presets (scale) ---');
  const widths = {};
  for (const q of ['standard', 'high', 'maximum']) {
    const r = await postPdf(singleText, 'q.pdf', { quality: q });
    widths[q] = parseInt(r.headers.get('X-Image-Width') || '0', 10);
    check(`${q} returns 200`, r.status === 200);
    // drain body
    await r.arrayBuffer();
  }
  check('standard < high < maximum width', widths.standard < widths.high && widths.high < widths.maximum, JSON.stringify(widths));

  // --- Test 6: validation / error handling ---
  console.log('\n--- Test 6: error handling ---');
  const bad = await postPdf(Buffer.from('this is not a pdf'), 'bad.pdf');
  check('non-PDF rejected 400', bad.status === 400, `got ${bad.status}`);
  await bad.arrayBuffer();

  const twoForm = new FormData();
  twoForm.append('file', new Blob([singleText], { type: 'application/pdf' }), 'a.pdf');
  twoForm.append('file', new Blob([singleText], { type: 'application/pdf' }), 'b.pdf');
  const two = await fetch(API, { method: 'POST', body: twoForm });
  check('two files rejected 400', two.status === 400, `got ${two.status}`);
  await two.arrayBuffer();

  // --- Test 7: server survives the whole suite ---
  console.log('\n--- Test 7: server still alive after suite ---');
  const health = await fetch(`${BASE}/api/health`);
  check('health endpoint responds', health.ok, `got ${health.status}`);

  console.log(`\n=== RESULT: Passed: ${passed}, Failed: ${failed} ===`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error('Tests crashed:', err);
  process.exitCode = 1;
});
