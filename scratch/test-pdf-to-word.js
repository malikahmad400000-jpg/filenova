const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const sharp = require('sharp');
const JSZip = require('jszip');

async function runTests() {
  console.log('=== RUNNING COMPREHENSIVE PDF TO WORD TEST SUITE ===\n');

  // --- 1. Create Test PDFs ---
  // PDF 1: Text with Title, Heading, and Paragraphs
  const doc1 = await PDFDocument.create();
  const fontBold = await doc1.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc1.embedFont(StandardFonts.Helvetica);
  const p1 = doc1.addPage([595, 842]);
  p1.drawText('FileNova Platform Overview', { x: 50, y: 780, size: 22, font: fontBold, color: rgb(0,0,0) });
  p1.drawText('1. Core Philosophy', { x: 50, y: 730, size: 16, font: fontBold });
  p1.drawText('Privacy-first document processing utilities that operate entirely in-memory.', { x: 50, y: 700, size: 11, font: fontReg });
  const pdfBytes1 = await doc1.save();

  // PDF 2: Multi-page PDF
  const doc2 = await PDFDocument.create();
  const d2p1 = doc2.addPage([595, 842]);
  d2p1.drawText('Page One Hello', { x: 50, y: 750, size: 12, font: fontReg });
  const d2p2 = doc2.addPage([595, 842]);
  d2p2.drawText('Page Two World', { x: 50, y: 750, size: 12, font: fontReg });
  const pdfBytes2 = await doc2.save();

  // PDF 3: Table PDF
  const doc3 = await PDFDocument.create();
  const d3p = doc3.addPage([595, 842]);
  d3p.drawText('Quarterly Metrics', { x: 50, y: 780, size: 18, font: fontBold });
  d3p.drawText('Metric', { x: 50, y: 730, size: 11, font: fontBold });
  d3p.drawText('Value', { x: 200, y: 730, size: 11, font: fontBold });
  d3p.drawText('Target', { x: 350, y: 730, size: 11, font: fontBold });
  d3p.drawText('Latency', { x: 50, y: 710, size: 10, font: fontReg });
  d3p.drawText('42ms', { x: 200, y: 710, size: 10, font: fontReg });
  d3p.drawText('less than 50ms', { x: 350, y: 710, size: 10, font: fontReg });
  d3p.drawText('Uptime', { x: 50, y: 690, size: 10, font: fontReg });
  d3p.drawText('99.99%', { x: 200, y: 690, size: 10, font: fontReg });
  d3p.drawText('99.9%', { x: 350, y: 690, size: 10, font: fontReg });
  const pdfBytes3 = await doc3.save();

  // PDF 4: Embedded Image PDF
  const rawImg = Buffer.alloc(200 * 150 * 3);
  for (let i = 0; i < 200 * 150; i++) { rawImg[i*3] = 200; rawImg[i*3+1] = 80; rawImg[i*3+2] = 40; }
  const sampleJpg = await sharp(rawImg, { raw: { width: 200, height: 150, channels: 3 } }).jpeg().toBuffer();
  const doc4 = await PDFDocument.create();
  const embeddedJpg = await doc4.embedJpg(sampleJpg);
  const d4p = doc4.addPage([595, 842]);
  d4p.drawText('Embedded Photo Test', { x: 50, y: 780, size: 16, font: fontBold });
  d4p.drawImage(embeddedJpg, { x: 50, y: 550, width: 200, height: 150 });
  const pdfBytes4 = await doc4.save();

  // PDF 5: Scanned / Image-only (0 text)
  const doc5 = await PDFDocument.create();
  doc5.addPage([595, 842]); // blank
  const pdfBytes5 = await doc5.save();

  // --- TEST A: Single Page Text PDF ---
  console.log('--- Test A: Single-page Text PDF to Word ---');
  const formA = new FormData();
  formA.append('file', new Blob([pdfBytes1], { type: 'application/pdf' }), 'filenova-overview.pdf');
  const resA = await fetch('http://localhost:3000/api/pdf/to-word', { method: 'POST', body: formA });
  console.log('Status:', resA.status);
  console.log('Content-Type:', resA.headers.get('content-type'));
  console.log('Content-Disposition:', resA.headers.get('content-disposition'));
  console.log('X-Extracted-Words:', resA.headers.get('X-Extracted-Words'));
  const bufA = Buffer.from(await resA.arrayBuffer());
  const zipA = await JSZip.loadAsync(bufA);
  const docXmlA = await zipA.file('word/document.xml').async('text');
  console.log('Valid OpenXML ZIP package:', bufA[0] === 0x50 && bufA[1] === 0x4B ? 'PASS ✓' : 'FAIL ✗');
  console.log('Contains extracted title in document.xml:', docXmlA.includes('FileNova Platform Overview') ? 'PASS ✓' : 'FAIL ✗');

  // --- TEST B: Multi-page PDF ---
  console.log('\n--- Test B: Multi-page PDF to Word ---');
  const formB = new FormData();
  formB.append('file', new Blob([pdfBytes2], { type: 'application/pdf' }), 'multipage.pdf');
  const resB = await fetch('http://localhost:3000/api/pdf/to-word', { method: 'POST', body: formB });
  const bufB = Buffer.from(await resB.arrayBuffer());
  const zipB = await JSZip.loadAsync(bufB);
  const docXmlB = await zipB.file('word/document.xml').async('text');
  console.log('Status:', resB.status, 'Total Pages:', resB.headers.get('X-Total-Pages'));
  console.log('Contains Page 1 and Page 2 content:', docXmlB.includes('Page One Hello') && docXmlB.includes('Page Two World') ? 'PASS ✓' : 'FAIL ✗');

  // --- TEST C: Table Extraction ---
  console.log('\n--- Test C: Table Extraction to Word Table ---');
  const formC = new FormData();
  formC.append('file', new Blob([pdfBytes3], { type: 'application/pdf' }), 'metrics.pdf');
  const resC = await fetch('http://localhost:3000/api/pdf/to-word', { method: 'POST', body: formC });
  const bufC = Buffer.from(await resC.arrayBuffer());
  const zipC = await JSZip.loadAsync(bufC);
  const docXmlC = await zipC.file('word/document.xml').async('text');
  console.log('Status:', resC.status);
  console.log('Contains OpenXML Table (<w:tbl>):', docXmlC.includes('<w:tbl') ? 'PASS ✓' : 'FAIL ✗');
  console.log('Contains table cell data:', docXmlC.includes('99.99%') ? 'PASS ✓' : 'FAIL ✗');

  // --- TEST D: Embedded Image Extraction ---
  console.log('\n--- Test D: Embedded Image in Word Document ---');
  const formD = new FormData();
  formD.append('file', new Blob([pdfBytes4], { type: 'application/pdf' }), 'with-image.pdf');
  const resD = await fetch('http://localhost:3000/api/pdf/to-word', { method: 'POST', body: formD });
  const bufD = Buffer.from(await resD.arrayBuffer());
  const zipD = await JSZip.loadAsync(bufD);
  const mediaFiles = Object.keys(zipD.files).filter(f => f.startsWith('word/media/'));
  console.log('Status:', resD.status, 'Embedded Media Files in DOCX:', mediaFiles);
  console.log('Image preserved in DOCX package:', mediaFiles.length > 0 ? 'PASS ✓' : 'FAIL ✗');

  // --- TEST E: Scanned / Image-only PDF Notice ---
  console.log('\n--- Test E: Scanned / Blank PDF Detection ---');
  const formE = new FormData();
  formE.append('file', new Blob([pdfBytes5], { type: 'application/pdf' }), 'scanned.pdf');
  const resE = await fetch('http://localhost:3000/api/pdf/to-word', { method: 'POST', body: formE });
  console.log('Status:', resE.status, 'X-Scanned-Pdf header:', resE.headers.get('X-Scanned-Pdf'));
  const bufE = Buffer.from(await resE.arrayBuffer());
  const zipE = await JSZip.loadAsync(bufE);
  const docXmlE = await zipE.file('word/document.xml').async('text');
  console.log('Contains Scanned/OCR notice:', docXmlE.includes('scanned PDF') || docXmlE.includes('OCR') ? 'PASS ✓' : 'FAIL ✗');

  // --- TEST F: Error Handlers (Non-PDF & Multiple Files) ---
  console.log('\n--- Test F: Error Handling ---');
  const formF1 = new FormData();
  formF1.append('file', new Blob(['fake content'], { type: 'application/pdf' }), 'fake.pdf');
  const resF1 = await fetch('http://localhost:3000/api/pdf/to-word', { method: 'POST', body: formF1 });
  console.log('Non-PDF rejection (expect 400):', resF1.status, await resF1.json());

  const formF2 = new FormData();
  formF2.append('file', new Blob([pdfBytes1], { type: 'application/pdf' }), 'f1.pdf');
  formF2.append('file', new Blob([pdfBytes1], { type: 'application/pdf' }), 'f2.pdf');
  const resF2 = await fetch('http://localhost:3000/api/pdf/to-word', { method: 'POST', body: formF2 });
  console.log('Multiple files rejection (expect 400):', resF2.status, await resF2.json());
}

runTests().catch(err => console.error('Tests failed:', err));
