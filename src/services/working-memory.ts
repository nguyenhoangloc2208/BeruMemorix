/**
 * Working Memory Service - Handles immediate conversation context
 * Based on cognitive science: short-term, limited capacity, session-based
 */

import type {
  WorkingMemoryItem,
  WorkingMemorySearch,
  MemoryContext,
  MemoryTypeSearchResult,
  MemoryTypesConfig,
} from "../types/memory-types.js";

export class WorkingMemoryService {
  private items: Map<string, WorkingMemoryItem> = new Map();
  private sessionItems: Map<string, Set<string>> = new Map(); // sessionId -> itemIds
  private config: MemoryTypesConfig["workingMemory"];

  constructor(config?: Partial<MemoryTypesConfig["workingMemory"]>) {
    this.config = {
      maxItems: config?.maxItems || 50,
      sessionTTL: config?.sessionTTL || 60, // 1 hour default
      priorities: {
        highPriorityTTL: config?.priorities?.highPriorityTTL || 120, // 2 hours
        lowPriorityTTL: config?.priorities?.lowPriorityTTL || 30, // 30 minutes
      },
    };

    // Start cleanup interval
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Store an item in working memory
   */
  async store(
    content: string,
    context: MemoryContext,
    options: {
      priority?: WorkingMemoryItem["priority"];
      contextType?: WorkingMemoryItem["contextType"];
      relatedMemoryIds?: string[];
      customTTL?: number; // Custom time-to-live in minutes
    } = {}
  ): Promise<string> {
    const now = new Date().toISOString();
    const priority = options.priority || 3;
    const contextType = options.contextType || "temporary_note";

    // Calculate expiration based on priority and custom TTL
    const ttlMinutes =
      options.customTTL ||
      (priority <= 2
        ? this.config.priorities.highPriorityTTL
        : this.config.priorities.lowPriorityTTL);

    const expiresAt = new Date(
      Date.now() + ttlMinutes * 60 * 1000
    ).toISOString();

    const id = this.generateId();
    const item: WorkingMemoryItem = {
      id,
      type: "working",
      content,
      sessionId: context.sessionId,
      conversationId: context.conversationId,
      priority,
      contextType,
      expiresAt,
      relatedMemoryIds: options.relatedMemoryIds || [],
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now,
    };

    // Store the item
    this.items.set(id, item);

    // Track by session
    if (!this.sessionItems.has(context.sessionId)) {
      this.sessionItems.set(context.sessionId, new Set());
    }
    this.sessionItems.get(context.sessionId)!.add(id);

    // Enforce memory limits
    await this.enforceLimits();

    return id;
  }

  /**
   * Retrieve a specific working memory item
   */
  async retrieve(id: string): Promise<WorkingMemoryItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    // Check if expired
    if (this.isExpired(item)) {
      this.items.delete(id);
      this.removeFromSession(item.sessionId, id);
      return null;
    }

    // Update access tracking
    item.accessCount++;
    item.lastAccessed = new Date().toISOString();
    this.items.set(id, item);

    return item;
  }

  /**
   * Search working memory
   */
  async search(
    query: string,
    searchOptions: WorkingMemorySearch = {},
    limit: number = 10
  ): Promise<MemoryTypeSearchResult<WorkingMemoryItem>> {
    const startTime = Date.now();
    let results: WorkingMemoryItem[] = [];

    // Get all non-expired items
    const allItems = Array.from(this.items.values()).filter(
      (item) => !this.isExpired(item)
    );

    // Apply filters
    let filteredItems = allItems;

    if (searchOptions.sessionId) {
      filteredItems = filteredItems.filter(
        (item) => item.sessionId === searchOptions.sessionId
      );
    }

    if (searchOptions.conversationId) {
      filteredItems = filteredItems.filter(
        (item) => item.conversationId === searchOptions.conversationId
      );
    }

    if (searchOptions.priority) {
      filteredItems = filteredItems.filter(
        (item) => item.priority === searchOptions.priority
      );
    }

    if (searchOptions.contextType) {
      filteredItems = filteredItems.filter(
        (item) => item.contextType === searchOptions.contextType
      );
    }

    if (searchOptions.notExpired !== undefined && searchOptions.notExpired) {
      filteredItems = filteredItems.filter((item) => !this.isExpired(item));
    }

    // Text search
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      filteredItems = filteredItems.filter((item) =>
        item.content.toLowerCase().includes(queryLower)
      );
    }

    // Sort by priority (high priority first), then by recency
    filteredItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    results = filteredItems.slice(0, limit);

    // Update access count for retrieved items
    results.forEach((item) => {
      item.accessCount++;
      item.lastAccessed = new Date().toISOString();
      this.items.set(item.id, item);
    });

