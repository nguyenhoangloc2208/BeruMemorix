/**
 * Enhanced Search Service for BeruMemorix
 * Integrates fuzzy search, suggestions, and advanced filtering
 */

import { FuzzySearchService } from "./fuzzy-search.js";
import type { FuzzySearchOptions, FuzzySearchResult } from "./fuzzy-search.js";
import type { MemoryItem } from "./memory-storage.js";

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
  results: EnhancedSearchResult[];
  count: number;
  suggestions?: string[]; // Suggestions if no results
  executionTime: number; // Search time in ms
  searchType: "exact" | "fuzzy" | "mixed";
}

export class EnhancedSearchService {
  private fuzzySearch = new FuzzySearchService();

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
  };

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
            field: "mixed",
            matches: result.matches,
            score: result.score,
          },
        ],
      }));
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
   * Main enhanced search method
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
      return {
        success: false,
        query,
        results: [],
        count: 0,
        executionTime: Date.now() - startTime,
        searchType: "exact",
      };
    }

    let results: EnhancedSearchResult[] = [];
    let searchType: "exact" | "fuzzy" | "mixed" = "exact";

    // Try exact search first
    const exactResults = this.exactSearch(normalizedQuery, memories, opts);

    if (exactResults.length > 0) {
      results = exactResults;
      searchType = "exact";
    } else {
      // Fall back to fuzzy search
      const fuzzyResults = this.fuzzySearchMemories(
        normalizedQuery,
        memories,
        opts
      );
      results = fuzzyResults;
      searchType = "fuzzy";
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply max results limit
    results = results.slice(0, opts.maxResults);

    // Generate suggestions if no results and enabled
    let suggestions: string[] | undefined;
    if (results.length === 0 && opts.includeSuggestions) {
      suggestions = this.generateSuggestions(normalizedQuery, memories);
    }

    return {
      success: true,
      query: normalizedQuery,
      results,
      count: results.length,
      ...(suggestions && { suggestions }),
      executionTime: Date.now() - startTime,
      searchType,
    };
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

    for (const query of queries) {
      results[query] = await this.search(query, memories, options);
    }

    return results;
  }
}
