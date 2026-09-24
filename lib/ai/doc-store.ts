import type { DocumentChunk } from "./chunker";

export interface StoredDocument {
  documentId: string;
  filename: string;
  fileSize: number;
  totalPages: number;
  totalWords: number;
  isScanned: boolean;
  chunks: DocumentChunk[];
  createdAt: number;
}

export interface IDocumentStore {
  saveDocument(doc: Omit<StoredDocument, "createdAt">): Promise<StoredDocument>;
  getDocument(documentId: string): Promise<StoredDocument | null>;
  deleteDocument(documentId: string): Promise<boolean>;
}

const DOCUMENT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * In-memory document store for local development and session management.
 * Designed to be swapped with a Supabase pgvector store in production.
 */
class InMemoryDocumentStore implements IDocumentStore {
  private docs = new Map<string, StoredDocument>();

  constructor() {
    // Run cleanup periodically
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanupExpired(), 15 * 60 * 1000);
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, doc] of this.docs.entries()) {
      if (now - doc.createdAt > DOCUMENT_TTL_MS) {
        this.docs.delete(id);
      }
    }
  }

  async saveDocument(doc: Omit<StoredDocument, "createdAt">): Promise<StoredDocument> {
    this.cleanupExpired();
    const stored: StoredDocument = {
      ...doc,
      createdAt: Date.now(),
    };
    this.docs.set(doc.documentId, stored);
    return stored;
  }

  async getDocument(documentId: string): Promise<StoredDocument | null> {
    const doc = this.docs.get(documentId);
    if (!doc) return null;
    if (Date.now() - doc.createdAt > DOCUMENT_TTL_MS) {
      this.docs.delete(documentId);
      return null;
    }
    return doc;
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    return this.docs.delete(documentId);
  }
}

// Global singleton pattern for Next.js hot-reload persistence
const globalForStore = globalThis as unknown as {
  fileNovaDocStore?: IDocumentStore;
};

export const documentStore: IDocumentStore =
  globalForStore.fileNovaDocStore || new InMemoryDocumentStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.fileNovaDocStore = documentStore;
}
