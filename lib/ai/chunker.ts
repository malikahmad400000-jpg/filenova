import type { ExtractedPage } from "./pdf-text-extractor";

export interface DocumentChunk {
  id: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  tokenEstimate: number;
}

interface ChunkerOptions {
  maxChunkSize?: number; // target character length (~600)
  overlap?: number; // character overlap (~100)
}

/**
 * Splits extracted pages into semantic chunks suitable for retrieval and embedding.
 * Always preserves page numbers and avoids breaking mid-word.
 */
export function chunkPages(
  pages: ExtractedPage[],
  options: ChunkerOptions = {}
): DocumentChunk[] {
  const maxChunkSize = options.maxChunkSize || 700;
  const overlapChars = options.overlap || 100;

  const chunks: DocumentChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    // If page text is within chunk size limit, create single chunk
    if (text.length <= maxChunkSize) {
      chunks.push({
        id: `chunk_${page.pageNumber}_${globalChunkIndex}`,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        text,
        tokenEstimate: Math.ceil(text.length / 4),
      });
      continue;
    }

    // Split page text into paragraphs or sentences
    const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      const cleanPara = paragraph.trim();
      if (!cleanPara) continue;

      if ((currentChunk + " " + cleanPara).length <= maxChunkSize) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${cleanPara}` : cleanPara;
      } else {
        // If current chunk has accumulated content, push it
        if (currentChunk) {
          chunks.push({
            id: `chunk_${page.pageNumber}_${globalChunkIndex}`,
            pageNumber: page.pageNumber,
            chunkIndex: globalChunkIndex++,
            text: currentChunk,
            tokenEstimate: Math.ceil(currentChunk.length / 4),
          });

          // Create overlap from the tail of currentChunk
          const overlapTail = currentChunk.slice(-overlapChars).trim();
          currentChunk = overlapTail ? `${overlapTail} ${cleanPara}` : cleanPara;
        } else {
          // A single paragraph is larger than maxChunkSize: split by sentences
          const sentences = cleanPara.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [cleanPara];
          for (const sentence of sentences) {
            const cleanSent = sentence.trim();
            if (!cleanSent) continue;

            if ((currentChunk + " " + cleanSent).length <= maxChunkSize) {
              currentChunk = currentChunk ? `${currentChunk} ${cleanSent}` : cleanSent;
            } else {
              if (currentChunk) {
                chunks.push({
                  id: `chunk_${page.pageNumber}_${globalChunkIndex}`,
                  pageNumber: page.pageNumber,
                  chunkIndex: globalChunkIndex++,
                  text: currentChunk,
                  tokenEstimate: Math.ceil(currentChunk.length / 4),
                });
              }
              currentChunk = cleanSent;
            }
          }
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        id: `chunk_${page.pageNumber}_${globalChunkIndex}`,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        text: currentChunk.trim(),
        tokenEstimate: Math.ceil(currentChunk.length / 4),
      });
    }
  }

  return chunks;
}
