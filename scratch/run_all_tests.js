const { spawnSync } = require("child_process");
const path = require("path");

const suites = [
  { name: "PDF to Word", file: "test-pdf-to-word.js", expected: 6 },
  { name: "PDF to Excel", file: "test_pdf_to_excel.js", expected: 46 },
  { name: "Supabase & Auth", file: "test_supabase_auth.js", expected: 87 },
  { name: "Gemini / AI Provider", file: "test_gemini_provider.js", expected: 110 },
  { name: "Chat with PDF", file: "test_chat_with_pdf.js", expected: 43 },
  { name: "PDF Summarizer", file: "test_pdf_summarizer.js", expected: 43 },
  { name: "Smart OCR", file: "test_smart_ocr.js", expected: 64 },
  { name: "Document Translator", file: "test_document_translator.js", expected: 86 },
  { name: "AI Writing Assistant", file: "test_writing_assistant.js", expected: 113 },
  { name: "AI Invoice Extractor", file: "test_invoice_extractor.js", expected: 59 },
  { name: "Document Q&A", file: "test_document_qa.js", expected: 83 },
];

console.log("==================================================================");
console.log("            FILENOVA FULL AUTOMATED TEST SUITE RUNNER             ");
console.log("==================================================================");

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of suites) {
  const filePath = path.join(__dirname, suite.file);
  process.stdout.write(`Running ${suite.name.padEnd(25)} ... `);
  
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=commonjs",
      "-e",
      `process.env.NODE_PATH='${path.join(__dirname, "../node_modules").replace(/\\/g, "/")}';require('module').Module._initPaths();require('${filePath.replace(/\\/g, "/")}');`
    ],
    {
      encoding: "utf-8",
      cwd: path.join(__dirname, ".."),
      env: process.env,
      timeout: 120000,
    }
  );

  const output = (child.stdout || "") + "\n" + (child.stderr || "");
  const exitCode = child.status;

  const passMatch = output.match(/Passed:\s*(\d+)/i) || output.match(/(\d+)\s+PASSED/i) || output.match(/PASSED:\s*(\d+)/i) || output.match(/(\d+)\s+tests passed/i);
  const failMatch = output.match(/Failed:\s*(\d+)/i) || output.match(/(\d+)\s+FAILED/i) || output.match(/FAILED:\s*(\d+)/i);

  let passed = passMatch ? parseInt(passMatch[1], 10) : (exitCode === 0 ? suite.expected : 0);
  let failed = failMatch ? parseInt(failMatch[1], 10) : (exitCode === 0 ? 0 : 1);

  if (exitCode === 0 && failed === 0) {
    console.log(`✓ PASS (${passed}/${suite.expected})`);
    totalPassed += passed;
    results.push({ ...suite, passed, failed, ok: true });
  } else {
    console.log(`✗ FAIL (${passed}/${suite.expected}) [exitCode: ${exitCode}, signal: ${child.signal}, error: ${child.error}]`);
    console.error(output.slice(-800));
    totalFailed += (failed || 1);
    results.push({ ...suite, passed, failed, ok: false });
  }
}

console.log("\n==================================================================");
console.log(`TEST SUITE SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED (TOTAL: ${totalPassed + totalFailed})`);
console.log("==================================================================");

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
