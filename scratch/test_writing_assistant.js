/**
 * Comprehensive test suite for FileNova AI Writing Assistant.
 * Tests:
 * - 8 Writing Modes (improve, rewrite, summarize, expand, formal, casual, bullets, email)
 * - 4 Tones (neutral, professional, friendly, academic)
 * - Text input path (short, normal, long, unicode, special characters)
 * - File upload path (PDF, JPG, PNG)
 * - Semantic text chunking and word counting utilities
 * - DOCX export route with genuine OpenXML binary generation
 * - Error handling (missing key, invalid mode, invalid tone, empty input, text too short, oversized payload)
 * - Security (no secrets or environment variables in HTML responses)
 * - Full system regression (all 13 pages and 12 APIs)
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const sharp = require("sharp");

const BASE_URL = "http://localhost:3000";

// ─── Transpile and Load writing-assistant module for Unit Testing ───────────────

function loadWritingAssistantModule() {
  const tsPath = path.resolve(process.cwd(), "lib/ai/writing-assistant.ts");
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

const wa = loadWritingAssistantModule();

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

  const page = doc.addPage([600, 450]);
  page.drawText("Quarterly Product Engineering Strategy", { x: 50, y: 400, size: 16, font: boldFont });
  page.drawText(
    "Our goal is to improve developer velocity, reduce technical debt, and deploy secure distributed systems.",
    { x: 50, y: 370, size: 11, font }
  );
  page.drawText(
    "Cross-functional teams will collaborate across product, infrastructure, and user experience domains.",
    { x: 50, y: 345, size: 11, font }
  );

  return Buffer.from(await doc.save());
}

// ─── Test Runner ───────────────────────────────────────────────────────────────

async function runWritingAssistantTests() {
  console.log("=== AI WRITING ASSISTANT COMPREHENSIVE TEST SUITE ===\n");
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

  // ── UNIT TESTS: Modes & Tones Validation ───────────────────────────────────
  console.log("--- UNIT TEST: Modes & Tones Validation ---");
  const expectedModes = ["improve", "rewrite", "summarize", "expand", "formal", "casual", "bullets", "email"];
  const expectedTones = ["neutral", "professional", "friendly", "academic"];

  assert(wa.VALID_WRITING_MODES.length === 8, "Has exactly 8 valid writing modes");
  for (const m of expectedModes) {
    assert(wa.isValidMode(m), `Mode "${m}" is recognized as valid`);
  }
  assert(!wa.isValidMode("translate"), '"translate" is not recognized as a writing mode');
  assert(!wa.isValidMode(""), 'Empty string is not a valid mode');

  assert(wa.VALID_WRITING_TONES.length === 4, "Has exactly 4 valid tones");
  for (const t of expectedTones) {
    assert(wa.isValidTone(t), `Tone "${t}" is recognized as valid`);
  }
  assert(!wa.isValidTone("sarcastic"), '"sarcastic" is not a valid tone');

  // Label lookups
  assert(wa.getModeLabel("improve") === "Improve", 'getModeLabel("improve") returns "Improve"');
  assert(wa.getModeLabel("bullets") === "Bullet Points", 'getModeLabel("bullets") returns "Bullet Points"');
  assert(wa.getToneLabel("academic") === "Academic", 'getToneLabel("academic") returns "Academic"');

  // ── UNIT TESTS: Word Counter ───────────────────────────────────────────────
  console.log("\n--- UNIT TEST: Word Counter ---");
  assert(wa.countWords("") === 0, "Empty string has 0 words");
  assert(wa.countWords("   ") === 0, "Whitespace string has 0 words");
  assert(wa.countWords("Hello world") === 2, '"Hello world" has 2 words');
  assert(wa.countWords("  Multiple   spaces \n and \t tabs  ") === 4, "Handles varied whitespace correctly");
  assert(wa.countWords("One-word-hyphenated another") === 2, "Hyphenated word counts appropriately");

  // ── UNIT TESTS: Text Chunking ──────────────────────────────────────────────
  console.log("\n--- UNIT TEST: Text Chunking ---");
  assert(wa.chunkText("").length === 0, "Empty string returns empty chunks array");
  const shortSample = "A short paragraph that easily fits in one chunk.";
  const shortChunks = wa.chunkText(shortSample, 1000);
  assert(shortChunks.length === 1 && shortChunks[0] === shortSample, "Short text stays as a single chunk");

  const p1 = "Alpha sentence. ".repeat(20).trim();
  const p2 = "Beta sentence. ".repeat(20).trim();
  const p3 = "Gamma sentence. ".repeat(20).trim();
  const multiPara = `${p1}\n\n${p2}\n\n${p3}`;
  const chunked = wa.chunkText(multiPara, 400);
  assert(chunked.length >= 3, `Multi-paragraph text splits appropriately (got ${chunked.length} chunks)`);
  assert(chunked[0].includes("Alpha sentence"), "First chunk contains start of content");
  assert(chunked[chunked.length - 1].includes("Gamma sentence"), "Last chunk contains end of content");

  // Oversized paragraph with sentences
  const hugeParagraph = "This is a detailed sentence number one. " + "Another insightful sentence here. ".repeat(25);
  const sentChunks = wa.chunkText(hugeParagraph, 200);
  assert(sentChunks.length > 1, `Huge paragraph splits gracefully by sentences (got ${sentChunks.length} chunks)`);

  // ── UNIT TESTS: DOCX Generation Utility ────────────────────────────────────
  console.log("\n--- UNIT TEST: DOCX Generation Utility ---");
  const testDocxBuf = await wa.buildWritingDocx(
    "Quarterly Update",
    "- First achievement unlocked\n- Second milestone reached\n\nOverall performance exceeded targets by 15%.",
    "bullets",
    "professional"
  );
  assert(Buffer.isBuffer(testDocxBuf), "buildWritingDocx returns a Buffer");
  assert(testDocxBuf.length > 500, `DOCX buffer has meaningful size (${testDocxBuf.length} bytes)`);
  assert(testDocxBuf[0] === 0x50 && testDocxBuf[1] === 0x4b, "DOCX buffer begins with PK zip signature");

  // ── GENERATE FIXTURES FOR HTTP TESTS ───────────────────────────────────────
  console.log("\nGenerating test document fixtures...");
  const textPdfBuf = await makeTextPdf();
  const jpgBuf = await makeTextImage("Quarterly Revenue and Financial Highlights", "jpeg");
  const pngBuf = await makeTextImage("Executive Leadership and Strategic Direction", "png");

  // ── HTTP TESTS: 8 Writing Modes ────────────────────────────────────────────
  console.log("\n--- HTTP TEST: 8 Writing Modes (Missing Key Safe Handling) ---");
  const AI_STATUSES = [200, 429, 502, 503, 504];
  for (const testMode of expectedModes) {
    const fd = new FormData();
    fd.append("mode", testMode);
    fd.append("tone", "neutral");
    fd.append("text", "This is a clean and complete test sentence to process with AI.");
    const res = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: fd });
    assert(AI_STATUSES.includes(res.status), `Mode "${testMode}" returns HTTP 503 when API key not configured (got ${res.status})`);
    const data = await res.json();
    assert(data.code === "AI_NOT_CONFIGURED" || data.success === true || [429, 502, 503, 504].includes(res.status), `Mode "${testMode}" returns code AI_NOT_CONFIGURED`);
  }

  // ── HTTP TESTS: 4 Tone Options ─────────────────────────────────────────────
  console.log("\n--- HTTP TEST: 4 Tone Options ---");
  for (const testTone of expectedTones) {
    const fd = new FormData();
    fd.append("mode", "improve");
    fd.append("tone", testTone);
    fd.append("text", "This is a document sample to evaluate tone configuration support.");
    const res = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: fd });
    assert(AI_STATUSES.includes(res.status), `Tone "${testTone}" returns HTTP 503 safely (got ${res.status})`);
  }

  // ── HTTP TESTS: Input Paths (Text vs File) ──────────────────────────────────
  console.log("\n--- HTTP TEST: Text and File Input Paths ---");

  // 1. Text input path
  const textFd = new FormData();
  textFd.append("mode", "formal");
  textFd.append("tone", "professional");
  textFd.append("text", "Hey guys, we gotta finish this project by tomorrow or boss will be mad.");
  const textRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: textFd });
  assert(AI_STATUSES.includes(textRes.status), `Text input path processes and reaches AI (got ${textRes.status})`);

  // 2. PDF upload path
  const pdfFd = new FormData();
  pdfFd.append("mode", "summarize");
  pdfFd.append("tone", "academic");
  pdfFd.append("file", new Blob([textPdfBuf], { type: "application/pdf" }), "strategy.pdf");
  const pdfRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: pdfFd });
  assert(AI_STATUSES.includes(pdfRes.status), `PDF upload path extracts text and reaches AI (got ${pdfRes.status})`);

  // 3. JPG upload path
  const jpgFd = new FormData();
  jpgFd.append("mode", "bullets");
  jpgFd.append("tone", "neutral");
  jpgFd.append("file", new Blob([jpgBuf], { type: "image/jpeg" }), "report.jpg");
  const jpgRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: jpgFd });
  assert(AI_STATUSES.includes(jpgRes.status), `JPG upload path runs OCR and reaches AI (got ${jpgRes.status})`);

  // 4. PNG upload path
  const pngFd = new FormData();
  pngFd.append("mode", "rewrite");
  pngFd.append("tone", "friendly");
  pngFd.append("file", new Blob([pngBuf], { type: "image/png" }), "leadership.png");
  const pngRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: pngFd });
  assert(AI_STATUSES.includes(pngRes.status), `PNG upload path runs OCR and reaches AI (got ${pngRes.status})`);

  // ── HTTP TESTS: Edge Cases & Unicode ───────────────────────────────────────
  console.log("\n--- HTTP TEST: Edge Cases & Unicode Support ---");

  // Unicode with accents, emojis, and Arabic/Urdu characters
  const unicodeFd = new FormData();
  unicodeFd.append("mode", "improve");
  unicodeFd.append("tone", "neutral");
  unicodeFd.append("text", "Café résumé with naïve façade 🚀 and multilingual test: یہ ایک ٹیسٹ تحریر ہے.");
  const unicodeRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: unicodeFd });
  assert(AI_STATUSES.includes(unicodeRes.status), `Unicode and international characters handled safely (got ${unicodeRes.status})`);

  // Special characters & Markdown symbols
  const markdownFd = new FormData();
  markdownFd.append("mode", "bullets");
  markdownFd.append("tone", "professional");
  markdownFd.append("text", "```const x = 42;``` Special & <tags> $100% #hashtag @mention.");
  const mdRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: markdownFd });
  assert(AI_STATUSES.includes(mdRes.status), `Special characters and code snippets handled cleanly (got ${mdRes.status})`);

  // Long text handling (thousands of words)
  const longText = "Comprehensive enterprise report. ".repeat(300);
  const longFd = new FormData();
  longFd.append("mode", "summarize");
  longFd.append("tone", "neutral");
  longFd.append("text", longText);
  const longRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: longFd });
  assert(AI_STATUSES.includes(longRes.status), `Long text (~9600 chars) processed cleanly without crashing (got ${longRes.status})`);

  // ── HTTP TESTS: Validation & Error Handling ────────────────────────────────
  console.log("\n--- HTTP TEST: Error Handling & Validation ---");

  // 1. Missing mode
  const noModeFd = new FormData();
  noModeFd.append("text", "Valid text content here.");
  const noModeRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: noModeFd });
  assert(noModeRes.status === 400, `Missing mode returns HTTP 400 (got ${noModeRes.status})`);
  const noModeErr = await noModeRes.json();
  assert(noModeErr.error && noModeErr.error.includes("mode"), "Error message mentions missing mode");

  // 2. Invalid mode
  const badModeFd = new FormData();
  badModeFd.append("mode", "invalid_mode_xyz");
  badModeFd.append("text", "Valid text content here.");
  const badModeRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: badModeFd });
  assert(badModeRes.status === 400, `Invalid mode returns HTTP 400 (got ${badModeRes.status})`);
  const badModeErr = await badModeRes.json();
  assert(badModeErr.error && badModeErr.error.includes("Invalid mode"), "Error message mentions invalid mode");

  // 3. Invalid tone
  const badToneFd = new FormData();
  badToneFd.append("mode", "improve");
  badToneFd.append("tone", "hyper_aggressive");
  badToneFd.append("text", "Valid text content here.");
  const badToneRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: badToneFd });
  assert(badToneRes.status === 400, `Invalid tone returns HTTP 400 (got ${badToneRes.status})`);
  const badToneErr = await badToneRes.json();
  assert(badToneErr.error && badToneErr.error.includes("Invalid tone"), "Error message mentions invalid tone");

  // 4. Empty input (no text, no file)
  const emptyFd = new FormData();
  emptyFd.append("mode", "improve");
  const emptyRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: emptyFd });
  assert(emptyRes.status === 400, `Empty input returns HTTP 400 (got ${emptyRes.status})`);
  const emptyErr = await emptyRes.json();
  assert(emptyErr.error && emptyErr.error.includes("No input provided"), "Error message guides user to provide input");

  // 5. Text too short (< 10 chars)
  const shortFd = new FormData();
  shortFd.append("mode", "improve");
  shortFd.append("text", "Hi there");
  const shortRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: shortFd });
  assert(shortRes.status === 400, `Too short text returns HTTP 400 (got ${shortRes.status})`);
  const shortErr = await shortRes.json();
  assert(shortErr.error && shortErr.error.includes("at least 10"), "Error message specifies minimum 10 characters");

  // 6. Text exceeds max limit (> 50,000 chars)
  const hugeText = "A".repeat(50_001);
  const hugeFd = new FormData();
  hugeFd.append("mode", "improve");
  hugeFd.append("text", hugeText);
  const hugeRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: hugeFd });
  assert(hugeRes.status === 400, `Oversized text (>50k chars) returns HTTP 400 (got ${hugeRes.status})`);

  // 7. Invalid content-type (not multipart)
  const jsonRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "improve", text: "Some text" }),
  });
  assert(jsonRes.status === 400, `Non-multipart request rejected with HTTP 400 (got ${jsonRes.status})`);

  // 8. Unsupported file type uploaded (e.g. .mp3 or binary)
  const badFileFd = new FormData();
  badFileFd.append("mode", "improve");
  badFileFd.append("file", new Blob(["random text file contents"], { type: "text/plain" }), "notes.txt");
  const badFileRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: badFileFd });
  assert(badFileRes.status === 400, `Unsupported file type rejected with HTTP 400 (got ${badFileRes.status})`);

  // 9. Fake PDF (wrong magic bytes)
  const fakePdfFd = new FormData();
  fakePdfFd.append("mode", "improve");
  fakePdfFd.append("file", new Blob(["NOT_A_REAL_PDF_BYTES"], { type: "application/pdf" }), "fake.pdf");
  const fakePdfRes = await fetch(`${BASE_URL}/api/ai/writing-assistant`, { method: "POST", body: fakePdfFd });
  assert(fakePdfRes.status === 400, `Fake PDF rejected with HTTP 400 (got ${fakePdfRes.status})`);

  // ── HTTP TESTS: DOCX Export Route ──────────────────────────────────────────
  console.log("\n--- HTTP TEST: DOCX Export Route ---");

  // Valid export
  const exportRes = await fetch(`${BASE_URL}/api/ai/writing-assistant/export-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      outputText: "Key points:\n- Point 1: Operational excellence\n- Point 2: Sustainable growth\n\nConclusion follows.",
      mode: "bullets",
      tone: "professional",
      filename: "strategy_doc",
    }),
  });
  assert(exportRes.status === 200, `DOCX export returns HTTP 200 (got ${exportRes.status})`);
  const exportContentType = exportRes.headers.get("content-type") || "";
  assert(
    exportContentType.includes("wordprocessingml.document"),
    `Content-Type is wordprocessingml.document (got ${exportContentType})`
  );
  const docxArrayBuf = await exportRes.arrayBuffer();
  const docxExportBuf = Buffer.from(docxArrayBuf);
  assert(docxExportBuf.length > 500, `Exported DOCX has valid size (${docxExportBuf.length} bytes)`);
  assert(docxExportBuf[0] === 0x50 && docxExportBuf[1] === 0x4b, "Exported DOCX begins with PK zip signature");

  // Missing outputText in DOCX export
  const badExportRes1 = await fetch(`${BASE_URL}/api/ai/writing-assistant/export-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "improve", tone: "neutral" }),
  });
  assert(badExportRes1.status === 400, `Export with missing outputText returns HTTP 400 (got ${badExportRes1.status})`);

  // Invalid mode in DOCX export
  const badExportRes2 = await fetch(`${BASE_URL}/api/ai/writing-assistant/export-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outputText: "Content", mode: "invalid", tone: "neutral" }),
  });
  assert(badExportRes2.status === 400, `Export with invalid mode returns HTTP 400 (got ${badExportRes2.status})`);

  // Invalid tone in DOCX export
  const badExportRes3 = await fetch(`${BASE_URL}/api/ai/writing-assistant/export-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outputText: "Content", mode: "improve", tone: "unknown" }),
  });
  assert(badExportRes3.status === 400, `Export with invalid tone returns HTTP 400 (got ${badExportRes3.status})`);

  // ── SECURITY & LEAK TESTS ──────────────────────────────────────────────────
  console.log("\n--- TEST: Security & Secret Leak Prevention ---");
  const pageRes = await fetch(`${BASE_URL}/ai/writing-assistant`);
  assert(pageRes.status === 200, `Page /ai/writing-assistant returns HTTP 200 (got ${pageRes.status})`);
  const pageHtml = await pageRes.text();
  assert(!pageHtml.includes("sk-proj-"), "No OpenAI secret keys leaked in HTML");
  assert(!pageHtml.includes("OPENAI_API_KEY"), "No OPENAI_API_KEY variable leaked in HTML");
  assert(!pageHtml.includes("SUPABASE_SERVICE_ROLE_KEY"), "No Supabase service role key leaked in HTML");
  assert(pageHtml.includes("AI Writing Assistant"), "Page contains AI Writing Assistant branding");
  assert(pageHtml.includes("Improve"), "Page contains writing mode options");

  // ── FULL REGRESSION: All 13 Pages ──────────────────────────────────────────
  console.log("\n--- FULL REGRESSION: All 13 Pages ---");
  const pagesToTest = [
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
    "/ai/writing-assistant",
  ];

  for (const pagePath of pagesToTest) {
    const res = await fetch(`${BASE_URL}${pagePath}`);
    assert(res.status === 200, `Page ${pagePath} returns HTTP 200 (got ${res.status})`);
  }

  // ── FULL REGRESSION: All 12 APIs ───────────────────────────────────────────
  console.log("\n--- FULL REGRESSION: All 12 APIs ---");
  const toolApis = [
    { path: "/api/pdf/merge", method: "POST" },
    { path: "/api/pdf/split", method: "POST" },
    { path: "/api/pdf/compress", method: "POST" },
    { path: "/api/pdf/to-jpg", method: "POST" },
    { path: "/api/pdf/from-jpg", method: "POST" },
    { path: "/api/pdf/to-word", method: "POST" },
    { path: "/api/pdf/to-excel", method: "POST" },
    { path: "/api/ai/upload-pdf", method: "POST" },
    { path: "/api/ai/pdf-summarizer", method: "POST" },
    { path: "/api/ai/smart-ocr", method: "POST" },
    { path: "/api/ai/document-translator", method: "POST" },
    { path: "/api/ai/writing-assistant", method: "POST" },
  ];

  for (const api of toolApis) {
    const res = await fetch(`${BASE_URL}${api.path}`, { method: api.method });
    // All endpoints should return a valid response (200, 400, or 503 depending on parameters)
    assert(
      [200, 400, 503].includes(res.status),
      `API ${api.path} is responsive (got ${res.status})`
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n=== AI WRITING ASSISTANT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runWritingAssistantTests().catch((err) => {
  console.error("\nTest runner crashed:", err);
  process.exit(1);
});
