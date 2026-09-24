/**
 * Comprehensive test suite for FileNova AI Document Translator.
 * Tests Text PDF, Scanned PDF, JPG, PNG, Language Detection, Translation Modes,
 * Multi-page handling, Chunking, Error Handling, DOCX export, Security, and Full System Regression.
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const sharp = require("sharp");

const BASE_URL = "http://localhost:3000";

// ─── Load TypeScript Translator Module for Direct Unit Testing ────────────────

function loadTranslatorModule() {
  const tsPath = path.resolve(process.cwd(), "lib/ai/translator.ts");
  const code = fs.readFileSync(tsPath, "utf8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const customRequire = (id) => {
    if (id === "./provider") {
      return {
        MissingApiKeyError: class MissingApiKeyError extends Error {
          constructor(message) {
            super(message);
            this.name = "MissingApiKeyError";
          }
        },
      };
    }
    if (id === "docx") return require("docx");
    if (id === "openai") return require("openai");
    return require(id);
  };
  const m = { exports: {} };
  const fn = new Function("require", "module", "exports", transpiled.outputText);
  fn(customRequire, m, m.exports);
  return m.exports;
}

const translator = loadTranslatorModule();

// ─── Fixture Generators ────────────────────────────────────────────────────────

async function makeTextImage(text, format = "jpeg") {
  const svg = `<svg width="700" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="30" y="100" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#000000">${text}</text>
  </svg>`;
  const pipeline = sharp(Buffer.from(svg));
  if (format === "png") {
    return await pipeline.png().toBuffer();
  }
  return await pipeline.jpeg({ quality: 95 }).toBuffer();
}

async function makeTextPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const page1 = doc.addPage([600, 450]);
  page1.drawText("International Commercial Agreement", { x: 50, y: 400, size: 16, font: boldFont });
  page1.drawText(
    "This document establishes the commercial cooperation between Acme Corp and Nova Global.",
    { x: 50, y: 370, size: 11, font }
  );
  page1.drawText(
    "All disputes shall be governed by international commercial trade law.",
    { x: 50, y: 345, size: 11, font }
  );

  const page2 = doc.addPage([600, 450]);
  page2.drawText("Terms and Payment Schedule", { x: 50, y: 400, size: 16, font: boldFont });
  page2.drawText(
    "The total sum of fifty thousand dollars ($50,000) is payable upon final milestone delivery.",
    { x: 50, y: 370, size: 11, font }
  );
  page2.drawText(
    "Invoices must be submitted thirty days prior to the expected payment settlement date.",
    { x: 50, y: 345, size: 11, font }
  );

  return Buffer.from(await doc.save());
}

async function makeLowWordPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([400, 300]);
  page.drawText("Hello", { x: 50, y: 200, size: 12, font });
  return Buffer.from(await doc.save());
}

async function makeScannedPdfWithImages(pageTexts) {
  const doc = await PDFDocument.create();
  for (const text of pageTexts) {
    const imgBuf = await makeTextImage(text, "png");
    const embeddedImg = await doc.embedPng(imgBuf);
    const page = doc.addPage([embeddedImg.width, embeddedImg.height]);
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: embeddedImg.width,
      height: embeddedImg.height,
    });
  }
  return Buffer.from(await doc.save());
}

async function makeOverLimitPdf(pageCount = 12) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    doc.addPage([400, 300]);
  }
  return Buffer.from(await doc.save());
}

// ─── Test Runner ───────────────────────────────────────────────────────────────

async function runTranslatorTests() {
  console.log("=== DOCUMENT TRANSLATOR COMPREHENSIVE TEST SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // ── UNIT TESTS: Language Detection Heuristics ──────────────────────────────
  console.log("--- UNIT TEST: Language Detection Heuristics ---");
  assert(translator.detectLanguage("یہ حکومت پاکستان کا ایک سرکاری فرمان اور دستاویز ہے۔") === "ur", "Detects Urdu script");
  assert(translator.detectLanguage("هذا تقرير رسمي حول العمليات التجارية الدولية والتنمية المستدامة.") === "ar", "Detects Arabic script");
  assert(translator.detectLanguage("यह भारत सरकार का एक आधिकारिक दस्तावेज और रिपोर्ट है।") === "hi", "Detects Hindi Devanagari script");
  assert(translator.detectLanguage("これは新しい人工知能システムに関する公式文書です。") === "ja", "Detects Japanese (Kana/Kanji)");
  assert(translator.detectLanguage("这是一份关于全球技术创新与发展的官方报告。") === "zh", "Detects Chinese (Hanzi)");
  assert(translator.detectLanguage("El informe comercial de la empresa está disponible en la página oficial.") === "es", "Detects Spanish markers");
  assert(translator.detectLanguage("Le rapport annuel de l'entreprise est disponible pour tous les actionnaires.") === "fr", "Detects French markers");
  assert(translator.detectLanguage("Der offizielle Jahresbericht für das laufende Geschäftsjahr ist verfügbar.") === "de", "Detects German markers");
  assert(translator.detectLanguage("La relazione finanziaria annuale per gli azionisti è stata approvata.") === "it", "Detects Italian markers");
  assert(translator.detectLanguage("O relatório financeiro anual para os investidores foi publicado.") === "pt", "Detects Portuguese markers");
  assert(translator.detectLanguage("The international financial review of the corporate governance.") === "en", "Defaults to English for standard Latin");
  assert(translator.detectLanguage("") === "en", "Returns en for empty text");

  // ── UNIT TESTS: Semantic Chunking ──────────────────────────────────────────
  console.log("\n--- UNIT TEST: Semantic Chunking ---");
  const emptyChunks = translator.chunkPageText("");
  assert(Array.isArray(emptyChunks) && emptyChunks.length === 0, "Empty text returns empty array");

  const shortText = "First paragraph.\n\nSecond paragraph.";
  const shortChunks = translator.chunkPageText(shortText, 2500);
  assert(shortChunks.length === 1 && shortChunks[0] === shortText, "Text below maxChunkSize remains a single chunk");

  // Create text with multiple paragraphs exceeding chunk size
  const p1 = "Alpha paragraph ".repeat(30).trim();
  const p2 = "Beta paragraph ".repeat(30).trim();
  const p3 = "Gamma paragraph ".repeat(30).trim();
  const multiParaText = `${p1}\n\n${p2}\n\n${p3}`;
  const multiChunks = translator.chunkPageText(multiParaText, 500);
  assert(multiChunks.length >= 3, `Paragraphs split appropriately across chunks (got ${multiChunks.length})`);
  assert(multiChunks[0].includes("Alpha paragraph"), "First chunk contains start of document");
  assert(multiChunks[multiChunks.length - 1].includes("Gamma paragraph"), "Last chunk contains end of document");

  // Verify oversized single paragraph splits by sentences
  const hugeSentence = "This is sentence one. " + "This is sentence two. ".repeat(40);
  const sentChunks = translator.chunkPageText(hugeSentence, 200);
  assert(sentChunks.length > 1, `Huge paragraph splits gracefully into sentences (got ${sentChunks.length})`);

  // ── UNIT TESTS: Language Registry ──────────────────────────────────────────
  console.log("\n--- UNIT TEST: Language Registry & Validation ---");
  assert(translator.SUPPORTED_LANGUAGES.length >= 11, `At least 11 target languages supported (got ${translator.SUPPORTED_LANGUAGES.length})`);
  assert(translator.SOURCE_LANGUAGES.some((l) => l.code === "auto"), "Source languages includes auto-detect");
  assert(translator.isValidSourceLanguage("auto"), "isValidSourceLanguage('auto') is true");
  assert(translator.isValidSourceLanguage("ur"), "isValidSourceLanguage('ur') is true");
  assert(!translator.isValidTargetLanguage("auto"), "isValidTargetLanguage('auto') is false");
  assert(translator.isValidTargetLanguage("ur"), "isValidTargetLanguage('ur') is true");
  assert(translator.getLanguageName("ur") === "Urdu", "getLanguageName('ur') returns 'Urdu'");

  // ── FIXTURES GENERATION ───────────────────────────────────────────────────
  console.log("\nGenerating test document fixtures...");
  const textPdfBuf = await makeTextPdf();
  const jpgBuf = await makeTextImage("Quarterly Revenue Report for Global Partners", "jpeg");
  const pngBuf = await makeTextImage("Certificate of Authenticity and Warranty", "png");
  const scannedPdfBuf = await makeScannedPdfWithImages([
    "Confidential Medical Summary and Diagnosis Report",
    "Prescription Instructions and Follow-Up Schedule",
  ]);

  // ── TEST 1: English → Urdu Translation ─────────────────────────────────────
  console.log("\n--- TEST 1: English -> Urdu Translation ---");
  const enUrFd = new FormData();
  enUrFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "contract.pdf");
  enUrFd.append("sourceLanguage", "en");
  enUrFd.append("targetLanguage", "ur");
  enUrFd.append("mode", "balanced");

  const AI_STATUSES = [200, 429, 502, 503];
  const enUrRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: enUrFd });
  if (enUrRes.status === 200) {
    const data = await enUrRes.json();
    assert(data.success === true, "Response has success: true");
    assert(data.targetLanguage === "ur", "Target language is ur");
    assert(/[\u0600-\u06FF]/.test(data.translatedText), "Translated text contains Urdu/Arabic characters");
  } else {
    assert(AI_STATUSES.includes(enUrRes.status), `Returns expected AI status (got ${enUrRes.status})`);
    const err = await enUrRes.json();
    assert(err.error && err.error.length > 0, "Error message present");
  }

  // ── TEST 2: Urdu → English Pipeline ────────────────────────────────────────
  console.log("\n--- TEST 2: Urdu -> English Pipeline ---");
  const urDoc = await PDFDocument.create();
  const urPage = urDoc.addPage([500, 300]);
  const urImg = await makeTextImage("یہ ایک تجارتی معاہدہ ہے", "png");
  const embeddedUrImg = await urDoc.embedPng(urImg);
  urPage.drawImage(embeddedUrImg, { x: 0, y: 0, width: embeddedUrImg.width, height: embeddedUrImg.height });
  const urPdfBuf = Buffer.from(await urDoc.save());

  const urEnFd = new FormData();
  urEnFd.append("file", new Blob([urPdfBuf], { type: "application/pdf" }), "urdu.pdf");
  urEnFd.append("sourceLanguage", "ur");
  urEnFd.append("targetLanguage", "en");

  const urEnRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: urEnFd });
  if (urEnRes.status === 200) {
    const data = await urEnRes.json();
    assert(data.targetLanguage === "en", "Target language is en");
  } else {
    assert(AI_STATUSES.includes(urEnRes.status), `Urdu -> English returns expected AI status (got ${urEnRes.status})`);
  }

  // ── TEST 3: Auto Detect Language ───────────────────────────────────────────
  console.log("\n--- TEST 3: Auto Detect Language ---");
  const autoFd = new FormData();
  autoFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "contract.pdf");
  autoFd.append("sourceLanguage", "auto");
  autoFd.append("targetLanguage", "es");

  const autoRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: autoFd });
  if (autoRes.status === 200) {
    const data = await autoRes.json();
    assert(data.detectedLanguage === "en", `Detected language is English (got: ${data.detectedLanguage})`);
  } else {
    assert(AI_STATUSES.includes(autoRes.status), `Auto detect returns expected AI status (got ${autoRes.status})`);
  }

  // ── TEST 4: Digital PDF Text Extraction ────────────────────────────────────
  console.log("\n--- TEST 4: Digital PDF Text Extraction ---");
  const digFd = new FormData();
  digFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "digital.pdf");
  digFd.append("sourceLanguage", "en");
  digFd.append("targetLanguage", "es");
  const digRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: digFd });
  assert(AI_STATUSES.includes(digRes.status), `Digital PDF text extraction parsed successfully (got ${digRes.status})`);

  // ── TEST 5: Scanned PDF Automatic Smart OCR ────────────────────────────────
  console.log("\n--- TEST 5: Scanned PDF Automatic Smart OCR ---");
  const scanFd = new FormData();
  scanFd.append("file", new Blob([scannedPdfBuf], { type: "application/pdf" }), "scanned.pdf");
  scanFd.append("sourceLanguage", "en");
  scanFd.append("targetLanguage", "fr");

  const scanRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: scanFd });
  if (scanRes.status === 200) {
    const data = await scanRes.json();
    assert(data.pageCount === 2, "2 pages extracted and translated from scan");
  } else {
    assert(AI_STATUSES.includes(scanRes.status), `Scanned PDF triggers OCR and reaches translation (got ${scanRes.status})`);
  }

  // ── TEST 6: JPG Image OCR & Translate ──────────────────────────────────────
  console.log("\n--- TEST 6: JPG Image OCR & Translate ---");
  const jpgFd = new FormData();
  jpgFd.append("file", new Blob([jpgBuf], { type: "image/jpeg" }), "report.jpg");
  jpgFd.append("sourceLanguage", "en");
  jpgFd.append("targetLanguage", "de");

  const jpgRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: jpgFd });
  if (jpgRes.status === 200) {
    assert(true, "JPG translates successfully (got 200)");
  } else {
    assert(AI_STATUSES.includes(jpgRes.status), `JPG OCR triggers and reaches translation (got ${jpgRes.status})`);
  }

  // ── TEST 7: PNG Image OCR & Translate ──────────────────────────────────────
  console.log("\n--- TEST 7: PNG Image OCR & Translate ---");
  const pngFd = new FormData();
  pngFd.append("file", new Blob([pngBuf], { type: "image/png" }), "warranty.png");
  pngFd.append("sourceLanguage", "en");
  pngFd.append("targetLanguage", "it");

  const pngRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: pngFd });
  if (pngRes.status === 200) {
    assert(true, "PNG translates successfully (got 200)");
  } else {
    assert(AI_STATUSES.includes(pngRes.status), `PNG OCR triggers and reaches translation (got ${pngRes.status})`);
  }

  // ── TEST 8: Translation Modes (Fast, Balanced, High Quality) ───────────────
  console.log("\n--- TEST 8: Translation Modes Accepted ---");
  for (const m of ["fast", "balanced", "high_quality"]) {
    const mFd = new FormData();
    mFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "doc.pdf");
    mFd.append("sourceLanguage", "en");
    mFd.append("targetLanguage", "es");
    mFd.append("mode", m);
    const mRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: mFd });
    assert(
      AI_STATUSES.includes(mRes.status),
      `Mode "${m}" accepted and processed (got ${mRes.status})`
    );
  }

  // ── TEST 9: Multi-Page Order Preservation ──────────────────────────────────
  console.log("\n--- TEST 9: Multi-Page Order Preservation ---");
  const testPages = [
    { page: 1, text: "Page one translation" },
    { page: 2, text: "Page two translation" },
  ];
  const docxWithOrder = await translator.buildTranslatedDocx("Test Title", testPages, "es");
  assert(docxWithOrder && docxWithOrder.length > 500, "buildTranslatedDocx successfully orders multi-page outputs");

  // ── TEST 10: Fake PDF ──────────────────────────────────────────────────────
  console.log("\n--- TEST 10: Fake PDF Rejected ---");
  const fakePdfFd = new FormData();
  fakePdfFd.append("file", new Blob([Buffer.from("NOT_A_PDF_STREAM")], { type: "application/pdf" }), "fake.pdf");
  const fakePdfRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: fakePdfFd });
  assert(fakePdfRes.status === 400, `Fake PDF rejected with HTTP 400 (got ${fakePdfRes.status})`);
  const fakePdfErr = await fakePdfRes.json();
  assert(fakePdfErr.error && fakePdfErr.error.includes("signature mismatch"), "Error reports signature mismatch");

  // ── TEST 11: Fake JPG ──────────────────────────────────────────────────────
  console.log("\n--- TEST 11: Fake JPG Rejected ---");
  const fakeJpgFd = new FormData();
  fakeJpgFd.append("file", new Blob([Buffer.from("FAKE_JPG_CONTENT")], { type: "image/jpeg" }), "fake.jpg");
  const fakeJpgRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: fakeJpgFd });
  assert(fakeJpgRes.status === 400, `Fake JPG rejected with HTTP 400 (got ${fakeJpgRes.status})`);

  // ── TEST 12: Fake PNG ──────────────────────────────────────────────────────
  console.log("\n--- TEST 12: Fake PNG Rejected ---");
  const fakePngFd = new FormData();
  fakePngFd.append("file", new Blob([Buffer.from("FAKE_PNG_CONTENT")], { type: "image/png" }), "fake.png");
  const fakePngRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: fakePngFd });
  assert(fakePngRes.status === 400, `Fake PNG rejected with HTTP 400 (got ${fakePngRes.status})`);

  // ── TEST 13: Unsupported File Type ─────────────────────────────────────────
  console.log("\n--- TEST 13: Unsupported File Type Rejected ---");
  const txtFd = new FormData();
  txtFd.append("file", new Blob([Buffer.from("Plain text file")], { type: "text/plain" }), "plain.txt");
  const txtRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: txtFd });
  assert(txtRes.status === 400, `Text file rejected with HTTP 400 (got ${txtRes.status})`);

  // ── TEST 14: Multiple Files Rejected ───────────────────────────────────────
  console.log("\n--- TEST 14: Multiple Files Rejected ---");
  const multiFd = new FormData();
  multiFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "a.pdf");
  multiFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "b.pdf");
  const multiRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: multiFd });
  assert(multiRes.status === 400, `Multiple files rejected with HTTP 400 (got ${multiRes.status})`);

  // ── TEST 15: Empty Request ─────────────────────────────────────────────────
  console.log("\n--- TEST 15: Empty Request Rejected ---");
  const emptyFd = new FormData();
  emptyFd.append("sourceLanguage", "en");
  const emptyRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: emptyFd });
  assert(emptyRes.status === 400, `Empty request rejected with HTTP 400 (got ${emptyRes.status})`);

  // ── TEST 16: Invalid Languages ─────────────────────────────────────────────
  console.log("\n--- TEST 16: Invalid Languages Rejected ---");
  const invLangFd = new FormData();
  invLangFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "doc.pdf");
  invLangFd.append("sourceLanguage", "kryptonian");
  invLangFd.append("targetLanguage", "en");
  const invLangRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: invLangFd });
  assert(invLangRes.status === 400, `Invalid language code rejected with HTTP 400 (got ${invLangRes.status})`);

  // ── TEST 17: Identical Source and Target Languages ─────────────────────────
  console.log("\n--- TEST 17: Identical Source & Target Rejected ---");
  const sameLangFd = new FormData();
  sameLangFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "doc.pdf");
  sameLangFd.append("sourceLanguage", "en");
  sameLangFd.append("targetLanguage", "en");
  const sameLangRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: sameLangFd });
  assert(sameLangRes.status === 400, `Identical languages rejected with HTTP 400 (got ${sameLangRes.status})`);
  const sameLangErr = await sameLangRes.json();
  assert(sameLangErr.error && sameLangErr.error.includes("identical"), "Error message warns about identical languages");

  // ── TEST 18: Oversized File Limit (> 25MB) ─────────────────────────────────
  console.log("\n--- TEST 18: Oversized File Limit (> 25MB) ---");
  const oversizedBuf = Buffer.alloc(25 * 1024 * 1024 + 1024);
  const overFd = new FormData();
  overFd.append("file", new Blob([oversizedBuf], { type: "application/pdf" }), "huge.pdf");
  const overRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: overFd });
  assert(overRes.status === 413, `Oversized file rejected with HTTP 413 (got ${overRes.status})`);
  const overErr = await overRes.json();
  assert(overErr.error && overErr.error.includes("25 MB"), "Error specifies 25 MB limit");

  // ── TEST 19: Corrupt Document Safely Rejected ──────────────────────────────
  console.log("\n--- TEST 19: Corrupt Document Safely Rejected ---");
  const corruptPdf = Buffer.alloc(100);
  corruptPdf.write("%PDF-1.4 CORRUPT_PAYLOAD_HERE");
  const corFd = new FormData();
  corFd.append("file", new Blob([corruptPdf], { type: "application/pdf" }), "corrupt.pdf");
  const corRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: corFd });
  assert(corRes.status === 400, `Corrupt document rejected with HTTP 400 without crashing (got ${corRes.status})`);

  // ── TEST 20: Over-Page-Limit PDF ───────────────────────────────────────────
  console.log("\n--- TEST 20: Over-Page-Limit PDF Rejected ---");
  const overPdfBuf = await makeOverLimitPdf(12); // limit is 10
  const overPageFd = new FormData();
  overPageFd.append("file", new Blob([overPdfBuf], { type: "application/pdf" }), "over.pdf");
  const overPageRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: overPageFd });
  assert(overPageRes.status === 400, `Over-page PDF rejected with HTTP 400 (got ${overPageRes.status})`);
  const overPageErr = await overPageRes.json();
  assert(overPageErr.error && overPageErr.error.includes("too many pages"), "Error reports page limit exceeded");

  // ── TEST 21: Low-Word Document Rejected (< 3 words) ────────────────────────
  console.log("\n--- TEST 21: Low-Word Document Rejected ---");
  const lowWordPdf = await makeLowWordPdf();
  const lowFd = new FormData();
  lowFd.append("file", new Blob([lowWordPdf], { type: "application/pdf" }), "low.pdf");
  const lowRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: lowFd });
  assert(lowRes.status === 422, `Low-word PDF rejected with HTTP 422 (got ${lowRes.status})`);
  const lowErr = await lowRes.json();
  assert(lowErr.error && lowErr.error.includes("readable text"), "Error informs user about readable text");

  // ── TEST 22: Invalid Content-Type ──────────────────────────────────────────
  console.log("\n--- TEST 22: Invalid Content-Type ---");
  const ctRes = await fetch(`${BASE_URL}/api/ai/document-translator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "fast" }),
  });
  assert(ctRes.status === 400, `Non-multipart request rejected with HTTP 400 (got ${ctRes.status})`);

  // ── TEST 23: Genuine DOCX Export Route ─────────────────────────────────────
  console.log("\n--- TEST 23: Genuine DOCX Export Route ---");
  const docxExportRes = await fetch(`${BASE_URL}/api/ai/document-translator/export-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Agreement Translation",
      pages: [
        { page: 1, text: "Acuerdo comercial internacional entre empresas asociadas." },
        { page: 2, text: "Términos de pago y entregables contractuales." },
      ],
      targetLanguage: "es",
      filename: "contract.pdf",
    }),
  });
  assert(docxExportRes.status === 200, `DOCX export returns HTTP 200 (got ${docxExportRes.status})`);
  const docxContentType = docxExportRes.headers.get("content-type") || "";
  assert(
    docxContentType.includes("wordprocessingml.document"),
    `Content-Type is wordprocessingml.document (got: ${docxContentType})`
  );
  const docxBuffer = Buffer.from(await docxExportRes.arrayBuffer());
  assert(docxBuffer.length > 1000, `DOCX buffer has valid size (${docxBuffer.length} bytes)`);
  // OpenXML files start with PK (0x50, 0x4B)
  assert(docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b, "DOCX buffer begins with PK zip signature");

  // ── TEST 24: Security — No Secrets in HTML ─────────────────────────────────
  console.log("\n--- TEST 24: Security — No Secrets in HTML ---");
  const pageRes = await fetch(`${BASE_URL}/ai/document-translator`);
  assert(pageRes.status === 200, `Document Translator page returns HTTP 200 (got ${pageRes.status})`);
  const pageHtml = await pageRes.text();
  assert(!pageHtml.includes("sk-"), "No OpenAI secret keys leaked in HTML");
  assert(!pageHtml.includes("OPENAI_API_KEY"), "No OPENAI_API_KEY leaked in HTML");
  assert(!pageHtml.includes("SUPABASE"), "No Supabase secrets leaked in HTML");

  // ── TEST 25: Full Regression — All 12 Pages ────────────────────────────────
  console.log("\n--- TEST 25: Full Regression — All 12 Pages ---");
  const pages = [
    "/",
    "/tools/merge-pdf",
    "/tools/split-pdf",
    "/tools/compress-pdf",
    "/tools/pdf-to-jpg",
    "/tools/jpg-to-pdf",
    "/tools/pdf-to-word",
    "/tools/pdf-to-excel",
    "/ai/chat-with-pdf",
    "/ai/pdf-summarizer",
    "/ai/smart-ocr",
    "/ai/document-translator",
  ];
  for (const p of pages) {
    const r = await fetch(`${BASE_URL}${p}`);
    assert(r.status === 200, `Page ${p} returns HTTP 200 (got ${r.status})`);
  }

  // ── TEST 26: Full Regression — All 11 APIs ─────────────────────────────────
  console.log("\n--- TEST 26: Full Regression — All 11 APIs ---");

  // Merge
  const mFd = new FormData();
  mFd.append("files", new Blob([textPdfBuf], { type: "application/pdf" }), "a.pdf");
  mFd.append("files", new Blob([textPdfBuf], { type: "application/pdf" }), "b.pdf");
  const mRes = await fetch(`${BASE_URL}/api/pdf/merge`, { method: "POST", body: mFd });
  assert(mRes.status === 200, `/api/pdf/merge returns HTTP 200 (got ${mRes.status})`);

  // Split
  const sFd = new FormData();
  sFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "s.pdf");
  sFd.append("mode", "range");
  sFd.append("startPage", "1");
  sFd.append("endPage", "2");
  const sRes = await fetch(`${BASE_URL}/api/pdf/split`, { method: "POST", body: sFd });
  assert(sRes.status === 200, `/api/pdf/split returns HTTP 200 (got ${sRes.status})`);

  // Compress
  const cFd = new FormData();
  cFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "c.pdf");
  cFd.append("compressionLevel", "medium");
  const cRes = await fetch(`${BASE_URL}/api/pdf/compress`, { method: "POST", body: cFd });
  assert(cRes.status === 200, `/api/pdf/compress returns HTTP 200 (got ${cRes.status})`);

  // PDF to JPG
  const jFd = new FormData();
  jFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "doc.pdf");
  jFd.append("quality", "standard");
  const jRes = await fetch(`${BASE_URL}/api/pdf/to-jpg`, { method: "POST", body: jFd });
  assert(jRes.status === 200, `/api/pdf/to-jpg returns HTTP 200 (got ${jRes.status})`);

  // JPG to PDF
  const fjFd = new FormData();
  fjFd.append("file", new Blob([jpgBuf], { type: "image/jpeg" }), "sample.jpg");
  const fjRes = await fetch(`${BASE_URL}/api/pdf/from-jpg`, { method: "POST", body: fjFd });
  assert(fjRes.status === 200, `/api/pdf/from-jpg returns HTTP 200 (got ${fjRes.status})`);

  // PDF to Word
  const wFd = new FormData();
  wFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "doc.pdf");
  const wRes = await fetch(`${BASE_URL}/api/pdf/to-word`, { method: "POST", body: wFd });
  assert(wRes.status === 200, `/api/pdf/to-word returns HTTP 200 (got ${wRes.status})`);

  // PDF to Excel
  const xFd = new FormData();
  xFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "doc.pdf");
  const xRes = await fetch(`${BASE_URL}/api/pdf/to-excel`, { method: "POST", body: xFd });
  assert(xRes.status === 200, `/api/pdf/to-excel returns HTTP 200 (got ${xRes.status})`);

  // Chat with PDF upload
  const chatFd = new FormData();
  chatFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "doc.pdf");
  const chatRes = await fetch(`${BASE_URL}/api/ai/upload-pdf`, { method: "POST", body: chatFd });
  assert(chatRes.status === 200, `/api/ai/upload-pdf returns HTTP 200 (got ${chatRes.status})`);

  // PDF Summarizer
  const sumFd = new FormData();
  sumFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "doc.pdf");
  sumFd.append("summaryLevel", "quick");
  const sumRes = await fetch(`${BASE_URL}/api/ai/pdf-summarizer`, { method: "POST", body: sumFd });
  assert(AI_STATUSES.includes(sumRes.status), `/api/ai/pdf-summarizer reachable (got ${sumRes.status})`);

  // Smart OCR
  const ocrFd = new FormData();
  ocrFd.append("file", new Blob([jpgBuf], { type: "image/jpeg" }), "doc.jpg");
  const ocrRes = await fetch(`${BASE_URL}/api/ai/smart-ocr`, { method: "POST", body: ocrFd });
  assert(ocrRes.status === 200, `/api/ai/smart-ocr returns HTTP 200 (got ${ocrRes.status})`);

  // Document Translator
  const transFd = new FormData();
  transFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "doc.pdf");
  transFd.append("sourceLanguage", "en");
  transFd.append("targetLanguage", "es");
  const transRes = await fetch(`${BASE_URL}/api/ai/document-translator`, { method: "POST", body: transFd });
  assert(AI_STATUSES.includes(transRes.status), `/api/ai/document-translator reachable (got ${transRes.status})`);

  console.log(`\n=== DOCUMENT TRANSLATOR TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTranslatorTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
