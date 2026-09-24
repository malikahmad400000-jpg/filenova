/**
 * HTTP-based test suite for Chat with PDF feature.
 * Requires a running Next.js dev server on port 3000.
 * Run from: c:\Users\Ahmed\filenova
 */

const BASE_URL = "http://localhost:3000";

// We need pdf-lib and sharp for creating test files
const { PDFDocument, StandardFonts } = require("pdf-lib");
const sharp = require("sharp");

async function makeTextPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Page 1
  const page1 = doc.addPage([600, 500]);
  page1.drawText("Project Titan Overview", { x: 50, y: 460, size: 16, font: boldFont });
  page1.drawText(
    "Project Titan is an initiative launched in 2024 to modernize the payment infrastructure.",
    { x: 50, y: 430, size: 11, font }
  );
  page1.drawText(
    "The total allocated capital for Phase 1 is forty-two million dollars ($42,000,000).",
    { x: 50, y: 405, size: 11, font }
  );
  page1.drawText(
    "Lead architect on the project is Dr. Helena Vance based in Geneva, Switzerland.",
    { x: 50, y: 380, size: 11, font }
  );

  // Page 2
  const page2 = doc.addPage([600, 500]);
  page2.drawText("Security and Compliance Guidelines", { x: 50, y: 460, size: 16, font: boldFont });
  page2.drawText(
    "All client communications must enforce TLS 1.3 encryption and dual-factor authentication.",
    { x: 50, y: 430, size: 11, font }
  );
  page2.drawText(
    "The compliance audit was completed on November 15, 2024 by Ernst & Young auditors.",
    { x: 50, y: 405, size: 11, font }
  );
  page2.drawText(
    "Data retention policies dictate that inactive audit logs are purged after seven years.",
    { x: 50, y: 380, size: 11, font }
  );

  return Buffer.from(await doc.save());
}

async function makeScannedPdf() {
  const doc = await PDFDocument.create();
  doc.addPage([600, 500]); // Blank page, no text
  return Buffer.from(await doc.save());
}

