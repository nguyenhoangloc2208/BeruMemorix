/**
 * Vector Search Service for BeruMemorix
 * Handles semantic similarity search using embeddings
 */

import type { MemoryItem } from "./memory-storage.js";

export interface VectorSearchOptions {
  threshold: number; // Similarity threshold (0-1, default 0.7)
  maxResults: number; // Maximum results to return (default 10)
  includeScores: boolean; // Include similarity scores (default true)
  model: "openai" | "local" | "huggingface"; // Embedding model to use
  useCache: boolean; // Cache embeddings (default true)
}

export interface MemoryEmbedding {
  memoryId: string;
  embedding: number[]; // Vector embedding
  text: string; // Original text that was embedded
  createdAt: string;
  model: string; // Model used for embedding
}

export interface VectorSearchResult {
  memory: MemoryItem;
  similarity: number; // Similarity score (0-1)
  embedding: MemoryEmbedding;
}

export interface SemanticSearchResponse {
  success: boolean;
  query: string;
  queryEmbedding: number[];
  results: VectorSearchResult[];
  count: number;
  executionTime: number;
  model: string;
}

export class VectorSearchService {
  private embeddings = new Map<string, MemoryEmbedding>();
  private embeddingCache = new Map<string, number[]>();

  private readonly defaultOptions: VectorSearchOptions = {
    threshold: 0.7,
    maxResults: 10,
    includeScores: true,
    model: "local", // Default to local model for privacy
    useCache: true,
  };

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Generate local embeddings using simple TF-IDF-like approach
   * This is a basic implementation for when external APIs aren't available
   */
  private generateLocalEmbedding(text: string): number[] {
    // Normalize text
    const normalizedText = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = normalizedText.split(" ");
    const wordFreq = new Map<string, number>();

    // Calculate word frequencies
    for (const word of words) {
      if (word.length > 2) {
        // Ignore very short words
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Create a simple vocabulary-based embedding
    // This is a simplified approach - in production, use proper embeddings
    const vocabulary = [
      "beruMemorix",
      "memory",
      "search",
      "data",
      "storage",
      "query",
      "result",
      "javascript",
      "typescript",
      "node",
      "api",
      "server",
      "database",
      "file",
      "implementation",
      "function",
      "class",
      "method",
      "service",
      "component",
      "error",
      "success",
      "test",
      "debug",
      "log",
      "configuration",
      "setup",
      "user",
      "system",
      "application",
      "development",
      "code",
      "project",
      "fuzzy",
      "analytics",
      "optimization",
      "performance",
      "metrics",
      "vector",
      "embedding",
      "similarity",
      "semantic",
      "algorithm",
      "machine",
      "learning",
      "artificial",
      "intelligence",
      "model",
      "neural",
      "network",
      "transformer",
      "nlp",
      "processing",
    ];

    const embedding = new Array(vocabulary.length).fill(0);

    // Simple TF-IDF like scoring
    for (let i = 0; i < vocabulary.length; i++) {
      const word = vocabulary[i]?.toLowerCase();
      if (word && normalizedText.includes(word)) {
        // Simple presence-based scoring with frequency weighting
        const freq = wordFreq.get(word) || 0;
        embedding[i] = Math.log(1 + freq) / Math.log(words.length + 1);
      }
    }

    // Add some semantic features based on text characteristics
    const uppercaseMatches = text.match(/[A-Z]/g);
    const numberMatches = text.match(/\d/g);
    const specialCharMatches = text.match(/[^\w\s]/g);

    const features = [
      text.length / 1000, // Text length feature
      words.length / 100, // Word count feature
      (uppercaseMatches?.length || 0) / text.length, // Uppercase ratio
      (numberMatches?.length || 0) / text.length, // Number ratio
      (specialCharMatches?.length || 0) / text.length, // Special char ratio
    ];

    embedding.push(...features);

    // Normalize the embedding vector
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? embedding.map((val) => val / norm) : embedding;
  }

  /**
   * Generate embeddings using OpenAI API
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    // This would integrate with OpenAI API in production
    // For now, return local embedding as fallback
    console.warn("OpenAI embedding not implemented yet, using local fallback");
    return this.generateLocalEmbedding(text);
  }

  /**
   * Generate embeddings using HuggingFace API
   */
  private async generateHuggingFaceEmbedding(text: string): Promise<number[]> {
    // This would integrate with HuggingFace API in production
    // For now, return local embedding as fallback
    console.warn(
      "HuggingFace embedding not implemented yet, using local fallback"
    );
    return this.generateLocalEmbedding(text);
  }

  /**
   * Generate embedding for text using specified model
   */
  async generateEmbedding(
    text: string,
    model: VectorSearchOptions["model"] = "local"
  ): Promise<number[]> {
    const cacheKey = `${model}:${text}`;

    if (this.embeddingCache.has(cacheKey)) {
      const cached = this.embeddingCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let embedding: number[];

    switch (model) {
      case "openai":
        embedding = await this.generateOpenAIEmbedding(text);
        break;
      case "huggingface":
        embedding = await this.generateHuggingFaceEmbedding(text);
        break;
      case "local":
      default:
        embedding = this.generateLocalEmbedding(text);
        break;
    }

    this.embeddingCache.set(cacheKey, embedding);
    return embedding;
  }

  /**
   * Create embedding for a memory item
   */
  async createMemoryEmbedding(
    memory: MemoryItem,
    model: VectorSearchOptions["model"] = "local"
  ): Promise<MemoryEmbedding> {
    // Combine content, title, and tags for embedding
    const text = [
      memory.content,
      memory.metadata.title || "",
      memory.metadata.category || "",
      ...(memory.metadata.tags || []),
    ]
      .filter(Boolean)
      .join(" ");

    const embedding = await this.generateEmbedding(text, model);

    const memoryEmbedding: MemoryEmbedding = {
      memoryId: memory.id,
      embedding,
      text,
      createdAt: new Date().toISOString(),
      model,
    };

    this.embeddings.set(memory.id, memoryEmbedding);
    return memoryEmbedding;
  }

  /**
   * Index multiple memories for vector search
   */
  async indexMemories(
    memories: MemoryItem[],
    model: VectorSearchOptions["model"] = "local"
  ): Promise<MemoryEmbedding[]> {
    const embeddings: MemoryEmbedding[] = [];

    console.log(`🔄 Indexing ${memories.length} memories for vector search...`);

    for (const memory of memories) {
      try {
        const embedding = await this.createMemoryEmbedding(memory, model);
        embeddings.push(embedding);
      } catch (error) {
        console.error(
          `Error creating embedding for memory ${memory.id}:`,
          error
        );
      }
    }

    console.log(`✅ Indexed ${embeddings.length} memories successfully`);
    return embeddings;
  }

  /**
   * Perform semantic search using vector similarity
   */
  async semanticSearch(
    query: string,
    memories: MemoryItem[],
    options: Partial<VectorSearchOptions> = {}
  ): Promise<SemanticSearchResponse> {
    const startTime = Date.now();
    const searchOptions = { ...this.defaultOptions, ...options };

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(
        query,
        searchOptions.model
      );

      // Ensure all memories have embeddings
      const memoriesToIndex = memories.filter(
        (memory) => !this.embeddings.has(memory.id)
      );
      if (memoriesToIndex.length > 0) {
        await this.indexMemories(memoriesToIndex, searchOptions.model);
      }

      // Calculate similarities and find matches
      const results: VectorSearchResult[] = [];

      for (const memory of memories) {
        const memoryEmbedding = this.embeddings.get(memory.id);
        if (!memoryEmbedding) continue;

        const similarity = this.cosineSimilarity(
          queryEmbedding,
          memoryEmbedding.embedding
        );

        if (similarity >= searchOptions.threshold) {
          results.push({
            memory,
            similarity,
            embedding: memoryEmbedding,
          });
        }
      }

      // Sort by similarity score (highest first)
      results.sort((a, b) => b.similarity - a.similarity);

      // Limit results
      const limitedResults = results.slice(0, searchOptions.maxResults);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query,
        queryEmbedding,
        results: limitedResults,
        count: limitedResults.length,
        executionTime,
        model: searchOptions.model,
      };
    } catch (error) {
      console.error("Semantic search error:", error);
      return {
        success: false,
        query,
        queryEmbedding: [],
        results: [],
        count: 0,
        executionTime: Date.now() - startTime,
        model: searchOptions.model,
      };
    }
  }

  /**
   * Find similar memories to a given memory
   */
  async findSimilarMemories(
    targetMemory: MemoryItem,
    allMemories: MemoryItem[],
    options: Partial<VectorSearchOptions> = {}
  ): Promise<VectorSearchResult[]> {
    const searchOptions = { ...this.defaultOptions, ...options };

    // Get or create embedding for target memory
    let targetEmbedding = this.embeddings.get(targetMemory.id);
    if (!targetEmbedding) {
      targetEmbedding = await this.createMemoryEmbedding(
        targetMemory,
        searchOptions.model
      );
    }

    // Find similar memories (excluding the target memory itself)
    const otherMemories = allMemories.filter(
      (memory) => memory.id !== targetMemory.id
    );
    const results: VectorSearchResult[] = [];

    for (const memory of otherMemories) {
      let memoryEmbedding = this.embeddings.get(memory.id);
      if (!memoryEmbedding) {
        memoryEmbedding = await this.createMemoryEmbedding(
          memory,
          searchOptions.model
        );
      }

      const similarity = this.cosineSimilarity(
        targetEmbedding.embedding,
        memoryEmbedding.embedding
      );

      if (similarity >= searchOptions.threshold) {
        results.push({
          memory,
          similarity,
          embedding: memoryEmbedding,
        });
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, searchOptions.maxResults);
  }

  /**
   * Get embedding statistics and health
   */
  getEmbeddingStats(): {
    totalEmbeddings: number;
    cacheSize: number;
    models: string[];
    averageEmbeddingSize: number;
  } {
    const embeddings = Array.from(this.embeddings.values());
    const models = [...new Set(embeddings.map((e) => e.model))];
    const averageSize =
      embeddings.length > 0
        ? embeddings.reduce((sum, e) => sum + e.embedding.length, 0) /
          embeddings.length
        : 0;

    return {
      totalEmbeddings: embeddings.length,
      cacheSize: this.embeddingCache.size,
      models,
      averageEmbeddingSize: Math.round(averageSize),
    };
  }

  /**
   * Clear embeddings cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
    console.log("Embedding cache cleared");
  }

  /**
   * Clear all embeddings and cache
   */
  clearAll(): void {
    this.embeddings.clear();
    this.embeddingCache.clear();
    console.log("All embeddings and cache cleared");
  }
}
