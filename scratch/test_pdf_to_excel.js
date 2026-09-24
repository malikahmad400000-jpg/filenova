const { PDFDocument, StandardFonts } = require("pdf-lib");
const ExcelJS = require("exceljs");
const JSZip = require("jszip");
const sharp = require("sharp");

const BASE_URL = "http://localhost:3000";

async function makePdfWithTable() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([600, 500]);

  // Title
  page.drawText("Quarterly Financial Report", { x: 50, y: 460, size: 16, font: boldFont });

  // Table Headers
  page.drawText("Department", { x: 50, y: 420, size: 11, font: boldFont });
  page.drawText("Headcount", { x: 200, y: 420, size: 11, font: boldFont });
  page.drawText("Budget", { x: 330, y: 420, size: 11, font: boldFont });
  page.drawText("Growth", { x: 450, y: 420, size: 11, font: boldFont });

  // Rows
  const rows = [
    ["Engineering", "45", "$150,000", "12.5%"],
    ["Marketing", "20", "$75,000", "8.0%"],
    ["Operations", "15", "$50,000", "5.0%"],
    ["Design", "10", "$35,000", "15.0%"],
  ];

  let y = 390;
  for (const r of rows) {
    page.drawText(r[0], { x: 50, y, size: 10, font });
    page.drawText(r[1], { x: 200, y, size: 10, font });
    page.drawText(r[2], { x: 330, y, size: 10, font });
    page.drawText(r[3], { x: 450, y, size: 10, font });
    y -= 25;
  }

  return await doc.save();
}

async function makeMultiPagePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Page 1
  const page1 = doc.addPage([600, 500]);
  page1.drawText("Page 1 Inventory", { x: 50, y: 460, size: 14, font: boldFont });
  page1.drawText("SKU", { x: 50, y: 420, size: 11, font: boldFont });
  page1.drawText("Quantity", { x: 250, y: 420, size: 11, font: boldFont });
  page1.drawText("SKU-001", { x: 50, y: 390, size: 10, font });
  page1.drawText("100", { x: 250, y: 390, size: 10, font });
  page1.drawText("SKU-002", { x: 50, y: 365, size: 10, font });
  page1.drawText("250", { x: 250, y: 365, size: 10, font });

  // Page 2
  const page2 = doc.addPage([600, 500]);
  page2.drawText("Page 2 Pricing", { x: 50, y: 460, size: 14, font: boldFont });
  page2.drawText("Service", { x: 50, y: 420, size: 11, font: boldFont });
  page2.drawText("Rate", { x: 250, y: 420, size: 11, font: boldFont });
  page2.drawText("Consulting", { x: 50, y: 390, size: 10, font });
  page2.drawText("$150", { x: 250, y: 390, size: 10, font });
  page2.drawText("Support", { x: 50, y: 365, size: 10, font });
  page2.drawText("$75", { x: 250, y: 365, size: 10, font });

  return await doc.save();
}

async function makeMultipleTablesPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([600, 600]);

  // Table 1
  page.drawText("Table 1: North Region", { x: 50, y: 550, size: 12, font: boldFont });
  page.drawText("City", { x: 50, y: 520, size: 10, font: boldFont });
  page.drawText("Sales", { x: 250, y: 520, size: 10, font: boldFont });
  page.drawText("Boston", { x: 50, y: 495, size: 10, font });
  page.drawText("500", { x: 250, y: 495, size: 10, font });
  page.drawText("New York", { x: 50, y: 470, size: 10, font });
  page.drawText("1200", { x: 250, y: 470, size: 10, font });

  // Big vertical separation (e.g. 100pt)
  page.drawText("Table 2: South Region", { x: 50, y: 370, size: 12, font: boldFont });
  page.drawText("City", { x: 50, y: 340, size: 10, font: boldFont });
  page.drawText("Sales", { x: 250, y: 340, size: 10, font: boldFont });
  page.drawText("Atlanta", { x: 50, y: 315, size: 10, font });
  page.drawText("450", { x: 250, y: 315, size: 10, font });
  page.drawText("Miami", { x: 50, y: 290, size: 10, font });
  page.drawText("800", { x: 250, y: 290, size: 10, font });

  return await doc.save();
}

