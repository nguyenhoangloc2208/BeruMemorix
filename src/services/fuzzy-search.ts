/**
 * Fuzzy Search Service for BeruMemorix
 * Implements Levenshtein distance and advanced matching algorithms
 */

export interface FuzzySearchOptions {
  threshold: number; // 0-1, minimum similarity score
  caseSensitive: boolean; // Default false
  maxDistance: number; // Maximum edit distance allowed
  partialMatch: boolean; // Allow partial word matching
}

export interface FuzzySearchResult {
  item: any;
  score: number; // 0-1, higher is better match
  matches: string[]; // Which parts matched
}

export class FuzzySearchService {
  private readonly defaultOptions: FuzzySearchOptions = {
    threshold: 0.3,
    caseSensitive: false,
    maxDistance: 3,
    partialMatch: true,
  };

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1] + 1, // deletion
          matrix[j - 1]![i] + 1, // insertion
          matrix[j - 1]![i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length]![str1.length];
  }

  /**
   * Calculate similarity score (0-1) between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxLength;
  }

  /**
   * Normalize query for better matching
   */
  private normalizeQuery(query: string, options: FuzzySearchOptions): string {
    let normalized = query.trim();
    if (!options.caseSensitive) {
      normalized = normalized.toLowerCase();
    }
    return normalized;
  }

  /**
   * Extract searchable terms from text
   */
  private extractTerms(text: string, options: FuzzySearchOptions): string[] {
    let normalized = options.caseSensitive ? text : text.toLowerCase();

    // Split by whitespace and punctuation, filter empty strings
    return normalized
      .split(/[\s\-_.,!?;:()[\]{}'"]+/)
      .filter((term) => term.length > 0);
  }

  /**
   * Check if query matches text with fuzzy logic
   */
  private fuzzyMatch(
    query: string,
    text: string,
    options: FuzzySearchOptions
  ): { matches: boolean; score: number; matchedTerms: string[] } {
    const normalizedQuery = this.normalizeQuery(query, options);
    const normalizedText = options.caseSensitive ? text : text.toLowerCase();

    // Direct substring match (highest score)
    if (normalizedText.includes(normalizedQuery)) {
      return { matches: true, score: 0.9, matchedTerms: [normalizedQuery] };
    }

    const queryTerms = this.extractTerms(normalizedQuery, options);
    const textTerms = this.extractTerms(normalizedText, options);

    if (queryTerms.length === 0)
      return { matches: false, score: 0, matchedTerms: [] };

    let totalScore = 0;
    let matchedCount = 0;
    const matchedTerms: string[] = [];

    // Check each query term against text terms
    for (const queryTerm of queryTerms) {
      let bestScore = 0;
      let bestMatch = "";

      for (const textTerm of textTerms) {
        const similarity = this.calculateSimilarity(queryTerm, textTerm);

        // Partial matching for longer terms
        if (options.partialMatch && queryTerm.length >= 3) {
          if (textTerm.includes(queryTerm) || queryTerm.includes(textTerm)) {
            const partialScore =
              Math.min(queryTerm.length, textTerm.length) /
              Math.max(queryTerm.length, textTerm.length);
            if (partialScore > similarity) {
              bestScore = Math.max(bestScore, partialScore * 0.8); // Slight penalty for partial
              bestMatch = textTerm;
            }
          }
        }

        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = textTerm;
        }
      }

      if (bestScore >= options.threshold) {
        totalScore += bestScore;
        matchedCount++;
        if (bestMatch) matchedTerms.push(bestMatch);
      }
    }

    // Calculate final score based on matched terms ratio
    const finalScore =
      matchedCount > 0
        ? (totalScore / queryTerms.length) * (matchedCount / queryTerms.length)
        : 0;

    return {
      matches: finalScore >= options.threshold,
      score: finalScore,
      matchedTerms,
    };
  }

  /**
   * Search items with fuzzy matching
   */
  fuzzySearch<T>(
    query: string,
    items: T[],
    extractText: (item: T) => string[], // Function to extract searchable text from item
    options: Partial<FuzzySearchOptions> = {}
  ): FuzzySearchResult[] {
    const opts = { ...this.defaultOptions, ...options };

    if (!query.trim()) return [];

    const results: FuzzySearchResult[] = [];

    for (const item of items) {
      const texts = extractText(item);
      let bestScore = 0;
      const allMatches: string[] = [];

      // Check against all text fields
      for (const text of texts) {
        const result = this.fuzzyMatch(query, text, opts);
        if (result.matches) {
          bestScore = Math.max(bestScore, result.score);
          allMatches.push(...result.matchedTerms);
        }
      }

      if (bestScore > 0) {
        results.push({
          item,
          score: bestScore,
          matches: [...new Set(allMatches)], // Remove duplicates
        });
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate search suggestions based on existing content
   */
  generateSuggestions(
    query: string,
    existingTerms: string[],
    maxSuggestions = 5
  ): string[] {
    if (!query.trim() || query.length < 2) return [];

    const normalizedQuery = query.toLowerCase().trim();
    const suggestions = new Set<string>();

    // Find terms that contain the query or are similar
    for (const term of existingTerms) {
      const normalizedTerm = term.toLowerCase();

      // Exact partial match
      if (
        normalizedTerm.includes(normalizedQuery) &&
        normalizedTerm !== normalizedQuery
      ) {
        suggestions.add(term);
      }

      // Fuzzy similarity
      else if (term.length >= 3) {
        const similarity = this.calculateSimilarity(
          normalizedQuery,
          normalizedTerm
        );
        if (similarity >= 0.6) {
          // Higher threshold for suggestions
          suggestions.add(term);
        }
      }
    }

    return Array.from(suggestions)
      .slice(0, maxSuggestions)
      .sort((a, b) => {
        // Prioritize exact partial matches
        const aContains = a.toLowerCase().includes(normalizedQuery);
        const bContains = b.toLowerCase().includes(normalizedQuery);
        if (aContains && !bContains) return -1;
        if (!aContains && bContains) return 1;

        // Then by similarity
        const aSim = this.calculateSimilarity(normalizedQuery, a.toLowerCase());
        const bSim = this.calculateSimilarity(normalizedQuery, b.toLowerCase());
        return bSim - aSim;
      });
  }
}
