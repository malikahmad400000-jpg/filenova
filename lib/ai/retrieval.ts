import type { DocumentChunk } from "./chunker";
import type { StoredDocument } from "./doc-store";

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
  "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
  "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
  "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
  "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
  "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
  "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
  "yourself", "yourselves",
]);

/**
 * Tokenizes text into lowercase normalized words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Retrieves the most relevant chunks from a document for a user question.
 * Uses BM25-style term weighting and phrase proximity scoring.
 */
export function retrieveRelevantChunks(
  document: StoredDocument,
  query: string,
  topK = 4
): DocumentChunk[] {
  const chunks = document.chunks;
  if (!chunks || chunks.length === 0) return [];
  if (chunks.length <= topK) return chunks;

  const queryTerms = tokenize(query);
  const cleanQuery = query.toLowerCase().trim();

  // If query consists only of stopwords, take top chunks from beginning
  if (queryTerms.length === 0) {
    return chunks.slice(0, topK);
  }

  // Calculate Document Frequency for each query term across all chunks
  const docFrequency = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const chunk of chunks) {
      if (chunk.text.toLowerCase().includes(term)) {
        count++;
      }
    }
    docFrequency.set(term, count);
  }

  const N = chunks.length;

  // Score each chunk
  const scoredChunks: { chunk: DocumentChunk; score: number }[] = [];

  for (const chunk of chunks) {
    const chunkLower = chunk.text.toLowerCase();
    let score = 0;

    // 1. Exact full query phrase match bonus
    if (cleanQuery.length > 5 && chunkLower.includes(cleanQuery)) {
      score += 15.0;
    }

    // 2. Term TF-IDF scoring
    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${term}\\b`, "gi");
      const matches = chunkLower.match(regex);
      const tf = matches ? matches.length : 0;

      if (tf > 0) {
        const df = docFrequency.get(term) || 1;
        // Standard smooth IDF
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
        score += tf * (idf + 1.0);
      }
    }

    scoredChunks.push({ chunk, score });
  }

  // Sort descending by relevance score
  scoredChunks.sort((a, b) => b.score - a.score);

  // If top scores are positive, take the topK with positive score
  const positiveMatches = scoredChunks.filter((item) => item.score > 0);

  if (positiveMatches.length > 0) {
    return positiveMatches.slice(0, topK).map((item) => item.chunk);
  }

  // If no term matched, fall back to initial document overview chunks
  return chunks.slice(0, topK);
}
