import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://filenova.app"),
  title: "FileNova — Powerful File Tools. Smarter with AI.",
  description:
    "FileNova helps you manage, convert, compress, and work with documents using AI-powered file tools.",
  keywords: [
    "PDF tools",
    "AI document assistant",
    "Chat with PDF",
    "PDF summarizer",
    "Smart OCR",
    "Document translator",
    "AI writing assistant",
    "Invoice extractor",
    "Document Q&A",
    "Merge PDF",
    "Split PDF",
    "Compress PDF",
    "PDF to JPG",
    "JPG to PDF",
    "PDF to Word",
    "PDF to Excel",
  ],
  authors: [{ name: "FileNova" }],
  creator: "FileNova",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://filenova.app",
    siteName: "FileNova",
    title: "FileNova — Powerful File Tools. Smarter with AI.",
    description:
      "FileNova helps you manage, convert, compress, and work with documents using AI-powered file tools.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FileNova — Powerful File Tools. Smarter with AI.",
    description:
      "FileNova helps you manage, convert, compress, and work with documents using AI-powered file tools.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
