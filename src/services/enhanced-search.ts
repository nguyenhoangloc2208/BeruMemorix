/**
 * Enhanced Search Service for BeruMemorix
 * Integrates fuzzy search, suggestions, analytics, and query optimization
 */

import { FuzzySearchService } from "./fuzzy-search.js";
import { SearchAnalyticsService } from "./search-analytics.js";
import { QueryOptimizerService } from "./query-optimizer.js";
import type { FuzzySearchOptions } from "./fuzzy-search.js";
import type { MemoryItem } from "./memory-storage.js";
// Analytics types imported through service
import type { QueryOptimization } from "./query-optimizer.js";

export interface EnhancedSearchOptions {
  // Fuzzy search options
  fuzzyTolerance: number; // 0-1, how fuzzy to match (default 0.3)
  caseSensitive: boolean; // Default false
  partialMatch: boolean; // Allow partial word matching (default true)

  // Search options
  includeContent: boolean; // Search in content (default true)
  includeTitle: boolean; // Search in title (default true)
  includeTags: boolean; // Search in tags (default true)
  includeCategory: boolean; // Search in category (default true)

  // Result options
  maxResults: number; // Maximum results to return (default 10)
  minScore: number; // Minimum score threshold (default 0.1)
  highlightMatches: boolean; // Include match highlighting info (default false)
  includeSuggestions: boolean; // Include suggestions when no results (default true)

  // Analytics and optimization options
  enableAnalytics: boolean; // Record search analytics (default true)
  autoOptimizeQuery: boolean; // Auto-optimize poor queries (default true)
  tryQueryVariations: boolean; // Try query variations on zero results (default true)
}

export interface EnhancedSearchResult {
  memory: MemoryItem;
  score: number; // Overall relevance score
  matchDetails: {
    field: string; // Which field matched
    matches: string[]; // Matched terms
    score: number; // Field-specific score
  }[];
  highlights?: {
    content?: string; // Content with highlights
    title?: string; // Title with highlights
  };
}

export interface SearchResponse {
  success: boolean;
  query: string;
  optimizedQuery?: string; // If query was optimized
  results: EnhancedSearchResult[];
  count: number;
  suggestions?: string[]; // Suggestions if no results
  executionTime: number; // Search time in ms
  searchType: "exact" | "fuzzy" | "mixed" | "optimized";
  analytics?: {
    queryQuality: number; // 0-1 score
    optimization?: QueryOptimization;
  };
}

export class EnhancedSearchService {
  private fuzzySearch = new FuzzySearchService();
  private analytics = new SearchAnalyticsService();
  private queryOptimizer = new QueryOptimizerService();

  private readonly defaultOptions: EnhancedSearchOptions = {
    fuzzyTolerance: 0.3,
    caseSensitive: false,
    partialMatch: true,
    includeContent: true,
    includeTitle: true,
    includeTags: true,
    includeCategory: true,
    maxResults: 10,
    minScore: 0.1,
    highlightMatches: false,
    includeSuggestions: true,
    enableAnalytics: true,
    autoOptimizeQuery: true,
    tryQueryVariations: true,
  };

  /**
   * Get analytics service for external access
   */
  getAnalytics(): SearchAnalyticsService {
    return this.analytics;
  }

  /**
   * Get query optimizer service for external access
   */
  getQueryOptimizer(): QueryOptimizerService {
    return this.queryOptimizer;
  }

  /**
   * Normalize and preprocess search query
   */
  private normalizeQuery(query: string): string {
    return query.trim().replace(/\s+/g, " ");
  }

  /**
   * Extract searchable text from memory item
   */
  private extractSearchableText(memory: MemoryItem): string[] {
    const texts: string[] = [];

    texts.push(memory.content);

    if (memory.metadata.title) {
      texts.push(memory.metadata.title);
    }

    if (memory.metadata.category) {
      texts.push(memory.metadata.category);
    }

    if (memory.metadata.tags) {
      texts.push(...memory.metadata.tags);
    }

    return texts;
  }

