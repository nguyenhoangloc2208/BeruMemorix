/**
 * Search Analytics Service for BeruMemorix
 * Tracks search patterns, performance metrics, and user behavior
 */

export interface SearchAnalyticsEvent {
  id: string;
  timestamp: Date;
  query: string;
  searchType: "exact" | "fuzzy" | "mixed";
  resultsCount: number;
  executionTime: number;
  suggestions?: string[];
  userAction?:
    | "clicked_result"
    | "refined_query"
    | "abandoned"
    | "used_suggestion";
  sessionId?: string;
}

export interface SearchMetrics {
  totalSearches: number;
  avgExecutionTime: number;
  avgResultsCount: number;
  zeroResultQueries: number;
  zeroResultRate: number;
  topQueries: { query: string; count: number }[];
  searchTypeDistribution: { exact: number; fuzzy: number; mixed: number };
  timeRangeAnalysis: {
    last24h: number;
    lastWeek: number;
    lastMonth: number;
  };
  suggestionUsageRate: number;
  queryRefinementRate: number;
}

export interface QueryOptimizationSuggestion {
  originalQuery: string;
  optimizedQuery: string;
  reason: string;
  expectedImprovement: number; // 0-1 score
}

export class SearchAnalyticsService {
  private events: SearchAnalyticsEvent[] = [];
  private readonly maxEvents = 10000; // Keep last 10k events
  private sessionId: string = this.generateSessionId();

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record a search event
   */
  recordSearch(
    event: Omit<SearchAnalyticsEvent, "id" | "timestamp" | "sessionId">
  ): void {
    const searchEvent: SearchAnalyticsEvent = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId: this.sessionId,
      ...event,
    };

    this.events.push(searchEvent);

    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Update user action for a search event
   */
  recordUserAction(
    query: string,
    action: NonNullable<SearchAnalyticsEvent["userAction"]>,
    timeWindow = 60000 // 1 minute
  ): void {
    const recentEvent = this.events
      .filter((e) => e.query === query)
      .filter((e) => Date.now() - e.timestamp.getTime() < timeWindow)
      .pop();

    if (recentEvent) {
      recentEvent.userAction = action;
    }
  }

