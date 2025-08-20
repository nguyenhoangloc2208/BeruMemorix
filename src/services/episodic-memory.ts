/**
 * Episodic Memory Service - Stores historical experiences and their takeaways
 * Based on cognitive science: event-based, temporal, outcome-focused learning
 */

import type {
  EpisodicMemoryItem,
  EpisodicMemorySearch,
  MemoryContext,
  MemoryTypeSearchResult,
  MemoryTypesConfig,
} from "../types/memory-types.js";

export interface EpisodeCreationOptions {
  userAction: string;
  systemResponse: string;
  outcome: EpisodicMemoryItem["context"]["outcome"];
  userFeedback?: EpisodicMemoryItem["context"]["userFeedback"];
  emotions?: EpisodicMemoryItem["emotions"];
  tags?: string[];
  autoGenerateTakeaways?: boolean;
}

export class EpisodicMemoryService {
  private items: Map<string, EpisodicMemoryItem> = new Map();
  private episodeIndex: Map<string, Set<string>> = new Map(); // episodeId -> itemIds for related episodes
  private config: MemoryTypesConfig["episodicMemory"];

  constructor(config?: Partial<MemoryTypesConfig["episodicMemory"]>) {
    this.config = {
      maxEpisodes: config?.maxEpisodes || 1000,
      consolidationThreshold: config?.consolidationThreshold || 5,
      emotionalWeighting: config?.emotionalWeighting ?? true,
    };
  }

  /**
   * Record a new episode/experience
   */
  async recordEpisode(
    content: string,
    context: MemoryContext,
    options: EpisodeCreationOptions
  ): Promise<string> {
    const now = new Date().toISOString();
    const id = this.generateId();

    const episodeId =
      options.userAction.slice(0, 20).replace(/\s+/g, "_") + "_" + Date.now();

    // Auto-generate takeaways if enabled
    let takeaways: string[] = [];
    if (options.autoGenerateTakeaways) {
      takeaways = await this.generateTakeaways(
        options.userAction,
        options.systemResponse,
        options.outcome
      );
    }

    const item: EpisodicMemoryItem = {
      id,
      type: "episodic",
      content,
      episodeId,
      timestamp: context.timestamp || now,
      context: {
        userAction: options.userAction,
        systemResponse: options.systemResponse,
        outcome: options.outcome,
        ...(options.userFeedback && { userFeedback: options.userFeedback }),
      },
      takeaways,
      ...(options.emotions && { emotions: options.emotions }),
      tags: options.tags || [],
      relatedEpisodes: [],
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now,
    };

    // Store the episode
    this.items.set(id, item);

    // Index by episode ID
    if (!this.episodeIndex.has(episodeId)) {
      this.episodeIndex.set(episodeId, new Set());
    }
    this.episodeIndex.get(episodeId)!.add(id);

    // Find and link related episodes
    await this.linkRelatedEpisodes(item);

    // Check for consolidation opportunities
    await this.checkConsolidationOpportunities(item);

    // Enforce limits
    await this.enforceLimits();

    return id;
  }

  /**
   * Retrieve a specific episode
   */
  async retrieve(id: string): Promise<EpisodicMemoryItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    // Update access tracking
    item.accessCount++;
    item.lastAccessed = new Date().toISOString();
    this.items.set(id, item);

