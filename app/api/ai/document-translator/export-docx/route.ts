import { NextResponse, type NextRequest } from "next/server";
import { buildTranslatedDocx } from "@/lib/ai/translator";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title = "Translated Document", pages, targetLanguage = "en", filename = "translated" } = body;

    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: "No translated pages provided to export." },
        { status: 400 }
      );
    }

    const docxBuffer = await buildTranslatedDocx(title, pages, targetLanguage);
    const safeBase = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") || "translated";
    const downloadName = `${safeBase}_${targetLanguage}.docx`;

    return new NextResponse(docxBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": docxBuffer.byteLength.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DOCX generation error";
    return NextResponse.json(
      { error: `Failed to generate DOCX document: ${msg}` },
      { status: 500 }
    );
  }
}
