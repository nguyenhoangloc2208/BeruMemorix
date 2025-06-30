/**
 * Hybrid Search Service for BeruMemorix
 * Combines traditional keyword search with vector semantic search
 */

import { EnhancedSearchService } from "./enhanced-search.js";
import { VectorSearchService } from "./vector-search.js";
import type {
  EnhancedSearchOptions,
  EnhancedSearchResult,
} from "./enhanced-search.js";
import type {
  VectorSearchOptions,
  VectorSearchResult,
} from "./vector-search.js";
import type { MemoryItem } from "./memory-storage.js";

export interface HybridSearchOptions {
  // Traditional search weight (0-1, default 0.6)
  traditionalWeight: number;

  // Vector search weight (0-1, default 0.4)
  vectorWeight: number;

  // Minimum combined score threshold (0-1, default 0.3)
  minCombinedScore: number;

  // Maximum results to return (default 10)
  maxResults: number;

  // Whether to enable vector search (default true)
  enableVectorSearch: boolean;

  // Whether to enable traditional search (default true)
  enableTraditionalSearch: boolean;

  // Vector search options
  vectorOptions: Partial<VectorSearchOptions>;

  // Traditional search options
  traditionalOptions: Partial<EnhancedSearchOptions>;

  // Result merging strategy
  mergingStrategy: "weighted" | "rank_fusion" | "best_of_both";
}

export interface HybridSearchResult {
  memory: MemoryItem;
  combinedScore: number; // Final combined score
  traditionalScore: number; // Score from traditional search
  vectorScore: number; // Score from vector search
  sources: ("traditional" | "vector")[]; // Which search methods found this result
}

export interface HybridSearchResponse {
  success: boolean;
  query: string;
  results: HybridSearchResult[];
  count: number;
  executionTime: number;
  breakdown: {
    traditionalResults: number;
    vectorResults: number;
    combinedResults: number;
  };
  strategy: HybridSearchOptions["mergingStrategy"];
}

export class HybridSearchService {
  private enhancedSearch = new EnhancedSearchService();
  private vectorSearch = new VectorSearchService();

  private readonly defaultOptions: HybridSearchOptions = {
    traditionalWeight: 0.6,
    vectorWeight: 0.4,
    minCombinedScore: 0.3,
    maxResults: 10,
    enableVectorSearch: true,
    enableTraditionalSearch: true,
    vectorOptions: {
      threshold: 0.5,
      maxResults: 20,
      model: "local",
    },
    traditionalOptions: {
      fuzzyTolerance: 0.3,
      maxResults: 20,
      includeSuggestions: false,
      enableAnalytics: false,
    },
    mergingStrategy: "weighted",
  };

