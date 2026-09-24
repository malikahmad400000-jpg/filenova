const { createWorker } = require("tesseract.js");
const sharp = require("sharp");

async function testTesseract() {
  console.log("Creating test image...");
  // Create an image with text "INVOICE 12345"
  const svg = `<svg width="400" height="100">
    <rect width="100%" height="100%" fill="white"/>
    <text x="20" y="60" font-family="Arial" font-size="40" fill="black">INVOICE 12345</text>
  </svg>`;
  const imgBuf = await sharp(Buffer.from(svg)).png().toBuffer();

  console.log("Initializing worker...");
  const worker = await createWorker("eng");
  console.log("Recognizing text...");
  const ret = await worker.recognize(imgBuf);
  console.log("Text:", JSON.stringify(ret.data.text.trim()));
  console.log("Confidence:", ret.data.confidence);
  await worker.terminate();
  console.log("Worker terminated successfully.");
}

testTesseract().catch(err => {
  console.error("Error testing tesseract:", err);
  process.exit(1);
});