async function runTests() {
  console.log("=== CHAT WITH PDF — HTTP TEST SUITE ===\n");

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

  const pdfBytes = await makeTextPdf();
  const scannedBytes = await makeScannedPdf();

  // ─── TEST E: Upload Valid PDF ───────────────────────────────────────────────
  console.log("--- TEST E: Upload PDF API ---");
  const uploadFd = new FormData();
  uploadFd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "titan.pdf");

  const uploadRes = await fetch(`${BASE_URL}/api/ai/upload-pdf`, {
    method: "POST",
    body: uploadFd,
  });
  assert(uploadRes.status === 200, `Upload returns HTTP 200 (got ${uploadRes.status})`);
  const uploadData = await uploadRes.json();
  assert(uploadData.success === true, "Upload returned success: true");
  assert(Boolean(uploadData.documentId), `Received documentId: ${uploadData.documentId}`);
  assert(uploadData.totalPages === 2, `Total pages is 2 (got ${uploadData.totalPages})`);
  assert(uploadData.totalWords > 40, `Total words > 40 (got ${uploadData.totalWords})`);
  assert(uploadData.chunkCount >= 1, `Chunk count >= 1 (got ${uploadData.chunkCount})`);
  assert(uploadData.isScanned === false, "isScanned is false");

  const activeDocId = uploadData.documentId;

  // ─── TEST F: Scanned PDF Detection ─────────────────────────────────────────
  console.log("\n--- TEST F: Scanned PDF Detection ---");
  const scanFd = new FormData();
  scanFd.append("file", new Blob([scannedBytes], { type: "application/pdf" }), "scan.pdf");

  const scanRes = await fetch(`${BASE_URL}/api/ai/upload-pdf`, { method: "POST", body: scanFd });
  assert(scanRes.status === 200, `Scanned PDF upload returns HTTP 200 (got ${scanRes.status})`);
  const scanData = await scanRes.json();
  assert(scanData.isScanned === true, "Detected document as scanned (isScanned: true)");
  assert(
    scanData.warning && (scanData.warning.includes("Smart OCR") || scanData.warning.includes("searchable text")),
    `Warning informs user about scanned content (got: "${scanData.warning}")`
  );

  // Chatting with scanned PDF returns 422
  const scanChatRes = await fetch(`${BASE_URL}/api/ai/chat-with-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: scanData.documentId, question: "What is this document about?" }),
  });
  assert(scanChatRes.status === 422, `Chat with scanned PDF returns HTTP 422 (got ${scanChatRes.status})`);

  // ─── TEST G: Invalid / Fake PDF ─────────────────────────────────────────────
  console.log("\n--- TEST G: Invalid / Fake PDF Rejected ---");
  const fakeFd = new FormData();
  fakeFd.append("file", new Blob([Buffer.from("NOT_A_PDF_BYTES")], { type: "application/pdf" }), "fake.pdf");
  const fakeRes = await fetch(`${BASE_URL}/api/ai/upload-pdf`, { method: "POST", body: fakeFd });
  assert(fakeRes.status === 400, `Fake PDF rejected with HTTP 400 (got ${fakeRes.status})`);
  const fakeErr = await fakeRes.json();
  assert(
    fakeErr.error && fakeErr.error.toLowerCase().includes("signature"),
    `Error reports signature mismatch (got: "${fakeErr.error}")`
  );

  // ─── TEST H: Multiple Files Rejected ────────────────────────────────────────
  console.log("\n--- TEST H: Multiple Files Rejected ---");
  const multiFd = new FormData();
  multiFd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "1.pdf");
  multiFd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "2.pdf");
  const multiRes = await fetch(`${BASE_URL}/api/ai/upload-pdf`, { method: "POST", body: multiFd });
  assert(multiRes.status === 400, `Multiple files rejected with HTTP 400 (got ${multiRes.status})`);

  // ─── TEST I: Invalid Chat Inputs ────────────────────────────────────────────
  console.log("\n--- TEST I: Invalid Chat Inputs ---");

  // Empty question
  const emptyRes = await fetch(`${BASE_URL}/api/ai/chat-with-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: activeDocId, question: "   " }),
  });
  assert(emptyRes.status === 400, `Empty question rejected with HTTP 400 (got ${emptyRes.status})`);

  // Oversized question
  const longRes = await fetch(`${BASE_URL}/api/ai/chat-with-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: activeDocId, question: "a".repeat(1005) }),
  });
  assert(longRes.status === 400, `Oversized question rejected with HTTP 400 (got ${longRes.status})`);

  // Non-existent documentId
  const noDocRes = await fetch(`${BASE_URL}/api/ai/chat-with-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: "non-existent-uuid-9999", question: "Hello?" }),
  });
  assert(noDocRes.status === 404, `Unknown documentId returns HTTP 404 (got ${noDocRes.status})`);

  // ─── TEST J: Missing API Key Handling ──────────────────────────────────────
  console.log("\n--- TEST J: Missing API Key Handling ---");
  const askRes = await fetch(`${BASE_URL}/api/ai/chat-with-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: activeDocId, question: "What is Project Titan?" }),
  });

  // No API key is configured in local environment → expect 503
  assert(askRes.status === 503, `Returns HTTP 503 when OPENAI_API_KEY not set (got ${askRes.status})`);
  const askErr = await askRes.json();
  assert(
    askErr.error && askErr.error.includes("OPENAI_API_KEY"),
    `Error provides config instruction without secrets (got: "${askErr.error}")`
  );

  // ─── TEST K: Security — No Secret Leak in HTML ─────────────────────────────
  console.log("\n--- TEST K: Security — No Secret Leak in HTML ---");
  const pageRes = await fetch(`${BASE_URL}/ai/chat-with-pdf`);
  assert(pageRes.status === 200, `Chat page returns HTTP 200 (got ${pageRes.status})`);
  const pageHtml = await pageRes.text();
  assert(!pageHtml.includes("sk-"), "No OpenAI secret keys leaked in HTML");
  assert(!pageHtml.includes("OPENAI_API_KEY"), "No OPENAI_API_KEY leaked in HTML");
  assert(!pageHtml.includes("SUPABASE_SERVICE"), "No Supabase service key leaked in HTML");

  // ─── TEST L: Full Regression — All Pages Return 200 ────────────────────────
  console.log("\n--- TEST L: Full Regression — All Pages ---");

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
  ];

  for (const p of pages) {
    const r = await fetch(`${BASE_URL}${p}`);
    assert(r.status === 200, `Page ${p} returns HTTP 200 (got ${r.status})`);
  }

  // ─── TEST M: All Tool APIs Return 200 ──────────────────────────────────────
  console.log("\n--- TEST M: All Tool APIs Regression ---");

  // Merge PDF
  const mFd = new FormData();
  mFd.append("files", new Blob([pdfBytes], { type: "application/pdf" }), "a.pdf");
  mFd.append("files", new Blob([pdfBytes], { type: "application/pdf" }), "b.pdf");
  const mRes = await fetch(`${BASE_URL}/api/pdf/merge`, { method: "POST", body: mFd });
  assert(mRes.status === 200, `/api/pdf/merge returns HTTP 200 (got ${mRes.status})`);

  // Split PDF
  const sFd = new FormData();
  sFd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "split.pdf");
  sFd.append("mode", "range");
  sFd.append("startPage", "1");
  sFd.append("endPage", "2");
  const sRes = await fetch(`${BASE_URL}/api/pdf/split`, { method: "POST", body: sFd });
  assert(sRes.status === 200, `/api/pdf/split returns HTTP 200 (got ${sRes.status})`);

  // Compress PDF
  const cFd = new FormData();
  cFd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "comp.pdf");
  cFd.append("compressionLevel", "medium");
  const cRes = await fetch(`${BASE_URL}/api/pdf/compress`, { method: "POST", body: cFd });
  assert(cRes.status === 200, `/api/pdf/compress returns HTTP 200 (got ${cRes.status})`);

  // PDF to JPG
  const jFd = new FormData();
  jFd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "doc.pdf");
  jFd.append("quality", "standard");
  const jRes = await fetch(`${BASE_URL}/api/pdf/to-jpg`, { method: "POST", body: jFd });
  assert(jRes.status === 200, `/api/pdf/to-jpg returns HTTP 200 (got ${jRes.status})`);

  // JPG to PDF
  const jpegBuf = await sharp({
    create: { width: 50, height: 50, channels: 3, background: { r: 150, g: 150, b: 250 } },
  }).jpeg().toBuffer();
  const fjFd = new FormData();
  fjFd.append("file", new Blob([jpegBuf], { type: "image/jpeg" }), "sample.jpg");
  const fjRes = await fetch(`${BASE_URL}/api/pdf/from-jpg`, { method: "POST", body: fjFd });
  assert(fjRes.status === 200, `/api/pdf/from-jpg returns HTTP 200 (got ${fjRes.status})`);

  // PDF to Word
  const wFd = new FormData();
  wFd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "doc.pdf");
  const wRes = await fetch(`${BASE_URL}/api/pdf/to-word`, { method: "POST", body: wFd });
  assert(wRes.status === 200, `/api/pdf/to-word returns HTTP 200 (got ${wRes.status})`);

  // PDF to Excel
  const xFd = new FormData();
  xFd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "doc.pdf");
  const xRes = await fetch(`${BASE_URL}/api/pdf/to-excel`, { method: "POST", body: xFd });
  assert(xRes.status === 200, `/api/pdf/to-excel returns HTTP 200 (got ${xRes.status})`);

  // Chat with PDF upload API
  const uploadFd2 = new FormData();
  uploadFd2.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "doc2.pdf");
  const upRes2 = await fetch(`${BASE_URL}/api/ai/upload-pdf`, { method: "POST", body: uploadFd2 });
  assert(upRes2.status === 200, `/api/ai/upload-pdf returns HTTP 200 (got ${upRes2.status})`);

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("\nTest runner crashed:", err);
  process.exit(1);
});
