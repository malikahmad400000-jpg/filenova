import { HomePage } from "@/components/home/HomePage";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://filenova.app";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      "url": baseUrl,
      "name": "FileNova",
      "description": "Powerful file tools. Smarter with AI.",
      "publisher": {
        "@type": "Organization",
        "name": "FileNova",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${baseUrl}/#application`,
      "name": "FileNova",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "featureList": [
        "Chat with PDF",
        "AI PDF Summarizer",
        "Smart OCR",
        "Document Translator",
        "AI Writing Assistant",
        "AI Invoice Extractor",
        "Document Q&A",
        "Merge PDF",
        "Split PDF",
        "Compress PDF",
        "PDF to JPG",
        "JPG to PDF",
        "PDF to Word",
        "PDF to Excel",
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePage />
    </>
  );
}
