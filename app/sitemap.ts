import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://filenova.app";
  const lastModified = new Date();

  const routes = [
    "",
    "/tools/merge-pdf",
    "/tools/split-pdf",
    "/tools/compress-pdf",
    "/tools/pdf-to-jpg",
    "/tools/jpg-to-pdf",
    "/tools/pdf-to-word",
    "/tools/pdf-to-excel",
    "/ai/chat-with-pdf",
    "/ai/pdf-summarizer",
    "/ai/smart-ocr",
    "/ai/document-translator",
    "/ai/writing-assistant",
    "/ai/invoice-extractor",
    "/ai/document-qa",
    "/login",
    "/signup",
  ];

  return routes.map((route) => {
    let priority = 0.8;
    if (route === "") priority = 1.0;
    else if (route.startsWith("/ai/")) priority = 0.9;

    return {
      url: `${baseUrl}${route}`,
      lastModified,
      changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
      priority,
    };
  });
}