  /**
   * Perform exact search (case-insensitive substring matching)
   */
  private exactSearch(
    query: string,
    memories: MemoryItem[],
    options: EnhancedSearchOptions
  ): EnhancedSearchResult[] {
    const normalizedQuery = options.caseSensitive ? query : query.toLowerCase();
    const results: EnhancedSearchResult[] = [];

    for (const memory of memories) {
      const matchDetails: EnhancedSearchResult["matchDetails"] = [];
      let totalScore = 0;

      // Search in content
      if (options.includeContent) {
        const content = options.caseSensitive
          ? memory.content
          : memory.content.toLowerCase();
        if (content.includes(normalizedQuery)) {
          matchDetails.push({
            field: "content",
            matches: [query],
            score: 0.8,
          });
          totalScore += 0.8;
        }
      }

      // Search in title
      if (options.includeTitle && memory.metadata.title) {
        const title = options.caseSensitive
          ? memory.metadata.title
          : memory.metadata.title.toLowerCase();
        if (title.includes(normalizedQuery)) {
          matchDetails.push({
            field: "title",
            matches: [query],
            score: 1.0, // Title matches get highest score
          });
          totalScore += 1.0;
        }
      }

      // Search in category
      if (options.includeCategory && memory.metadata.category) {
        const category = options.caseSensitive
          ? memory.metadata.category
          : memory.metadata.category.toLowerCase();
        if (category.includes(normalizedQuery)) {
          matchDetails.push({
            field: "category",
            matches: [query],
            score: 0.6,
          });
          totalScore += 0.6;
        }
      }

      // Search in tags
      if (options.includeTags && memory.metadata.tags) {
        const matchedTags = memory.metadata.tags.filter((tag) => {
          const tagText = options.caseSensitive ? tag : tag.toLowerCase();
          return tagText.includes(normalizedQuery);
        });

        if (matchedTags.length > 0) {
          matchDetails.push({
            field: "tags",
            matches: matchedTags,
            score: 0.7,
          });
          totalScore += 0.7;
        }
      }

      if (matchDetails.length > 0 && totalScore >= options.minScore) {
        results.push({
          memory,
          score: Math.min(totalScore, 1.0), // Cap at 1.0
          matchDetails,
        });
      }
    }

    return results;
  }

  /**
   * Perform fuzzy search using FuzzySearchService
   */
  private fuzzySearchMemories(
    query: string,
    memories: MemoryItem[],
    options: EnhancedSearchOptions
  ): EnhancedSearchResult[] {
    const fuzzyOptions: Partial<FuzzySearchOptions> = {
      threshold: options.fuzzyTolerance,
      caseSensitive: options.caseSensitive,
      partialMatch: options.partialMatch,
    };

    const fuzzyResults = this.fuzzySearch.fuzzySearch(
      query,
      memories,
      (memory) => this.extractSearchableText(memory),
      fuzzyOptions
    );

    // Convert fuzzy results to enhanced results
    return fuzzyResults
      .filter((result) => result.score >= options.minScore)
      .map((result) => ({
        memory: result.item,
        score: result.score,
        matchDetails: [
          {
            field: "fuzzy_match",
            matches: result.matches,
            score: result.score,
          },
        ],
      }));
  }

  /**
   * Try multiple query variations to improve results
   */
  private async searchWithVariations(
    originalQuery: string,
    memories: MemoryItem[],
    options: EnhancedSearchOptions
  ): Promise<{
    results: EnhancedSearchResult[];
    bestQuery: string;
    searchType: string;
  }> {
    // Try original query first
    let bestResults = this.exactSearch(originalQuery, memories, options);
    let bestQuery = originalQuery;
    let searchType = "exact";

    if (bestResults.length === 0) {
      // Try fuzzy search
      bestResults = this.fuzzySearchMemories(originalQuery, memories, options);
      searchType = "fuzzy";
    }

    // If still no results and variations are enabled, try optimized queries
    if (bestResults.length === 0 && options.tryQueryVariations) {
      const variations = this.queryOptimizer.generateQueryVariations(
        originalQuery,
        5
      );

      for (const variation of variations) {
        if (variation === originalQuery) continue; // Skip original

        // Try exact search with variation
        const variationResults = this.exactSearch(variation, memories, options);
        if (variationResults.length > 0) {
          bestResults = variationResults;
          bestQuery = variation;
          searchType = "optimized";
          break;
        }

        // Try fuzzy search with variation
        const fuzzyVariationResults = this.fuzzySearchMemories(
          variation,
          memories,
          options
        );
        if (
          fuzzyVariationResults.length > 0 &&
          fuzzyVariationResults.length > bestResults.length
        ) {
          bestResults = fuzzyVariationResults;
          bestQuery = variation;
          searchType = "optimized";
        }
      }
    }

    return { results: bestResults, bestQuery, searchType };
  }

  /**
   * Generate search suggestions
   */
  private generateSuggestions(
    query: string,
    memories: MemoryItem[],
    maxSuggestions = 5
  ): string[] {
    // Extract all terms from memories
    const allTerms = new Set<string>();

    for (const memory of memories) {
      // Add content words
      memory.content.split(/\s+/).forEach((word) => {
        if (word.length >= 3) allTerms.add(word);
      });

      // Add title words
      if (memory.metadata.title) {
        memory.metadata.title.split(/\s+/).forEach((word) => {
          if (word.length >= 3) allTerms.add(word);
        });
      }

      // Add tags
      if (memory.metadata.tags) {
        memory.metadata.tags.forEach((tag) => allTerms.add(tag));
      }

      // Add category
      if (memory.metadata.category) {
        allTerms.add(memory.metadata.category);
      }
    }

    return this.fuzzySearch.generateSuggestions(
      query,
      Array.from(allTerms),
      maxSuggestions
    );
  }

