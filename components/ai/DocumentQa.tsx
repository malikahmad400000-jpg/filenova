"use client";

import { useState, useRef, useEffect, type SVGProps, type KeyboardEvent } from "react";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { Button } from "@/components/ui/Button";
import { QaIcon } from "@/components/icons";

interface UploadedDocMeta {
  documentId: string;
  filename: string;
  fileSize: number;
  totalPages: number;
  totalWords: number;
  chunkCount: number;
  isScanned?: boolean;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: number[];
  chunkCount?: number;
}

type UiStage = "upload" | "ready" | "answering";

function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M2.5 10 17.5 2.5 10 17.5l-2.5-5zM10 12.5l7.5-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M3.5 10a6.5 6.5 0 1 1 1.9 4.6M3.5 15v-5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M3.5 5.5h13M7.5 5.5v-2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M5.5 5.5v10a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M10 2.5 1.5 17.5h17L10 2.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 7.5v4.5M10 14.5h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpinnerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="opacity-25"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M4 10l5 5 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileDocIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M4 4a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M12 2v4a1 1 0 0 0 1 1h4M7 10h6M7 13h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SUGGESTED_QUESTIONS = [
  "What is the executive summary of this document?",
  "What are the main key points or findings?",
  "Are there specific action items, deadlines, or dates mentioned?",
  "What are the key conclusions or takeaways?",
];