  /**
   * Generate comprehensive search metrics
   */
  getMetrics(timeRange?: { start: Date; end: Date }): SearchMetrics {
    let relevantEvents = this.events;

    if (timeRange) {
      relevantEvents = this.events.filter(
        (e) => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    if (relevantEvents.length === 0) {
      return this.getEmptyMetrics();
    }

    // Basic metrics
    const totalSearches = relevantEvents.length;
    const avgExecutionTime =
      relevantEvents.reduce((sum, e) => sum + e.executionTime, 0) /
      totalSearches;
    const avgResultsCount =
      relevantEvents.reduce((sum, e) => sum + e.resultsCount, 0) /
      totalSearches;

    // Zero result analysis
    const zeroResultQueries = relevantEvents.filter(
      (e) => e.resultsCount === 0
    ).length;
    const zeroResultRate = zeroResultQueries / totalSearches;

    // Top queries
    const queryCount = new Map<string, number>();
    relevantEvents.forEach((e) => {
      queryCount.set(e.query, (queryCount.get(e.query) || 0) + 1);
    });
    const topQueries = Array.from(queryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Search type distribution
    const searchTypeCount = { exact: 0, fuzzy: 0, mixed: 0 };
    relevantEvents.forEach((e) => {
      searchTypeCount[e.searchType]++;
    });

    // Time range analysis
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const timeRangeAnalysis = {
      last24h: this.events.filter((e) => e.timestamp >= last24h).length,
      lastWeek: this.events.filter((e) => e.timestamp >= lastWeek).length,
      lastMonth: this.events.filter((e) => e.timestamp >= lastMonth).length,
    };

    // Suggestion usage rate
    const eventsWithSuggestions = relevantEvents.filter(
      (e) => e.suggestions && e.suggestions.length > 0
    );
    const suggestionUsages = relevantEvents.filter(
      (e) => e.userAction === "used_suggestion"
    ).length;
    const suggestionUsageRate =
      eventsWithSuggestions.length > 0
        ? suggestionUsages / eventsWithSuggestions.length
        : 0;

    // Query refinement rate (users who searched again within 5 minutes)
    const refinements = this.calculateQueryRefinements(relevantEvents);
    const queryRefinementRate = refinements / totalSearches;

    return {
      totalSearches,
      avgExecutionTime,
      avgResultsCount,
      zeroResultQueries,
      zeroResultRate,
      topQueries,
      searchTypeDistribution: searchTypeCount,
      timeRangeAnalysis,
      suggestionUsageRate,
      queryRefinementRate,
    };
  }

  /**
   * Calculate query refinement rate
   */
  private calculateQueryRefinements(events: SearchAnalyticsEvent[]): number {
    let refinements = 0;
    const timeWindow = 5 * 60 * 1000; // 5 minutes

    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];

      if (
        current &&
        next &&
        next.timestamp.getTime() - current.timestamp.getTime() < timeWindow &&
        current.sessionId === next.sessionId &&
        current.resultsCount <= 2 // User likely unsatisfied with results
      ) {
        refinements++;
      }
    }

    return refinements;
  }

  /**
   * Get empty metrics structure
   */
  private getEmptyMetrics(): SearchMetrics {
    return {
      totalSearches: 0,
      avgExecutionTime: 0,
      avgResultsCount: 0,
      zeroResultQueries: 0,
      zeroResultRate: 0,
      topQueries: [],
      searchTypeDistribution: { exact: 0, fuzzy: 0, mixed: 0 },
      timeRangeAnalysis: { last24h: 0, lastWeek: 0, lastMonth: 0 },
      suggestionUsageRate: 0,
      queryRefinementRate: 0,
    };
  }

  /**
   * Analyze zero-result queries and provide optimization suggestions
   */
  analyzeZeroResultQueries(): QueryOptimizationSuggestion[] {
    const zeroResultEvents = this.events.filter((e) => e.resultsCount === 0);
    const suggestions: QueryOptimizationSuggestion[] = [];

    // Group similar zero-result queries
    const queryGroups = new Map<string, SearchAnalyticsEvent[]>();

    zeroResultEvents.forEach((event) => {
      const normalizedQuery = event.query.toLowerCase().trim();
      if (!queryGroups.has(normalizedQuery)) {
        queryGroups.set(normalizedQuery, []);
      }
      queryGroups.get(normalizedQuery)!.push(event);
    });

    // Generate optimization suggestions for frequent zero-result queries
    Array.from(queryGroups.entries())
      .filter(([_, events]) => events.length >= 2) // At least 2 occurrences
      .forEach(([query, events]) => {
        suggestions.push(
          ...this.generateOptimizationSuggestions(query, events)
        );
      });

    return suggestions.slice(0, 10); // Top 10 suggestions
  }

  /**
   * Generate optimization suggestions for a specific query
   */
  private generateOptimizationSuggestions(
    query: string,
    _events: SearchAnalyticsEvent[]
  ): QueryOptimizationSuggestion[] {
    const suggestions: QueryOptimizationSuggestion[] = [];

    // Suggestion 1: Remove special characters
    if (/[^a-zA-Z0-9\s]/.test(query)) {
      const cleanQuery = query
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleanQuery !== query) {
        suggestions.push({
          originalQuery: query,
          optimizedQuery: cleanQuery,
          reason: "Remove special characters that might interfere with search",
          expectedImprovement: 0.3,
        });
      }
    }

    // Suggestion 2: Split compound words
    if (query.length > 10 && !query.includes(" ")) {
      // Simple heuristic: add spaces before capital letters
      const splitQuery = query
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase();
      if (splitQuery !== query.toLowerCase()) {
        suggestions.push({
          originalQuery: query,
          optimizedQuery: splitQuery,
          reason: "Split compound words for better matching",
          expectedImprovement: 0.4,
        });
      }
    }

    // Suggestion 3: Expand abbreviations (basic)
    const abbreviationMap: { [key: string]: string } = {
      ai: "artificial intelligence",
      ml: "machine learning",
      api: "application programming interface",
      ui: "user interface",
      ux: "user experience",
      db: "database",
      js: "javascript",
      ts: "typescript",
    };

    const words = query.toLowerCase().split(/\s+/);
    let expandedQuery = query;
    let hasExpansion = false;

    words.forEach((word) => {
      if (abbreviationMap[word]) {
        expandedQuery = expandedQuery.replace(
          new RegExp(`\\b${word}\\b`, "gi"),
          abbreviationMap[word]
        );
        hasExpansion = true;
      }
    });

    if (hasExpansion) {
      suggestions.push({
        originalQuery: query,
        optimizedQuery: expandedQuery,
        reason: "Expand common abbreviations for better matching",
        expectedImprovement: 0.5,
      });
    }

    return suggestions;
  }