    return {
      items: results,
      count: results.length,
      searchType: "working_memory",
      executionTime: Date.now() - startTime,
      context: {
        sessionId: searchOptions.sessionId || "unknown",
        conversationId: searchOptions.conversationId || "unknown",
        timestamp: new Date().toISOString(),
        priorities: ["immediate_context"],
      },
    };
  }

  /**
   * Get current session context (most recent and highest priority items)
   */
  async getSessionContext(
    sessionId: string,
    limit: number = 5
  ): Promise<WorkingMemoryItem[]> {
    const sessionItemIds = this.sessionItems.get(sessionId) || new Set();
    const sessionItems = Array.from(sessionItemIds)
      .map((id) => this.items.get(id))
      .filter(
        (item): item is WorkingMemoryItem =>
          item !== undefined && !this.isExpired(item)
      );

    // Sort by priority and recency
    sessionItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return sessionItems.slice(0, limit);
  }

  /**
   * Update priority of an item (e.g., when it becomes more relevant)
   */
  async updatePriority(
    id: string,
    newPriority: WorkingMemoryItem["priority"]
  ): Promise<boolean> {
    const item = this.items.get(id);
    if (!item || this.isExpired(item)) return false;

    item.priority = newPriority;
    item.updatedAt = new Date().toISOString();

    // Recalculate expiration based on new priority
    const ttlMinutes =
      newPriority <= 2
        ? this.config.priorities.highPriorityTTL
        : this.config.priorities.lowPriorityTTL;

    item.expiresAt = new Date(
      Date.now() + ttlMinutes * 60 * 1000
    ).toISOString();

    this.items.set(id, item);
    return true;
  }

  /**
   * Clear all working memory for a session
   */
  async clearSession(sessionId: string): Promise<number> {
    const sessionItemIds = this.sessionItems.get(sessionId) || new Set();
    let deletedCount = 0;

    sessionItemIds.forEach((id) => {
      if (this.items.delete(id)) {
        deletedCount++;
      }
    });

    this.sessionItems.delete(sessionId);
    return deletedCount;
  }

  /**
   * Get working memory statistics
   */
  getStats() {
    const allItems = Array.from(this.items.values());
    const activeItems = allItems.filter((item) => !this.isExpired(item));

    const priorityDistribution: Record<number, number> = {};
    const contextTypeUsage: Record<string, number> = {};

    activeItems.forEach((item) => {
      priorityDistribution[item.priority] =
        (priorityDistribution[item.priority] || 0) + 1;
      contextTypeUsage[item.contextType] =
        (contextTypeUsage[item.contextType] || 0) + 1;
    });

    const sessionLengths = Array.from(this.sessionItems.values()).map(
      (set) => set.size
    );
    const averageSessionLength =
      sessionLengths.length > 0
        ? sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length
        : 0;

    return {
      totalItems: allItems.length,
      activeItems: activeItems.length,
      expiredItems: allItems.length - activeItems.length,
      currentLoad: activeItems.length / this.config.maxItems,
      averageSessionLength,
      priorityDistribution,
      contextTypeUsage,
      activeSessions: this.sessionItems.size,
    };
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return (
      "wm_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    );
  }

  private isExpired(item: WorkingMemoryItem): boolean {
    return new Date() > new Date(item.expiresAt);
  }

  private removeFromSession(sessionId: string, itemId: string): void {
    const sessionSet = this.sessionItems.get(sessionId);
    if (sessionSet) {
      sessionSet.delete(itemId);
      if (sessionSet.size === 0) {
        this.sessionItems.delete(sessionId);
      }
    }
  }

  private async cleanup(): Promise<void> {
    const expiredIds: string[] = [];

    // Find expired items
    this.items.forEach((item, id) => {
      if (this.isExpired(item)) {
        expiredIds.push(id);
      }
    });

    // Remove expired items
    expiredIds.forEach((id) => {
      const item = this.items.get(id);
      if (item) {
        this.items.delete(id);
        this.removeFromSession(item.sessionId, id);
      }
    });

    console.log(
      `Working Memory: Cleaned up ${expiredIds.length} expired items`
    );
  }

  private async enforceLimits(): Promise<void> {
    const activeItems = Array.from(this.items.values()).filter(
      (item) => !this.isExpired(item)
    );

    if (activeItems.length <= this.config.maxItems) return;

    // Sort by priority (keep high priority) and access patterns
    activeItems.sort((a, b) => {
      // Prioritize by priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher number = lower priority = more likely to remove
      }

      // Then by access count and recency
      const aScore =
        a.accessCount +
        (Date.now() - new Date(a.lastAccessed).getTime()) / 1000;
      const bScore =
        b.accessCount +
        (Date.now() - new Date(b.lastAccessed).getTime()) / 1000;

      return bScore - aScore; // Remove least accessed and oldest first
    });

    // Remove excess items
    const itemsToRemove = activeItems.slice(this.config.maxItems);
    itemsToRemove.forEach((item) => {
      this.items.delete(item.id);
      this.removeFromSession(item.sessionId, item.id);
    });
  }
}