export function DocumentQa() {
  const [stage, setStage] = useState<UiStage>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [docMeta, setDocMeta] = useState<UploadedDocMeta | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [question, setQuestion] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (stage === "ready" || stage === "answering") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, stage]);

  const handleFilesChange = (files: File[]) => {
    setFileError(null);
    setUploadError(null);
    if (files.length > 0) {
      setSelectedFile(files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleFileError = (errors: FileValidationError[]) => {
    if (errors.length > 0) {
      setFileError(errors[0].message);
      setSelectedFile(null);
    }
  };

  const handleUploadAndIndex = async () => {
    if (!selectedFile) return;

    setUploadLoading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/ai/document-qa", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process document.");
      }

      setDocMeta({
        documentId: data.documentId,
        filename: data.filename || selectedFile.name,
        fileSize: data.fileSize || selectedFile.size,
        totalPages: data.totalPages || 1,
        totalWords: data.totalWords || 0,
        chunkCount: data.chunkCount || 0,
        isScanned: data.isScanned,
      });

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hello! I've indexed **${selectedFile.name}** (${data.totalPages} page${data.totalPages === 1 ? "" : "s"}, ${data.chunkCount || "multiple"} sections). Ask me anything about this document, and I'll find the answers with exact citations.`,
        },
      ]);

      setStage("ready");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Document upload failed.";
      setUploadError(msg);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAskQuestion = async (questionText?: string) => {
    const q = (questionText ?? question).trim();
    if (!q || !docMeta || askLoading) return;

    setAskError(null);
    setQuestion("");
    setAskLoading(true);
    setStage("answering");

    const userMsgId = `user_${Date.now()}`;
    const newMessages: MessageItem[] = [
      ...messages,
      { id: userMsgId, role: "user", content: q },
    ];
    setMessages(newMessages);

    // Build chat history context (last 6 messages)
    const historyPayload = newMessages
      .filter((m) => m.id !== "welcome")
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai/document-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docMeta.documentId,
          question: q,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate answer.");
      }

      const assistantMsgId = `assistant_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: data.answer || "I could not find information about this in the provided document.",
          sources: data.sources || [],
          chunkCount: data.chunkCount,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not retrieve answer.";
      setAskError(msg);
    } finally {
      setAskLoading(false);
      setStage("ready");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const copyMessageContent = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleResetDocument = () => {
    setStage("upload");
    setSelectedFile(null);
    setFileError(null);
    setUploadError(null);
    setDocMeta(null);
    setMessages([]);
    setQuestion("");
    setAskError(null);
  };

  const clearChatHistory = () => {
    if (!docMeta) return;
    setMessages([
      {
        id: "welcome_cleared",
        role: "assistant",
        content: `Chat history cleared. You can ask fresh questions about **${docMeta.filename}**.`,
      },
    ]);
  };

  return (
    <div className="w-full">
      {/* ─── STAGE 1: Upload & Indexing ────────────────────────────────────────── */}
      {stage === "upload" && (
        <div className="rounded-3xl border border-line bg-card p-6 sm:p-8 shadow-sm">
          <FileUpload
            accept={[
              "application/pdf",
              ".pdf",
              "image/jpeg",
              ".jpg",
              ".jpeg",
              "image/png",
              ".png",
            ]}
            title="Upload your document or image"
            description="Supports digital & scanned PDFs, JPG, and PNG documents up to 25 MB"
            onFilesChange={handleFilesChange}
            onError={handleFileError}
          />

          {fileError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              <AlertIcon className="size-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              <div className="flex items-center gap-2.5">
                <AlertIcon className="size-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleUploadAndIndex}
                className="shrink-0 text-xs py-1 px-3"
              >
                Retry
              </Button>
            </div>
          )}

          {selectedFile && (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                  <FileDocIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{selectedFile.name}</p>
                  <p className="text-xs text-slate">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploadLoading}
                  className="text-xs"
                >
                  Remove
                </Button>
                <Button
                  type="button"
                  onClick={handleUploadAndIndex}
                  disabled={uploadLoading}
                  className="gap-2 bg-ember text-white hover:bg-ember-deep"
                >
                  {uploadLoading ? (
                    <>
                      <SpinnerIcon className="size-4 animate-spin" />
                      <span>Indexing document...</span>
                    </>
                  ) : (
                    <>
                      <QaIcon className="size-4" />
                      <span>Start Q&A</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STAGE 2 & 3: Interactive Q&A Session ─────────────────────────────── */}
      {(stage === "ready" || stage === "answering") && docMeta && (
        <div className="flex flex-col gap-4">
          {/* Active Document Header Card */}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                <FileDocIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-ink">{docMeta.filename}</p>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-slate">
                  {docMeta.totalPages} {docMeta.totalPages === 1 ? "page" : "pages"} &bull;{" "}
                  {docMeta.totalWords.toLocaleString()} words &bull;{" "}
                  {formatFileSize(docMeta.fileSize)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                onClick={clearChatHistory}
                title="Clear chat messages"
                className="gap-1.5 text-xs text-slate hover:text-ink py-1 px-3"
              >
                <TrashIcon className="size-3.5" />
                <span>Clear</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleResetDocument}
                className="gap-1.5 text-xs py-1 px-3"
              >
                <RefreshIcon className="size-3.5" />
                <span>New Document</span>
              </Button>
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="flex min-h-[380px] max-h-[560px] flex-col overflow-y-auto rounded-3xl border border-line bg-card/60 p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed sm:max-w-[75%] ${
                      msg.role === "user"
                        ? "bg-ember text-white shadow-sm"
                        : "border border-line bg-background text-ink shadow-xs"
                    }`}
                  >
                    {/* Message Body */}
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Citations & Sources */}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2.5 text-xs">
                        <span className="font-semibold text-slate">Sources:</span>
                        {msg.sources.map((page) => (
                          <span
                            key={page}
                            className="inline-flex items-center rounded-md border border-ember/20 bg-ember/10 px-2 py-0.5 text-[11px] font-semibold text-ember"
                          >
                            Page {page}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Copy Button for Assistant answers */}
                    {msg.role === "assistant" && msg.id !== "welcome" && (
                      <div className="mt-2.5 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => copyMessageContent(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate hover:text-ink transition-colors"
                          title="Copy answer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <CheckIcon className="size-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <CopyIcon className="size-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Generating Answer Loading Bubble */}
              {askLoading && (
                <div className="flex items-start">
                  <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-background p-4 text-xs text-slate shadow-xs">
                    <SpinnerIcon className="size-4 animate-spin text-ember" />
                    <span>Searching document context and generating answer...</span>
                  </div>
                </div>
              )}

              {/* Ask Error Banner */}
              {askError && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                  <div className="flex items-center gap-2">
                    <AlertIcon className="size-4 shrink-0" />
                    <span>{askError}</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
                      if (lastUserMsg) {
                        handleAskQuestion(lastUserMsg.content);
                      }
                    }}
                    className="shrink-0 text-xs py-1 px-3"
                  >
                    Retry
                  </Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Starter Questions (show if only welcome message) */}
          {messages.length <= 1 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate">
                Suggested Questions:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((qText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={askLoading}
                    onClick={() => handleAskQuestion(qText)}
                    className="rounded-full border border-line bg-card/80 px-3 py-1.5 text-xs text-ink transition-colors hover:border-ember/40 hover:bg-ember/5 text-left disabled:opacity-50"
                  >
                    {qText}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question Input Form */}
          <div className="relative rounded-2xl border border-line bg-card p-3 shadow-xs focus-within:border-ember/60 transition-colors">
            <textarea
              ref={textareaRef}
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={askLoading}
              placeholder="Ask a question about this document... (Enter to send, Shift+Enter for new line)"
              maxLength={1000}
              className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-slate focus:outline-hidden disabled:opacity-60"
            />

            <div className="mt-2 flex items-center justify-between border-t border-line/40 pt-2">
              <span className="text-[11px] text-slate">
                {question.length}/1000
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => handleAskQuestion()}
                  disabled={!question.trim() || askLoading}
                  className="gap-2 bg-ember text-white hover:bg-ember-deep text-xs px-3.5 py-1.5"
                >
                  {askLoading ? (
                    <SpinnerIcon className="size-3.5 animate-spin" />
                  ) : (
                    <SendIcon className="size-3.5" />
                  )}
                  <span>Ask Question</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
