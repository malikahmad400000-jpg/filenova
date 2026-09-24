import { GoogleGenAI } from "@google/genai";
import type { AICompletionOptions } from "./provider";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Executes a text completion request using the Google Gemini Gen AI SDK.
 * Never leaks API keys, stack traces, or internal configuration in error messages.
 */
export async function callGemini(
  options: AICompletionOptions,
  apiKey: string,
  modelName: string = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const config: {
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  } = {};

  if (options.systemPrompt) {
    config.systemInstruction = options.systemPrompt;
  }
  if (options.temperature !== undefined) {
    config.temperature = options.temperature;
  }
  if (options.maxTokens !== undefined) {
    config.maxOutputTokens = options.maxTokens;
  }
  if (options.responseFormat === "json") {
    config.responseMimeType = "application/json";
  }

  // Format contents from messages or prompt
  let contents: string | Array<{ role: string; parts: { text: string }[] }>;
  if (options.messages && options.messages.length > 0) {
    const nonSystem = options.messages.filter((m) => {
      if (m.role === "system") {
        config.systemInstruction = config.systemInstruction
          ? `${config.systemInstruction}\n\n${m.content}`
          : m.content;
        return false;
      }
      return true;
    });

    contents = nonSystem.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  } else {
    contents = options.prompt || "";
  }

  const timeoutMs = options.timeoutMs || 60000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, timeoutMs);
  });

  try {
    const apiCallPromise = ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    const response = await Promise.race([apiCallPromise, timeoutPromise]);
    return response.text?.trim() || "";
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    const lower = rawMessage.toLowerCase();

    if (
      rawMessage === "TIMEOUT" ||
      lower.includes("timeout") ||
      lower.includes("timed out") ||
      lower.includes("aborted")
    ) {
      throw new Error("AI service request timed out. Please try again.");
    }

    if (
      lower.includes("api_key_invalid") ||
      lower.includes("401") ||
      lower.includes("403") ||
      lower.includes("credentials") ||
      lower.includes("permission_denied")
    ) {
      throw new Error("Invalid AI credentials. Please check your GEMINI_API_KEY.");
    }

    if (
      lower.includes("resource_exhausted") ||
      lower.includes("429") ||
      lower.includes("quota") ||
      lower.includes("rate limit")
    ) {
      throw new Error("AI service rate limit exceeded. Please wait a moment and try again.");
    }

    // Sanitize any potential key occurrences in error message
    const sanitized = rawMessage.replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED]");
    throw new Error(`AI processing failed: ${sanitized}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
