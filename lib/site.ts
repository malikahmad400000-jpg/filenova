import type { ComponentType, SVGProps } from "react";
import {
  ChatIcon,
  CompressIcon,
  ExcelIcon,
  ExtractIcon,
  ImageToPdfIcon,
  JpgIcon,
  MergeIcon,
  OcrIcon,
  QaIcon,
  SplitIcon,
  SummarizeIcon,
  TranslateIcon,
  WordIcon,
  WritingIcon,
} from "@/components/icons";

export type ToolItem = {
  name: string;
  description: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const pdfTools: ToolItem[] = [
  {
    name: "Merge PDF",
    description: "Combine multiple PDFs into a single, tidy file in seconds.",
    href: "/tools/merge-pdf",
    icon: MergeIcon,
  },
  {
    name: "Split PDF",
    description: "Extract pages or divide a document into smaller files.",
    href: "/tools/split-pdf",
    icon: SplitIcon,
  },
  {
    name: "Compress PDF",
    description: "Shrink file size while keeping text and images readable.",
    href: "/tools/compress-pdf",
    icon: CompressIcon,
  },
  {
    name: "PDF to JPG",
    description: "Turn PDF pages into crisp images for sharing or slides.",
    href: "/tools/pdf-to-jpg",
    icon: JpgIcon,
  },
  {
    name: "JPG to PDF",
    description: "Assemble photos and scans into a polished PDF document.",
    href: "/tools/jpg-to-pdf",
    icon: ImageToPdfIcon,
  },
  {
    name: "PDF to Word",
    description: "Convert layouts into editable Word files you can refine.",
    href: "/tools/pdf-to-word",
    icon: WordIcon,
  },
  {
    name: "PDF to Excel",
    description: "Pull tables into spreadsheets ready for analysis.",
    href: "/tools/pdf-to-excel",
    icon: ExcelIcon,
  },
];

export const aiTools: ToolItem[] = [
  {
    name: "Chat with PDF",
    description: "Ask questions and get answers grounded in your document.",
    href: "/ai/chat-with-pdf",
    icon: ChatIcon,
  },
  {
    name: "AI PDF Summarizer",
    description: "Turn long reports into concise briefs you can scan fast.",
    href: "/ai/pdf-summarizer",
    icon: SummarizeIcon,
  },
  {
    name: "Smart OCR",
    description: "Recover searchable text from scans, photos, and faxes.",
    href: "/ai/smart-ocr",
    icon: OcrIcon,
  },
  {
    name: "Document Translator",
    description: "Translate full documents while preserving structure.",
    href: "/ai/document-translator",
    icon: TranslateIcon,
  },
  {
    name: "AI Writing Assistant",
    description: "Improve, rewrite, summarize, or reformat your documents with AI.",
    href: "/ai/writing-assistant",
    icon: WritingIcon,
  },
  {
    name: "AI Invoice Extractor",
    description: "Capture totals, vendors, and line items automatically.",
    href: "/ai/invoice-extractor",
    icon: ExtractIcon,
  },
  {
    name: "Document Q&A",
    description: "Search across files and surface cited answers instantly.",
    href: "/ai/document-qa",
    icon: QaIcon,
  },
];

export const howItWorks = [
  {
    step: "01",
    title: "Upload your file",
    description: "Drop a PDF or image. We keep processing local to your session.",
  },
  {
    step: "02",
    title: "Choose a tool",
    description: "Pick a converter, compressor, or AI assistant for the job.",
  },
  {
    step: "03",
    title: "Download your result",
    description: "Get a clean file back — ready to send, archive, or edit.",
  },
];
