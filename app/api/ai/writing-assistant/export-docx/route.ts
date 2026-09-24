import { NextResponse, type NextRequest } from "next/server";
import { buildWritingDocx, isValidMode, isValidTone } from "@/lib/ai/writing-assistant";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outputText, mode, tone, filename } = body;

    if (!outputText || typeof outputText !== "string" || !outputText.trim()) {
      return NextResponse.json(
        { error: "Missing or empty outputText." },
        { status: 400 }
      );
    }

    if (!mode || !isValidMode(mode)) {
      return NextResponse.json(
        { error: "Invalid or missing mode." },
        { status: 400 }
      );
    }

    if (!tone || !isValidTone(tone)) {
      return NextResponse.json(
        { error: "Invalid or missing tone." },
        { status: 400 }
      );
    }

    const title =
      typeof filename === "string" && filename.trim()
        ? filename.replace(/\.[^.]+$/, "")
        : "Writing Assistant Output";

    const docxBuffer = await buildWritingDocx(title, outputText, mode, tone);

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    return new NextResponse(docxBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slug}-${mode}.docx"`,
        "Content-Length": docxBuffer.byteLength.toString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[writing-assistant/export-docx]", message);
    return NextResponse.json(
      { error: `Export failed: ${message}` },
      { status: 500 }
    );
  }
}