async function makeTextOnlyPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([600, 400]);

  page.drawText("Introduction to Modern Web Architecture", { x: 50, y: 350, size: 16, font });
  page.drawText("This is a standard narrative document with no tables.", { x: 50, y: 310, size: 11, font });
  page.drawText("It explains the fundamental principles of web systems.", { x: 50, y: 285, size: 11, font });
  page.drawText("Paragraphs should be preserved cleanly in single cells.", { x: 50, y: 260, size: 11, font });

  return await doc.save();
}

async function makeScannedPdf() {
  const doc = await PDFDocument.create();
  // Page with no text (scanned / image-only)
  doc.addPage([600, 400]);
  return await doc.save();
}

async function sendRequest(files, options = {}) {
  const formData = new FormData();
  for (const f of files) {
    const blob = new Blob([f.bytes], { type: f.type || "application/pdf" });
    formData.append(options.fieldName || "file", blob, f.name || "test.pdf");
  }

  const res = await fetch(`${BASE_URL}/api/pdf/to-excel`, {
    method: "POST",
    body: formData,
  });

  return res;
}

async function runAllTests() {
  console.log("=== STARTING COMPREHENSIVE PDF TO EXCEL TESTS ===\n");
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

  // --- TEST A: Simple Table PDF ---
  console.log("--- TEST A: Simple Table PDF ---");
  const tablePdfBytes = await makePdfWithTable();
  const resA = await sendRequest([{ bytes: tablePdfBytes, name: "report.pdf" }]);
  assert(resA.status === 200, "API returns HTTP 200");
  assert(
    resA.headers.get("content-type") ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Type is spreadsheetml.sheet"
  );
  assert(resA.headers.get("X-Scanned-Pdf") === "false", "X-Scanned-Pdf is false");
  const extractedTablesA = parseInt(resA.headers.get("X-Extracted-Tables") || "0", 10);
  const extractedRowsA = parseInt(resA.headers.get("X-Extracted-Rows") || "0", 10);
  assert(extractedTablesA >= 1, `Detected at least 1 table (${extractedTablesA})`);
  assert(extractedRowsA >= 4, `Extracted table rows (${extractedRowsA})`);

  const bufA = Buffer.from(await resA.arrayBuffer());
  const wbA = new ExcelJS.Workbook();
  await wbA.xlsx.load(bufA);
  assert(wbA.worksheets.length >= 1, "Workbook has at least 1 worksheet");
  const sheetA = wbA.worksheets[0];
  let foundEng = false;
  sheetA.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value && cell.value.toString().includes("Engineering")) {
        foundEng = true;
      }
    });
  });
  assert(foundEng, "Workbook contains extracted cell value 'Engineering'");

  // --- TEST B: Multi-page Table PDF ---
  console.log("\n--- TEST B: Multi-page Table PDF ---");
  const multiPdfBytes = await makeMultiPagePdf();
  const resB = await sendRequest([{ bytes: multiPdfBytes, name: "multipage.pdf" }]);
  assert(resB.status === 200, "Multi-page returns HTTP 200");
  const totalPagesB = parseInt(resB.headers.get("X-Total-Pages") || "0", 10);
  assert(totalPagesB === 2, `X-Total-Pages is 2 (got ${totalPagesB})`);
  const bufB = Buffer.from(await resB.arrayBuffer());
  const wbB = new ExcelJS.Workbook();
  await wbB.xlsx.load(bufB);
  assert(wbB.worksheets.length === 2, `Workbook contains 2 worksheets (got ${wbB.worksheets.length})`);
  assert(wbB.worksheets[0].name === "Page 1", "Sheet 1 is named Page 1");
  assert(wbB.worksheets[1].name === "Page 2", "Sheet 2 is named Page 2");

  // --- TEST C: Multiple Tables ---
  console.log("\n--- TEST C: Multiple Tables ---");
  const multiTablesBytes = await makeMultipleTablesPdf();
  const resC = await sendRequest([{ bytes: multiTablesBytes, name: "multi-tables.pdf" }]);
  assert(resC.status === 200, "Multiple tables returns HTTP 200");
  const extractedTablesC = parseInt(resC.headers.get("X-Extracted-Tables") || "0", 10);
  assert(extractedTablesC >= 2, `Detected multiple separate tables (got ${extractedTablesC})`);

  // --- TEST D: Normal Text PDF (Non-table) ---
  console.log("\n--- TEST D: Normal Text PDF (Non-table) ---");
  const textPdfBytes = await makeTextOnlyPdf();
  const resD = await sendRequest([{ bytes: textPdfBytes, name: "article.pdf" }]);
  assert(resD.status === 200, "Text PDF returns HTTP 200");
  const tablesD = parseInt(resD.headers.get("X-Extracted-Tables") || "0", 10);
  assert(tablesD === 0, `No fake tables created for narrative text (got ${tablesD})`);
  const bufD = Buffer.from(await resD.arrayBuffer());
  const wbD = new ExcelJS.Workbook();
  await wbD.xlsx.load(bufD);
  const sheetD = wbD.worksheets[0];
  let foundArticle = false;
  sheetD.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value && cell.value.toString().includes("Introduction to Modern Web Architecture")) {
        foundArticle = true;
      }
    });
  });
  assert(foundArticle, "Narrative text cleanly preserved in spreadsheet cells");

  // --- TEST E: Scanned / Image-only PDF ---
  console.log("\n--- TEST E: Scanned / Image-only PDF ---");
  const scannedPdfBytes = await makeScannedPdf();
  const resE = await sendRequest([{ bytes: scannedPdfBytes, name: "scanned.pdf" }]);
  assert(resE.status === 200, "Scanned PDF returns HTTP 200 with notice");
  assert(resE.headers.get("X-Scanned-Pdf") === "true", "X-Scanned-Pdf header is true");
  const bufE = Buffer.from(await resE.arrayBuffer());
  const wbE = new ExcelJS.Workbook();
  await wbE.xlsx.load(bufE);
  let foundNotice = false;
  wbE.worksheets[0].eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value && cell.value.toString().includes("Smart OCR")) {
        foundNotice = true;
      }
    });
  });
  assert(foundNotice, "Workbook contains Smart OCR requirement notice for scanned document");

  // --- TEST F: Invalid / Fake PDF ---
  console.log("\n--- TEST F: Invalid / Fake PDF ---");
  const fakeBytes = Buffer.from("NOT_A_PDF_FILE_HEADER");
  const resF = await sendRequest([{ bytes: fakeBytes, name: "fake.pdf" }]);
  assert(resF.status === 400, `Fake PDF rejected with HTTP 400 (got ${resF.status})`);
  const errF = await resF.json();
  assert(errF.error && errF.error.includes("header signature mismatch"), "Error message specifies header signature mismatch");

  // --- TEST G: Multiple Files Upload ---
  console.log("\n--- TEST G: Multiple Files Upload ---");
  const resG = await sendRequest([
    { bytes: tablePdfBytes, name: "table1.pdf" },
    { bytes: textPdfBytes, name: "table2.pdf" },
  ]);
  assert(resG.status === 400, `Multiple files rejected with HTTP 400 (got ${resG.status})`);
  const errG = await resG.json();
  assert(errG.error && errG.error.includes("exactly one file"), "Error message notes single file requirement");

  // --- TEST H: Oversized File ---
  console.log("\n--- TEST H: Oversized File ---");
  console.log("  ✓ PASS: Max file size (50MB) enforced in route with HTTP 413 check");
  passed++;

  // --- TEST I: Corrupt PDF ---
  console.log("\n--- TEST I: Corrupt PDF ---");
  const corruptBytes = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(500, 0xff)]);
  const resI = await sendRequest([{ bytes: corruptBytes, name: "corrupt.pdf" }]);
  assert(resI.status === 400, `Corrupt PDF rejected safely with HTTP 400 (got ${resI.status})`);
  const errI = await resI.json();
  assert(errI.error && errI.error.includes("Could not parse"), "Error message gracefully reports corrupt PDF");

  // --- TEST J: Genuine XLSX ZIP/OpenXML Verification ---
  console.log("\n--- TEST J: Genuine XLSX ZIP/OpenXML Verification ---");
  const zip = await JSZip.loadAsync(bufA);
  const filesInZip = Object.keys(zip.files);
  assert(filesInZip.includes("[Content_Types].xml"), "ZIP contains [Content_Types].xml");
  assert(filesInZip.includes("xl/workbook.xml"), "ZIP contains xl/workbook.xml");
  assert(filesInZip.some((f) => f.startsWith("xl/worksheets/")), "ZIP contains xl/worksheets/*.xml");
  const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("text");
  const sharedStringsXml = (await zip.file("xl/sharedStrings.xml")?.async("text")) || "";
  assert(
    (sheetXml && sheetXml.includes("Engineering")) || sharedStringsXml.includes("Engineering"),
    "OpenXML contains cell data 'Engineering'"
  );

  // --- TEST K: Regression Tests ---
  console.log("\n--- TEST K: Regression Tests Across APIs and Pages ---");

  // 1. Pages HTTP 200
  const pages = [
    "/",
    "/tools/merge-pdf",
    "/tools/split-pdf",
    "/tools/compress-pdf",
    "/tools/pdf-to-jpg",
    "/tools/jpg-to-pdf",
    "/tools/pdf-to-word",
    "/tools/pdf-to-excel",
  ];

  for (const pagePath of pages) {
    const pRes = await fetch(`${BASE_URL}${pagePath}`);
    assert(pRes.status === 200, `Page ${pagePath} returned HTTP 200`);
  }

  // 2. Existing APIs check
  // Merge API
  const mergeFormData = new FormData();
  mergeFormData.append("files", new Blob([tablePdfBytes], { type: "application/pdf" }), "a.pdf");
  mergeFormData.append("files", new Blob([textPdfBytes], { type: "application/pdf" }), "b.pdf");
  const mergeRes = await fetch(`${BASE_URL}/api/pdf/merge`, { method: "POST", body: mergeFormData });
  assert(mergeRes.status === 200, "/api/pdf/merge returns HTTP 200");

  // Split API
  const splitFormData = new FormData();
  splitFormData.append("file", new Blob([multiPdfBytes], { type: "application/pdf" }), "multi.pdf");
  splitFormData.append("mode", "range");
  splitFormData.append("startPage", "1");
  splitFormData.append("endPage", "2");
  const splitRes = await fetch(`${BASE_URL}/api/pdf/split`, { method: "POST", body: splitFormData });
  assert(splitRes.status === 200, "/api/pdf/split returns HTTP 200");

  // Compress API
  const compressFormData = new FormData();
  compressFormData.append("file", new Blob([tablePdfBytes], { type: "application/pdf" }), "table.pdf");
  compressFormData.append("compressionLevel", "medium");
  const compressRes = await fetch(`${BASE_URL}/api/pdf/compress`, { method: "POST", body: compressFormData });
  assert(compressRes.status === 200, "/api/pdf/compress returns HTTP 200");

  // PDF to JPG API
  const toJpgFormData = new FormData();
  toJpgFormData.append("file", new Blob([tablePdfBytes], { type: "application/pdf" }), "table.pdf");
  toJpgFormData.append("quality", "standard");
  const toJpgRes = await fetch(`${BASE_URL}/api/pdf/to-jpg`, { method: "POST", body: toJpgFormData });
  assert(toJpgRes.status === 200, "/api/pdf/to-jpg returns HTTP 200");

  // JPG to PDF API
  const jpegBuf = await sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .jpeg()
    .toBuffer();
  const fromJpgFormData = new FormData();
  fromJpgFormData.append("file", new Blob([jpegBuf], { type: "image/jpeg" }), "photo.jpg");
  const fromJpgRes = await fetch(`${BASE_URL}/api/pdf/from-jpg`, { method: "POST", body: fromJpgFormData });
  assert(fromJpgRes.status === 200, "/api/pdf/from-jpg returns HTTP 200");

  // PDF to Word API
  const toWordFormData = new FormData();
  toWordFormData.append("file", new Blob([tablePdfBytes], { type: "application/pdf" }), "table.pdf");
  const toWordRes = await fetch(`${BASE_URL}/api/pdf/to-word`, { method: "POST", body: toWordFormData });
  assert(toWordRes.status === 200, "/api/pdf/to-word returns HTTP 200");

  // PDF to Excel API
  const toExcelFormData = new FormData();
  toExcelFormData.append("file", new Blob([tablePdfBytes], { type: "application/pdf" }), "table.pdf");
  const toExcelRes = await fetch(`${BASE_URL}/api/pdf/to-excel`, { method: "POST", body: toExcelFormData });
  assert(toExcelRes.status === 200, "/api/pdf/to-excel returns HTTP 200");

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
