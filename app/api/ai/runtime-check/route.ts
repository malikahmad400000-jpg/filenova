import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    build: "64c357a",
    node: process.version,
    provider: process.env.AI_PROVIDER || "(unset)",
    geminiKeyPresent: Boolean(process.env.GEMINI_API_KEY?.trim()),
    geminiKeyLength: process.env.GEMINI_API_KEY?.trim()?.length ?? 0,
    geminiModel: process.env.GEMINI_MODEL || "(unset)",
  });
}