  /**
   * Main enhanced search method with analytics and optimization
   */
  async search(
    query: string,
    memories: MemoryItem[],
    options: Partial<EnhancedSearchOptions> = {}
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    const normalizedQuery = this.normalizeQuery(query);

    if (!normalizedQuery) {
      const response: SearchResponse = {
        success: false,
        query,
        results: [],
        count: 0,
        executionTime: Date.now() - startTime,
        searchType: "exact",
      };

      // Record analytics for empty query
      if (opts.enableAnalytics) {
        this.analytics.recordSearch({
          query,
          searchType: "exact",
          resultsCount: 0,
          executionTime: response.executionTime,
        });
      }

      return response;
    }

    // Analyze query quality
    const queryQuality = this.queryOptimizer.scoreQueryQuality(normalizedQuery);
    let optimization: QueryOptimization | undefined;
    let finalQuery = normalizedQuery;

    // Auto-optimize poor quality queries
    if (opts.autoOptimizeQuery && queryQuality < 0.5) {
      optimization = this.queryOptimizer.optimizeQuery(normalizedQuery);
      if (optimization.confidence > 0.6) {
        finalQuery = optimization.optimizedQuery;
      }
    }

    // Perform search with potential variations
    const { results, bestQuery, searchType } = await this.searchWithVariations(
      finalQuery,
      memories,
      opts
    );

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply max results limit
    const limitedResults = results.slice(0, opts.maxResults);

    // Generate suggestions if no results and enabled
    let suggestions: string[] | undefined;
    if (limitedResults.length === 0 && opts.includeSuggestions) {
      suggestions = this.generateSuggestions(normalizedQuery, memories);

      // Also try suggestions from zero-result analysis
      const zeroResultSuggestions = this.analytics.analyzeZeroResultQueries();
      if (zeroResultSuggestions.length > 0) {
        const additionalSuggestions = zeroResultSuggestions
          .slice(0, 3)
          .map((s) => s.optimizedQuery);
        suggestions = [...(suggestions || []), ...additionalSuggestions];
        suggestions = [...new Set(suggestions)].slice(0, 5); // Remove duplicates
      }
    }

    const executionTime = Date.now() - startTime;

    // Record analytics
    if (opts.enableAnalytics) {
      this.analytics.recordSearch({
        query: normalizedQuery,
        searchType: searchType as "exact" | "fuzzy" | "mixed",
        resultsCount: limitedResults.length,
        executionTime,
        ...(suggestions && { suggestions }),
      });
    }

    const response: SearchResponse = {
      success: true,
      query: normalizedQuery,
      ...(bestQuery !== normalizedQuery && { optimizedQuery: bestQuery }),
      results: limitedResults,
      count: limitedResults.length,
      ...(suggestions && { suggestions }),
      executionTime,
      searchType: searchType as "exact" | "fuzzy" | "mixed" | "optimized",
      ...(opts.enableAnalytics && {
        analytics: {
          queryQuality,
          ...(optimization && { optimization }),
        },
      }),
    };

    return response;
  }

  /**
   * Search with auto-complete suggestions
   */
  async searchWithAutoComplete(
    partialQuery: string,
    memories: MemoryItem[],
    maxSuggestions = 5
  ): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) return [];

    return this.generateSuggestions(partialQuery, memories, maxSuggestions);
  }

  /**
   * Batch search multiple queries
   */
  async batchSearch(
    queries: string[],
    memories: MemoryItem[],
    options: Partial<EnhancedSearchOptions> = {}
  ): Promise<{ [query: string]: SearchResponse }> {
    const results: { [query: string]: SearchResponse } = {};

    // Process queries in parallel for better performance
    const searchPromises = queries.map(async (query) => {
      const result = await this.search(query, memories, options);
      return { query, result };
    });

    const resolvedResults = await Promise.all(searchPromises);

    resolvedResults.forEach(({ query, result }) => {
      results[query] = result;
    });

    return results;
  }

  /**
   * Get search performance metrics
   */
  getSearchMetrics(timeRange?: { start: Date; end: Date }) {
    return this.analytics.getMetrics(timeRange);
  }

  /**
   * Get search insights and recommendations
   */
  getSearchInsights() {
    return this.analytics.getSearchInsights();
  }

  /**
   * Record user action for analytics
   */
  recordUserAction(
    query: string,
    action: "clicked_result" | "refined_query" | "abandoned" | "used_suggestion"
  ): void {
    this.analytics.recordUserAction(query, action);
  }

  /**
   * Export search analytics data
   */
  exportAnalytics(format: "json" | "csv" = "json"): string {
    return this.analytics.exportData(format);
  }

  /**
   * Clear old analytics data
   */
  cleanupAnalytics(olderThanDays = 30): number {
    return this.analytics.cleanup(olderThanDays);
  }
}
