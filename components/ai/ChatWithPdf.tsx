"use client";

import { useState, useRef, useEffect, type SVGProps, type KeyboardEvent } from "react";
import { FileUpload } from "@/components/file-upload";
import { formatFileSize, type FileValidationError } from "@/lib/validations/file-validation";
import { Button } from "@/components/ui/Button";
import { ChatIcon } from "@/components/icons";

interface UploadedDocMeta {
  documentId: string;
  filename: string;
  fileSize: number;
  totalPages: number;
  totalWords: number;
  chunkCount: number;
  isScanned: boolean;
  warning?: string;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: number[];
}

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

export function ChatWithPdf() {
  const [docMeta, setDocMeta] = useState<UploadedDocMeta | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const msgCounterRef = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAnswering]);

  const handleFilesChange = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ai/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to process PDF file.");
        setIsUploading(false);
        return;
      }

      setDocMeta(data);
      setMessages([
        {
          id: `welcome_${msgCounterRef.current++}`,
          role: "assistant",
          content: `I've indexed **${file.name}** (${data.totalPages} ${data.totalPages === 1 ? "page" : "pages"}, ${data.totalWords.toLocaleString()} words). What would you like to know about this document?`,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error uploading PDF.";
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleValidationErrors = (errors: FileValidationError[]) => {
    if (errors.length > 0) {
      setErrorMessage(errors[0].message);
    }
  };

  const handleAskQuestion = async (questionText?: string) => {
    const textToSend = (questionText || inputQuestion).trim();
    if (!textToSend || !docMeta || isAnswering) return;

    const userMessage: MessageItem = {
      id: `user_${msgCounterRef.current++}`,
      role: "user",
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuestion("");
    setIsAnswering(true);
    setErrorMessage(null);

    // Prepare conversation history
    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch("/api/ai/chat-with-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docMeta.documentId,
          question: textToSend,
          history: historyPayload,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorText = result.error || "Sorry, I couldn't process that question. Please try again.";
        setErrorMessage(errorText);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant_err_${msgCounterRef.current++}`,
            role: "assistant",
            content: `⚠️ ${errorText}`,
          },
        ]);
        return;
      }

      const assistantMessage: MessageItem = {
        id: `assistant_${msgCounterRef.current++}`,
        role: "assistant",
        content: result.answer,
        sources: result.sources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error connecting to AI service.";
      setErrorMessage(msg);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const handleStartOver = () => {
    setDocMeta(null);
    setMessages([]);
    setInputQuestion("");
    setErrorMessage(null);
  };

  const handleClearChat = () => {
    if (!docMeta) return;
    setMessages([
      {
        id: `welcome_reset_${msgCounterRef.current++}`,
        role: "assistant",
        content: `Chat history cleared. What would you like to ask about **${docMeta.filename}**?`,
      },
    ]);
  };

  const suggestedPrompts = [
    "Summarize the key points of this document.",
    "What are the main conclusions or findings?",
    "List important figures, metrics, or dates mentioned.",
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-900 shadow-xs sm:text-sm"
        >
          <AlertIcon className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-950">Notice</p>
            <p className="mt-0.5 leading-relaxed text-red-800">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 hover:text-red-900 focus-ring"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Dropzone (When no document is active) */}
      {!docMeta ? (
        <div className="rounded-3xl border border-line/90 bg-card/60 p-5 shadow-xs sm:p-7">
          <FileUpload
            title="Drop your PDF to start chatting, or browse"
            description="Upload 1 PDF document (up to 50 MB). FileNova extracts its text, indexes chunks, and prepares it for question answering."
            accept={["application/pdf", ".pdf"]}
            maxSize={MAX_FILE_SIZE}
            maxFiles={1}
            multiple={false}
            onFilesChange={handleFilesChange}
            onError={handleValidationErrors}
            disabled={isUploading}
            isProcessing={isUploading}
            processingMessage="Reading and indexing your PDF..."
            showPreview={false}
          />
        </div>
      ) : (
        /* Active Document & Chat Interface */
        <div className="space-y-6">
          {/* Document Overview Bar */}
          <div className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 shadow-xs">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                <ChatIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold tracking-tight text-ink sm:text-base" title={docMeta.filename}>
                  {docMeta.filename}
                </h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate">
                  <span>{formatFileSize(docMeta.fileSize)}</span>
                  <span aria-hidden="true" className="text-line">•</span>
                  <span className="font-medium text-ink">
                    {docMeta.totalPages} {docMeta.totalPages === 1 ? "page" : "pages"}
                  </span>
                  <span aria-hidden="true" className="text-line">•</span>
                  <span>{docMeta.totalWords.toLocaleString()} words</span>
                  <span aria-hidden="true" className="text-line">•</span>
                  <span className="text-ember font-medium">{docMeta.chunkCount} chunks indexed</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation messages"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-slate hover:bg-ink/5 hover:text-ink focus-ring"
              >
                <TrashIcon className="size-3.5" />
                Clear Chat
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-ink/30 hover:bg-white focus-ring"
              >
                <RefreshIcon className="size-3.5" />
                Upload New PDF
              </button>
            </div>
          </div>

          {/* Scanned PDF Notice */}
          {docMeta.isScanned && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 shadow-2xs">
              <p className="font-semibold text-amber-900">⚠️ Scanned PDF Notice</p>
              <p className="mt-1 leading-relaxed text-amber-800">
                This PDF appears to contain little or no searchable text. Smart OCR will be required to chat reliably with this document.
              </p>
            </div>
          )}

          {/* Chat Window */}
          <div className="flex flex-col rounded-3xl border border-line bg-card shadow-sm overflow-hidden">
            {/* Messages Area */}
            <div className="h-[460px] overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs leading-relaxed sm:text-sm ${
                        isUser
                          ? "bg-ember text-white rounded-br-xs shadow-xs"
                          : "bg-background/90 text-ink border border-line rounded-bl-xs shadow-2xs"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>

                      {/* Source Page References */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-line/60 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate">
                          <span className="font-semibold text-ink">
                            {message.sources.length === 1 ? "Source:" : "Sources:"}
                          </span>
                          {message.sources.map((page) => (
                            <span
                              key={page}
                              className="inline-flex items-center rounded-md bg-ember/10 px-2 py-0.5 font-semibold text-ember border border-ember/20"
                            >
                              Page {page}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isAnswering && (
                <div className="flex items-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-line bg-background/90 px-4 py-3 text-xs text-slate shadow-2xs">
                    <SpinnerIcon className="size-3.5 animate-spin text-ember" />
                    <span>Searching document &amp; formulating answer...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts (when only welcome message is shown) */}
            {messages.length <= 1 && !isAnswering && !docMeta.isScanned && (
              <div className="px-4 pb-3 sm:px-6">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate block mb-2">
                  Suggested Questions
                </span>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleAskQuestion(prompt)}
                      className="rounded-full border border-line bg-background/80 px-3.5 py-1.5 text-xs text-ink transition-colors hover:border-ember/40 hover:bg-ember/5 focus-ring"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Box Footer */}
            <div className="border-t border-line bg-card/70 p-3 sm:p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion();
                }}
                className="flex items-end gap-2"
              >
                <div className="relative flex-1">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isAnswering || docMeta.isScanned}
                    placeholder={
                      docMeta.isScanned
                        ? "Document contains no searchable text (Smart OCR required)"
                        : "Ask a question about this document (Enter to send)..."
                    }
                    className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-xs text-ink placeholder:text-slate focus-ring sm:text-sm disabled:opacity-60"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={!inputQuestion.trim() || isAnswering || docMeta.isScanned}
                  className="rounded-2xl px-4 py-3 shrink-0"
                  aria-label="Send question"
                >
                  {isAnswering ? (
                    <SpinnerIcon className="size-4 animate-spin" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                </Button>
              </form>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate px-1">
                <span>Shift + Enter for new line</span>
                <span>Contextual retrieval ensures answers are grounded in your PDF</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