    return item;
  }

  /**
   * Search episodic memory
   */
  async search(
    query: string,
    searchOptions: EpisodicMemorySearch = {},
    limit: number = 10
  ): Promise<MemoryTypeSearchResult<EpisodicMemoryItem>> {
    const startTime = Date.now();
    let results: EpisodicMemoryItem[] = [];

    // Get all items
    let allItems = Array.from(this.items.values());

    // Apply filters
    if (searchOptions.episodeId) {
      allItems = allItems.filter(
        (item) => item.episodeId === searchOptions.episodeId
      );
    }

    if (searchOptions.timeRange) {
      const start = new Date(searchOptions.timeRange.start).getTime();
      const end = new Date(searchOptions.timeRange.end).getTime();
      allItems = allItems.filter((item) => {
        const timestamp = new Date(item.timestamp).getTime();
        return timestamp >= start && timestamp <= end;
      });
    }

    if (searchOptions.outcome) {
      allItems = allItems.filter(
        (item) => item.context.outcome === searchOptions.outcome
      );
    }

    if (searchOptions.emotions) {
      allItems = allItems.filter(
        (item) => item.emotions === searchOptions.emotions
      );
    }

    if (searchOptions.tags && searchOptions.tags.length > 0) {
      allItems = allItems.filter((item) =>
        searchOptions.tags!.some((tag) => item.tags.includes(tag))
      );
    }

    // Text search
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      allItems = allItems.filter(
        (item) =>
          item.content.toLowerCase().includes(queryLower) ||
          item.context.userAction.toLowerCase().includes(queryLower) ||
          item.context.systemResponse.toLowerCase().includes(queryLower) ||
          item.takeaways.some((takeaway) =>
            takeaway.toLowerCase().includes(queryLower)
          )
      );
    }

    // Sort by relevance (outcome, emotions, recency)
    allItems.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Successful episodes get higher score
      if (a.context.outcome === "successful") scoreA += 3;
      if (b.context.outcome === "successful") scoreB += 3;

      // Positive emotions get higher score
      if (this.config.emotionalWeighting) {
        if (a.emotions === "satisfaction" || a.emotions === "discovery")
          scoreA += 2;
        if (b.emotions === "satisfaction" || b.emotions === "discovery")
          scoreB += 2;
      }

      // Access count and recency
      scoreA += a.accessCount;
      scoreB += b.accessCount;

      const recencyA = Date.now() - new Date(a.timestamp).getTime();
      const recencyB = Date.now() - new Date(b.timestamp).getTime();

      scoreA -= recencyA / (1000 * 60 * 60 * 24); // Decay by days
      scoreB -= recencyB / (1000 * 60 * 60 * 24);

      return scoreB - scoreA;
    });

    results = allItems.slice(0, limit);

    // Update access count for retrieved items
    results.forEach((item) => {
      item.accessCount++;
      item.lastAccessed = new Date().toISOString();
      this.items.set(item.id, item);
    });

    return {
      items: results,
      count: results.length,
      searchType: searchOptions.similarity
        ? "episodic_similarity"
        : "episodic_search",
      executionTime: Date.now() - startTime,
      context: {
        sessionId: "episodic_search",
        conversationId: "episodic_search",
        timestamp: new Date().toISOString(),
        priorities: ["learning", "experience"],
      },
    };
  }

  /**
   * Get similar episodes based on actions or outcomes
   */
  async getSimilarEpisodes(
    targetEpisodeId: string,
    limit: number = 5
  ): Promise<EpisodicMemoryItem[]> {
    const targetItem = Array.from(this.items.values()).find(
      (item) => item.episodeId === targetEpisodeId
    );

    if (!targetItem) return [];

    const allItems = Array.from(this.items.values()).filter(
      (item) => item.episodeId !== targetEpisodeId
    );

    // Calculate similarity based on context and content
    const similarities = allItems.map((item) => ({
      item,
      similarity: this.calculateEpisodeSimilarity(targetItem, item),
    }));

    // Sort by similarity and return top results
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, limit).map((s) => s.item);
  }

  /**
   * Update episode with feedback or outcome
   */
  async updateEpisode(
    id: string,
    updates: Partial<{
      outcome: EpisodicMemoryItem["context"]["outcome"];
      userFeedback: EpisodicMemoryItem["context"]["userFeedback"];
      emotions: EpisodicMemoryItem["emotions"];
      takeaways: string[];
    }>
  ): Promise<boolean> {
    const item = this.items.get(id);
    if (!item) return false;

    if (updates.outcome) item.context.outcome = updates.outcome;
    if (updates.userFeedback) item.context.userFeedback = updates.userFeedback;
    if (updates.emotions) item.emotions = updates.emotions;
    if (updates.takeaways) item.takeaways = updates.takeaways;

    item.updatedAt = new Date().toISOString();
    this.items.set(id, item);

    return true;
  }

  /**
   * Get learning patterns and insights from episodes
   */
  getLearningInsights(): {
    successPatterns: string[];
    failurePatterns: string[];
    emotionalPatterns: Record<string, number>;
    topTakeaways: string[];
    improvementOpportunities: string[];
  } {
    const allItems = Array.from(this.items.values());

    const successfulEpisodes = allItems.filter(
      (item) => item.context.outcome === "successful"
    );
    const failedEpisodes = allItems.filter(
      (item) => item.context.outcome === "failed"
    );

    // Analyze patterns
    const successPatterns = this.extractPatterns(successfulEpisodes);
    const failurePatterns = this.extractPatterns(failedEpisodes);

    // Emotional patterns
    const emotionalPatterns: Record<string, number> = {};
    allItems.forEach((item) => {
      if (item.emotions) {
        emotionalPatterns[item.emotions] =
          (emotionalPatterns[item.emotions] || 0) + 1;
      }
    });

    // Most common takeaways
    const allTakeaways = allItems.flatMap((item) => item.takeaways);
    const takeawayFreq: Record<string, number> = {};
    allTakeaways.forEach((takeaway) => {
      takeawayFreq[takeaway] = (takeawayFreq[takeaway] || 0) + 1;
    });

    const topTakeaways = Object.entries(takeawayFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([takeaway]) => takeaway);

    // Improvement opportunities
    const improvementOpportunities =
      this.identifyImprovementOpportunities(allItems);

    return {
      successPatterns,
      failurePatterns,
      emotionalPatterns,
      topTakeaways,
      improvementOpportunities,
    };
  }

  /**
   * Get episodic memory statistics
   */
  getStats() {
    const allItems = Array.from(this.items.values());

    const outcomeDistribution: Record<string, number> = {};
    const emotionalPatterns: Record<string, number> = {};

    allItems.forEach((item) => {
      outcomeDistribution[item.context.outcome] =
        (outcomeDistribution[item.context.outcome] || 0) + 1;
      if (item.emotions) {
        emotionalPatterns[item.emotions] =
          (emotionalPatterns[item.emotions] || 0) + 1;
      }
    });

    const totalTakeaways = allItems.reduce(
      (sum, item) => sum + item.takeaways.length,
      0
    );
    const learningRate =
      allItems.length > 0 ? totalTakeaways / allItems.length : 0;

    return {
      totalEpisodes: allItems.length,
      outcomeDistribution,
      emotionalPatterns,
      learningRate,
      uniqueEpisodes: this.episodeIndex.size,
      averageTakeaways: learningRate,
    };
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return (
      "ep_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    );
  }

  private async generateTakeaways(
    userAction: string,
    systemResponse: string,
    outcome: EpisodicMemoryItem["context"]["outcome"]
  ): Promise<string[]> {
    const takeaways: string[] = [];

    // Simple heuristic-based takeaway generation
    if (outcome === "successful") {
      takeaways.push(`Successful approach: ${userAction.slice(0, 50)}...`);
      takeaways.push(`Effective response pattern identified`);
    } else if (outcome === "failed") {
      takeaways.push(`Avoid approach: ${userAction.slice(0, 50)}...`);
      takeaways.push(`Response needs improvement for this scenario`);
    }

    return takeaways;
  }

  private async linkRelatedEpisodes(
    newItem: EpisodicMemoryItem
  ): Promise<void> {
    const allItems = Array.from(this.items.values()).filter(
      (item) => item.id !== newItem.id
    );

    const relatedEpisodes: string[] = [];

    allItems.forEach((item) => {
      const similarity = this.calculateEpisodeSimilarity(newItem, item);
      if (similarity > 0.7) {
        // High similarity threshold
        relatedEpisodes.push(item.episodeId);

        // Also add this episode to the related item
        if (!item.relatedEpisodes.includes(newItem.episodeId)) {
          item.relatedEpisodes.push(newItem.episodeId);
          this.items.set(item.id, item);
        }
      }
    });

    newItem.relatedEpisodes = relatedEpisodes;
    this.items.set(newItem.id, newItem);
  }

  private calculateEpisodeSimilarity(
    a: EpisodicMemoryItem,
    b: EpisodicMemoryItem
  ): number {
    let similarity = 0;

    // Action similarity
    const actionSim = this.calculateTextSimilarity(
      a.context.userAction,
      b.context.userAction
    );
    similarity += actionSim * 0.4;

    // Outcome similarity
    if (a.context.outcome === b.context.outcome) {
      similarity += 0.3;
    }

    // Emotion similarity
    if (a.emotions === b.emotions) {
      similarity += 0.2;
    }

    // Tag overlap
    const commonTags = a.tags.filter((tag) => b.tags.includes(tag));
    const tagSimilarity =
      commonTags.length / Math.max(a.tags.length, b.tags.length, 1);
    similarity += tagSimilarity * 0.1;

    return Math.min(similarity, 1);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length, 1);
  }

  private async checkConsolidationOpportunities(
    newItem: EpisodicMemoryItem
  ): Promise<void> {
    // Check if we have enough similar episodes to consolidate into semantic memory
    const similarEpisodes = await this.getSimilarEpisodes(
      newItem.episodeId,
      10
    );

    if (similarEpisodes.length >= this.config.consolidationThreshold) {
      // TODO: Integrate with Semantic Memory Service to create knowledge
      console.log(
        `Consolidation opportunity: ${
          similarEpisodes.length + 1
        } similar episodes found`
      );
    }
  }

  private extractPatterns(episodes: EpisodicMemoryItem[]): string[] {
    const actionPatterns: Record<string, number> = {};

    episodes.forEach((episode) => {
      // Extract key words from user actions
      const words = episode.context.userAction
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3); // Filter out short words

      words.forEach((word) => {
        actionPatterns[word] = (actionPatterns[word] || 0) + 1;
      });
    });

    return Object.entries(actionPatterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => `${pattern} (${count} times)`);
  }

  private identifyImprovementOpportunities(
    episodes: EpisodicMemoryItem[]
  ): string[] {
    const opportunities: string[] = [];

    const failedEpisodes = episodes.filter(
      (item) => item.context.outcome === "failed"
    );
    const frustrationEpisodes = episodes.filter(
      (item) => item.emotions === "frustration"
    );

    if (failedEpisodes.length > episodes.length * 0.3) {
      opportunities.push(
        "High failure rate detected - review common failure patterns"
      );
    }

    if (frustrationEpisodes.length > episodes.length * 0.2) {
      opportunities.push(
        "User frustration patterns identified - improve response clarity"
      );
    }

    return opportunities;
  }

  private async enforceLimits(): Promise<void> {
    if (this.items.size <= this.config.maxEpisodes) return;

    const allItems = Array.from(this.items.values());

    // Sort by importance (successful outcomes, access count, recency)
    allItems.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (a.context.outcome === "successful") scoreA += 5;
      if (b.context.outcome === "successful") scoreB += 5;

      scoreA += a.accessCount;
      scoreB += b.accessCount;

      const ageA = Date.now() - new Date(a.createdAt).getTime();
      const ageB = Date.now() - new Date(b.createdAt).getTime();

      // Newer episodes get higher score
      scoreA -= ageA / (1000 * 60 * 60 * 24 * 7); // Decay by weeks
      scoreB -= ageB / (1000 * 60 * 60 * 24 * 7);

      return scoreB - scoreA;
    });

    // Remove least important episodes
    const itemsToRemove = allItems.slice(this.config.maxEpisodes);
    itemsToRemove.forEach((item) => {
      this.items.delete(item.id);

      // Clean up episode index
      const episodeSet = this.episodeIndex.get(item.episodeId);
      if (episodeSet) {
        episodeSet.delete(item.id);
        if (episodeSet.size === 0) {
          this.episodeIndex.delete(item.episodeId);
        }
      }
    });
  }
}