  /**
   * Get search patterns and insights
   */
  getSearchInsights(): {
    patterns: string[];
    recommendations: string[];
    performance: {
      fastQueries: string[];
      slowQueries: string[];
    };
  } {
    const metrics = this.getMetrics();
    const patterns: string[] = [];
    const recommendations: string[] = [];

    // Analyze patterns
    if (metrics.zeroResultRate > 0.3) {
      patterns.push(
        `High zero-result rate: ${(metrics.zeroResultRate * 100).toFixed(1)}%`
      );
      recommendations.push(
        "Consider implementing query expansion or suggestion improvements"
      );
    }

    if (metrics.avgExecutionTime > 100) {
      patterns.push(
        `Slow average response time: ${metrics.avgExecutionTime.toFixed(1)}ms`
      );
      recommendations.push("Optimize search algorithms or implement caching");
    }

    if (metrics.suggestionUsageRate < 0.2) {
      patterns.push(
        `Low suggestion usage: ${(metrics.suggestionUsageRate * 100).toFixed(
          1
        )}%`
      );
      recommendations.push(
        "Improve suggestion quality or make them more prominent"
      );
    }

    if (metrics.queryRefinementRate > 0.4) {
      patterns.push(
        `High refinement rate: ${(metrics.queryRefinementRate * 100).toFixed(
          1
        )}%`
      );
      recommendations.push(
        "Users often need to refine queries - improve initial results"
      );
    }

    // Performance analysis
    const sortedByTime = this.events
      .slice()
      .sort((a, b) => a.executionTime - b.executionTime);

    const fastQueries = sortedByTime
      .slice(0, 5)
      .map((e) => `"${e.query}" (${e.executionTime}ms)`);

    const slowQueries = sortedByTime
      .slice(-5)
      .reverse()
      .map((e) => `"${e.query}" (${e.executionTime}ms)`);

    return {
      patterns,
      recommendations,
      performance: {
        fastQueries,
        slowQueries,
      },
    };
  }

  /**
   * Export analytics data for external analysis
   */
  exportData(format: "json" | "csv" = "json"): string {
    if (format === "csv") {
      const headers = [
        "timestamp",
        "query",
        "searchType",
        "resultsCount",
        "executionTime",
        "userAction",
      ];
      const rows = this.events.map((e) => [
        e.timestamp.toISOString(),
        `"${e.query}"`,
        e.searchType,
        e.resultsCount.toString(),
        e.executionTime.toString(),
        e.userAction || "",
      ]);

      return [headers.join(","), ...rows.map((row) => row.join(","))].join(
        "\n"
      );
    }

    return JSON.stringify(
      {
        events: this.events,
        metrics: this.getMetrics(),
        insights: this.getSearchInsights(),
      },
      null,
      2
    );
  }

  /**
   * Clear old events to maintain performance
   */
  cleanup(olderThanDays = 30): number {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    );
    const initialCount = this.events.length;

    this.events = this.events.filter((e) => e.timestamp >= cutoffDate);

    return initialCount - this.events.length;
  }
}