  /**
   * Normalize a score to 0-1 range
   */
  private normalizeScore(score: number, min = 0, max = 1): number {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (score - min) / (max - min)));
  }

  /**
   * Calculate weighted combined score
   */
  private calculateWeightedScore(
    traditionalScore: number,
    vectorScore: number,
    options: HybridSearchOptions
  ): number {
    const totalWeight = options.traditionalWeight + options.vectorWeight;
    if (totalWeight === 0) return 0;

    return (
      (traditionalScore * options.traditionalWeight +
        vectorScore * options.vectorWeight) /
      totalWeight
    );
  }

  /**
   * Calculate rank fusion score (reciprocal rank fusion)
   */
  private calculateRankFusionScore(
    traditionalRank: number,
    vectorRank: number,
    k = 60 // RRF constant
  ): number {
    const traditionalRRF = traditionalRank > 0 ? 1 / (k + traditionalRank) : 0;
    const vectorRRF = vectorRank > 0 ? 1 / (k + vectorRank) : 0;
    return traditionalRRF + vectorRRF;
  }

  /**
   * Merge results using weighted strategy
   */
  private mergeWeightedResults(
    traditionalResults: EnhancedSearchResult[],
    vectorResults: VectorSearchResult[],
    options: HybridSearchOptions
  ): HybridSearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>();

    // Process traditional search results
    for (const result of traditionalResults) {
      const normalizedScore = this.normalizeScore(result.score, 0, 1);

      resultMap.set(result.memory.id, {
        memory: result.memory,
        combinedScore: 0, // Will be calculated after processing all results
        traditionalScore: normalizedScore,
        vectorScore: 0,
        sources: ["traditional"],
      });
    }

    // Process vector search results
    for (const result of vectorResults) {
      const existing = resultMap.get(result.memory.id);
      const normalizedScore = this.normalizeScore(result.similarity, 0, 1);

      if (existing) {
        // Memory found by both searches
        existing.vectorScore = normalizedScore;
        existing.sources.push("vector");
      } else {
        // Memory found only by vector search
        resultMap.set(result.memory.id, {
          memory: result.memory,
          combinedScore: 0,
          traditionalScore: 0,
          vectorScore: normalizedScore,
          sources: ["vector"],
        });
      }
    }

    // Calculate combined scores
    for (const result of resultMap.values()) {
      result.combinedScore = this.calculateWeightedScore(
        result.traditionalScore,
        result.vectorScore,
        options
      );
    }

    return Array.from(resultMap.values());
  }

  /**
   * Merge results using rank fusion strategy
   */
  private mergeRankFusionResults(
    traditionalResults: EnhancedSearchResult[],
    vectorResults: VectorSearchResult[]
  ): HybridSearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>();

    // Create rank maps
    const traditionalRanks = new Map<string, number>();
    const vectorRanks = new Map<string, number>();

    traditionalResults.forEach((result, index) => {
      traditionalRanks.set(result.memory.id, index + 1);
    });

    vectorResults.forEach((result, index) => {
      vectorRanks.set(result.memory.id, index + 1);
    });

    // Get all unique memory IDs
    const allMemoryIds = new Set([
      ...traditionalResults.map((r) => r.memory.id),
      ...vectorResults.map((r) => r.memory.id),
    ]);

    // Calculate RRF scores
    for (const memoryId of allMemoryIds) {
      const traditionalRank = traditionalRanks.get(memoryId) || 0;
      const vectorRank = vectorRanks.get(memoryId) || 0;

      const traditionalResult = traditionalResults.find(
        (r) => r.memory.id === memoryId
      );
      const vectorResult = vectorResults.find((r) => r.memory.id === memoryId);

      const memory = traditionalResult?.memory || vectorResult?.memory;
      if (!memory) continue;

      const rrfScore = this.calculateRankFusionScore(
        traditionalRank,
        vectorRank
      );

      const sources: ("traditional" | "vector")[] = [];
      if (traditionalRank > 0) sources.push("traditional");
      if (vectorRank > 0) sources.push("vector");

      resultMap.set(memoryId, {
        memory,
        combinedScore: rrfScore,
        traditionalScore: traditionalResult?.score || 0,
        vectorScore: vectorResult?.similarity || 0,
        sources,
      });
    }

    return Array.from(resultMap.values());
  }

  /**
   * Merge results using best of both strategy
   */
  private mergeBestOfBothResults(
    traditionalResults: EnhancedSearchResult[],
    vectorResults: VectorSearchResult[],
    options: HybridSearchOptions
  ): HybridSearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>();

    // Take top results from traditional search
    const topTraditional = traditionalResults.slice(
      0,
      Math.ceil(options.maxResults / 2)
    );

    // Take top results from vector search
    const topVector = vectorResults.slice(0, Math.ceil(options.maxResults / 2));

    // Process traditional results
    for (const result of topTraditional) {
      resultMap.set(result.memory.id, {
        memory: result.memory,
        combinedScore: result.score,
        traditionalScore: result.score,
        vectorScore: 0,
        sources: ["traditional"],
      });
    }

    // Process vector results
    for (const result of topVector) {
      const existing = resultMap.get(result.memory.id);

      if (existing) {
        // Memory found by both - use higher score
        existing.vectorScore = result.similarity;
        existing.combinedScore = Math.max(
          existing.traditionalScore,
          result.similarity
        );
        existing.sources.push("vector");
      } else {
        resultMap.set(result.memory.id, {
          memory: result.memory,
          combinedScore: result.similarity,
          traditionalScore: 0,
          vectorScore: result.similarity,
          sources: ["vector"],
        });
      }
    }

    return Array.from(resultMap.values());
  }

  /**
   * Perform hybrid search combining traditional and vector search
   */
  async search(
    query: string,
    memories: MemoryItem[],
    options: Partial<HybridSearchOptions> = {}
  ): Promise<HybridSearchResponse> {
    const startTime = Date.now();
    const searchOptions = { ...this.defaultOptions, ...options };

    try {
      let traditionalResults: EnhancedSearchResult[] = [];
      let vectorResults: VectorSearchResult[] = [];

      // Run searches in parallel for better performance
      const searchPromises: Promise<any>[] = [];

      if (searchOptions.enableTraditionalSearch) {
        searchPromises.push(
          this.enhancedSearch
            .search(query, memories, searchOptions.traditionalOptions)
            .then((response) => {
              traditionalResults = response.results;
            })
        );
      }

      if (searchOptions.enableVectorSearch) {
        searchPromises.push(
          this.vectorSearch
            .semanticSearch(query, memories, searchOptions.vectorOptions)
            .then((response) => {
              vectorResults = response.results;
            })
        );
      }

      // Wait for all searches to complete
      await Promise.all(searchPromises);

      // Merge results based on strategy
      let mergedResults: HybridSearchResult[];

      switch (searchOptions.mergingStrategy) {
        case "rank_fusion":
          mergedResults = this.mergeRankFusionResults(
            traditionalResults,
            vectorResults
          );
          break;
        case "best_of_both":
          mergedResults = this.mergeBestOfBothResults(
            traditionalResults,
            vectorResults,
            searchOptions
          );
          break;
        case "weighted":
        default:
          mergedResults = this.mergeWeightedResults(
            traditionalResults,
            vectorResults,
            searchOptions
          );
          break;
      }

      // Filter by minimum score and sort
      const filteredResults = mergedResults
        .filter(
          (result) => result.combinedScore >= searchOptions.minCombinedScore
        )
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, searchOptions.maxResults);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query,
        results: filteredResults,
        count: filteredResults.length,
        executionTime,
        breakdown: {
          traditionalResults: traditionalResults.length,
          vectorResults: vectorResults.length,
          combinedResults: filteredResults.length,
        },
        strategy: searchOptions.mergingStrategy,
      };
    } catch (error) {
      console.error("Hybrid search error:", error);
      return {
        success: false,
        query,
        results: [],
        count: 0,
        executionTime: Date.now() - startTime,
        breakdown: {
          traditionalResults: 0,
          vectorResults: 0,
          combinedResults: 0,
        },
        strategy: searchOptions.mergingStrategy,
      };
    }
  }

  /**
   * Find similar memories using hybrid approach
   */
  async findSimilarMemories(
    targetMemory: MemoryItem,
    allMemories: MemoryItem[],
    options: Partial<HybridSearchOptions> = {}
  ): Promise<HybridSearchResult[]> {
    // Use the memory's content and metadata as search query
    const searchQuery = [
      targetMemory.content,
      targetMemory.metadata.title,
      targetMemory.metadata.category,
      ...(targetMemory.metadata.tags || []),
    ]
      .filter(Boolean)
      .join(" ");

    // Filter out the target memory
    const otherMemories = allMemories.filter(
      (memory) => memory.id !== targetMemory.id
    );

    const response = await this.search(searchQuery, otherMemories, options);
    return response.results;
  }

  /**
   * Get search service instances for external access
   */
  getServices() {
    return {
      enhancedSearch: this.enhancedSearch,
      vectorSearch: this.vectorSearch,
    };
  }

  /**
   * Get embedding statistics from vector search
   */
  getEmbeddingStats() {
    return this.vectorSearch.getEmbeddingStats();
  }

  /**
   * Clear vector search cache
   */
  clearVectorCache(): void {
    this.vectorSearch.clearCache();
  }

  /**
   * Clear all caches and data
   */
  clearAll(): void {
    this.vectorSearch.clearAll();
    // Enhanced search analytics could be cleared here if needed
  }
}
