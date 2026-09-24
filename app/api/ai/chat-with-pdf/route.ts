import { NextResponse, type NextRequest } from "next/server";
import { documentStore } from "@/lib/ai/doc-store";
import { retrieveRelevantChunks } from "@/lib/ai/retrieval";
import { generateAnswer, MissingApiKeyError } from "@/lib/ai/provider";
import { extractTextFromPdf, hasPdfMagicBytes } from "@/lib/ai/pdf-text-extractor";
import { chunkPages } from "@/lib/ai/chunker";

export const runtime = "nodejs";

const MAX_QUESTION_LENGTH = 1000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // 1. Support direct Multipart upload + question for convenience
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const question = formData.get("question")?.toString()?.trim() || "";

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: "No PDF file provided. Please upload a PDF document." },
          { status: 400 }
        );
      }

      if (!question) {
        return NextResponse.json(
          { error: "Question cannot be empty. Please provide a question about the document." },
          { status: 400 }
        );
      }

      if (question.length > MAX_QUESTION_LENGTH) {
        return NextResponse.json(
          { error: `Question is too long (maximum ${MAX_QUESTION_LENGTH} characters).` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the maximum allowed size of 50 MB.` },
          { status: 413 }
        );
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!hasPdfMagicBytes(bytes)) {
        return NextResponse.json(
          { error: `File "${file.name}" is not a valid PDF document (header signature mismatch).` },
          { status: 400 }
        );
      }

      const extracted = await extractTextFromPdf(bytes);
      if (extracted.isScanned) {
        return NextResponse.json(
          {
            error:
              "This PDF appears to be scanned or image-based with no searchable text. Smart OCR is required to chat with this document.",
          },
          { status: 422 }
        );
      }

      const chunks = chunkPages(extracted.pages);
      const documentId = crypto.randomUUID();
      const storedDoc = await documentStore.saveDocument({
        documentId,
        filename: file.name,
        fileSize: file.size,
        totalPages: extracted.totalPages,
        totalWords: extracted.totalWords,
        isScanned: extracted.isScanned,
        chunks,
      });

      const relevantChunks = retrieveRelevantChunks(storedDoc, question, 4);

      try {
        const result = await generateAnswer({
          question,
          contextChunks: relevantChunks,
        });

        return NextResponse.json({
          documentId,
          answer: result.answer,
          sources: result.sources,
          chunkCount: result.chunkCount,
        });
      } catch (aiErr) {
        if (aiErr instanceof MissingApiKeyError) {
          return NextResponse.json({ error: aiErr.message }, { status: 503 });
        }
        const msg = aiErr instanceof Error ? aiErr.message : "AI service error";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }

    // 2. Standard JSON Payload: { documentId, question, history }
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Invalid content type. Expected application/json or multipart/form-data." },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON in request body." },
        { status: 400 }
      );
    }

    const { documentId, question, history } = body || {};

    if (!documentId || typeof documentId !== "string") {
      return NextResponse.json(
        { error: "A valid documentId is required to chat with the document." },
        { status: 400 }
      );
    }

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "Question cannot be empty. Please ask a question about your document." },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        { error: `Question is too long (maximum ${MAX_QUESTION_LENGTH} characters).` },
        { status: 400 }
      );
    }

    // Fetch document from session store
    const doc = await documentStore.getDocument(documentId);
    if (!doc) {
      return NextResponse.json(
        {
          error:
            "Document session expired or not found. Please upload your PDF document again.",
        },
        { status: 404 }
      );
    }

    if (doc.isScanned) {
      return NextResponse.json(
        {
          error:
            "This PDF appears to be scanned or image-based with no searchable text. Smart OCR is required to chat with this document.",
        },
        { status: 422 }
      );
    }

    // Retrieve the most relevant chunks (top 4)
    const relevantChunks = retrieveRelevantChunks(doc, trimmedQuestion, 4);

    try {
      const result = await generateAnswer({
        question: trimmedQuestion,
        contextChunks: relevantChunks,
        history: Array.isArray(history) ? history : [],
      });

      return NextResponse.json({
        answer: result.answer,
        sources: result.sources,
        chunkCount: result.chunkCount,
      });
    } catch (aiErr) {
      if (aiErr instanceof MissingApiKeyError) {
        return NextResponse.json({ error: aiErr.message }, { status: 503 });
      }
      const msg = aiErr instanceof Error ? aiErr.message : "AI service error";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: `An unexpected error occurred while processing your question: ${message}` },
      { status: 500 }
    );
  }
}
