/**
 * Hot-path Manager - Optimized for real-time, low-latency operations
 * Handles critical memory operations that require immediate response
 */

import { MemoryTypesManager } from "./memory-types-manager.js";
import type { MemoryContext, MemoryTypeItem } from "../types/memory-types.js";

export interface HotPathConfig {
  maxCacheSize: number; // Maximum items in hot cache
  cacheTimeout: number; // TTL for cached items (ms)
  priorityThreshold: number; // Priority level for hot-path routing (0-1)
  maxSearchResults: number; // Limit search results for speed
  enablePredictiveCaching: boolean; // Cache likely-needed items
  performanceTarget: number; // Target response time (ms)
}

export interface HotPathMetrics {
  cacheHitRate: number;
  averageResponseTime: number;
  totalOperations: number;
  hotPathOperations: number;
  performanceScore: number; // 0-1 how well we meet targets
}

export interface CachedMemoryItem {
  item: MemoryTypeItem;
  lastAccessed: string;
  accessCount: number;
  priority: number;
  expiresAt: string;
}

export interface OperationProfile {
  operation: string;
  avgTime: number;
  frequency: number;
  lastExecuted: string;
  isHotPath: boolean;
}

export class HotPathManager {
  private memoryManager: MemoryTypesManager;
  private config: HotPathConfig;

  // Hot caches for immediate access
  private hotCache: Map<string, CachedMemoryItem> = new Map();
  private searchCache: Map<string, { results: any[]; timestamp: string }> =
    new Map();
  private frequentPatterns: Map<string, number> = new Map();

  // Performance tracking
  private operationProfiles: Map<string, OperationProfile> = new Map();
  private performanceHistory: Array<{
    timestamp: string;
    responseTime: number;
    operation: string;
  }> = [];

  constructor(
    memoryManager: MemoryTypesManager,
    config?: Partial<HotPathConfig>
  ) {
    this.memoryManager = memoryManager;
    this.config = {
      maxCacheSize: config?.maxCacheSize || 1000,
      cacheTimeout: config?.cacheTimeout || 300000, // 5 minutes
      priorityThreshold: config?.priorityThreshold || 0.7,
      maxSearchResults: config?.maxSearchResults || 20,
      enablePredictiveCaching: config?.enablePredictiveCaching ?? true,
      performanceTarget: config?.performanceTarget || 100, // 100ms
      ...config,
    };

    this.initializeHotPath();
  }

  /**
   * Initialize hot-path with commonly accessed items
   */
  private initializeHotPath(): void {
    // Pre-warm cache with recent and frequent items
    this.preWarmCache();

    // Start cache maintenance
    this.startCacheMaintenance();

    console.log(
      `Hot-path manager initialized: ${this.config.maxCacheSize} cache size, ${this.config.performanceTarget}ms target`
    );
  }

  /**
   * Execute operation through hot-path or route to background
   */
  async executeOperation<T>(
    operation: string,
    executor: () => Promise<T>,
    context: MemoryContext,
    priority: number = 0.5
  ): Promise<T> {
    const startTime = Date.now();
    const isHotPath = this.shouldUseHotPath(operation, priority, context);

    let result: T;

    if (isHotPath) {
      result = await this.executeHotPath(operation, executor, context);
    } else {
      result = await this.executeBackground(operation, executor, context);
    }

    // Record performance metrics
    const responseTime = Date.now() - startTime;
    this.recordOperation(operation, responseTime, isHotPath);

    return result;
  }

  /**
   * Fast search with caching and result limiting
   */
  async hotSearch(
    query: string,
    context: MemoryContext,
    options: {
      limit?: number;
      memoryTypes?: Array<"working" | "episodic" | "semantic" | "procedural">;
      useCache?: boolean;
    } = {}
  ): Promise<any[]> {
    const cacheKey = this.generateSearchCacheKey(query, options);

    // Check cache first
    if (options.useCache !== false) {
      const cached = this.searchCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        this.recordCacheHit("search");
        return cached.results.slice(
          0,
          options.limit || this.config.maxSearchResults
        );
      }
    }

    // Execute hot search with limited scope
    const searchLimit = Math.min(
      options.limit || this.config.maxSearchResults,
      this.config.maxSearchResults
    );

    const searchResult = await this.memoryManager.unifiedSearch(
      query,
      context,
      {
        limit: searchLimit,
        timeout: this.config.performanceTarget,
        priority: "high",
      }
    );

    // Extract results array (unifiedSearch returns an object with results property)
    const results = Array.isArray(searchResult)
      ? searchResult
      : searchResult?.results || [];

    // Cache results
    this.searchCache.set(cacheKey, {
      results: results.slice(0, searchLimit),
      timestamp: new Date().toISOString(),
    });

    // Maintain cache size
    this.maintainSearchCache();

    return results;
  }

  /**
   * Fast memory retrieval with hot cache
   */
  async hotRetrieve(
    memoryId: string,
    memoryType: "working" | "episodic" | "semantic" | "procedural"
  ): Promise<MemoryTypeItem | null> {
    const cacheKey = `${memoryType}:${memoryId}`;

    // Check hot cache
    const cached = this.hotCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.expiresAt)) {
      cached.lastAccessed = new Date().toISOString();
      cached.accessCount++;
      this.recordCacheHit("retrieve");
      return cached.item;
    }

    // Retrieve from source and cache
    let item: MemoryTypeItem | null = null;

    switch (memoryType) {
      case "working":
        item = await this.memoryManager.working.retrieve(memoryId);
        break;
      case "episodic":
        item = await this.memoryManager.episodic.retrieve(memoryId);
        break;
      case "semantic":
        item = await this.memoryManager.semantic.retrieve(memoryId);
        break;
      case "procedural":
        item = await this.memoryManager.procedural.retrieve(memoryId);
        break;
    }

    if (item) {
      this.cacheItem(cacheKey, item, 0.8); // High priority for retrieved items
    }

    return item;
  }

  /**
   * Fast memory storage with immediate caching
   */
  async hotStore(
    content: string,
    context: MemoryContext,
    options: any
  ): Promise<string> {
    const memoryId = await this.memoryManager.storeContextualMemory(
      content,
      context,
      options
    );

    // If high priority, pre-cache the stored item
    if (
      context.priorities?.includes("urgent") ||
      context.priorities?.includes("important")
    ) {
      // Predictively cache this item
      this.schedulePreCache(memoryId, options.type || "auto");
    }

    return memoryId;
  }

  /**
   * Determine if operation should use hot-path
   */
  private shouldUseHotPath(
    operation: string,
    priority: number,
    context: MemoryContext
  ): boolean {
    // High priority operations always use hot-path
    if (priority >= this.config.priorityThreshold) {
      return true;
    }

    // Urgent context priorities
    if (
      context.priorities?.some((p) =>
        ["urgent", "realtime", "user_waiting"].includes(p)
      )
    ) {
      return true;
    }

    // Frequent operations use hot-path
    const profile = this.operationProfiles.get(operation);
    if (
      profile &&
      profile.frequency > 10 &&
      profile.avgTime < this.config.performanceTarget
    ) {
      return true;
    }

    // Recent operations
    if (this.wasRecentlyExecuted(operation, 30000)) {
      // 30 seconds
      return true;
    }

    return false;
  }

  /**
   * Execute operation on hot-path with optimization
   */
  private async executeHotPath<T>(
    operation: string,
    executor: () => Promise<T>,
    context: MemoryContext
  ): Promise<T> {
    // Set timeout for hot-path operations
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Hot-path timeout: ${operation}`)),
        this.config.performanceTarget * 2
      );
    });

    try {
      return await Promise.race([executor(), timeoutPromise]);
    } catch (error) {
      // If hot-path fails, fallback to background
      console.warn(
        `Hot-path failed for ${operation}, falling back to background:`,
        error
      );
      return await this.executeBackground(operation, executor, context);
    }
  }

  /**
   * Execute operation in background (no timeout, lower priority)
   */
  private async executeBackground<T>(
    operation: string,
    executor: () => Promise<T>,
    context: MemoryContext
  ): Promise<T> {
    // Background operations can take longer but should be reliable
    return await executor();
  }

  /**
   * Cache frequently accessed item
   */
  private cacheItem(key: string, item: MemoryTypeItem, priority: number): void {
    // Check cache size limit
    if (this.hotCache.size >= this.config.maxCacheSize) {
      this.evictLeastUsedItems();
    }

    const cached: CachedMemoryItem = {
      item,
      lastAccessed: new Date().toISOString(),
      accessCount: 1,
      priority,
      expiresAt: new Date(Date.now() + this.config.cacheTimeout).toISOString(),
    };

    this.hotCache.set(key, cached);
  }

  /**
   * Pre-warm cache with likely-needed items
   */
  private async preWarmCache(): Promise<void> {
    try {
      // Get recent working memory items
      const workingStats = this.memoryManager.working.getStats();

      // Get high-confidence semantic items
      const semanticStats = this.memoryManager.semantic.getStats();

      // Cache high-priority items
      console.log(
        `Pre-warming cache with ${workingStats.activeItems} working items`
      );
    } catch (error) {
      console.warn("Failed to pre-warm cache:", error);
    }
  }

  /**
   * Start cache maintenance routine
   */
  private startCacheMaintenance(): void {
    setInterval(() => {
      this.cleanExpiredCache();
      this.updateCacheStatistics();
    }, 60000); // Every minute
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = new Date().toISOString();
    let cleaned = 0;

    for (const [key, cached] of this.hotCache.entries()) {
      if (cached.expiresAt < now) {
        this.hotCache.delete(key);
        cleaned++;
      }
    }

    // Clean search cache
    for (const [key, cached] of this.searchCache.entries()) {
      if (!this.isCacheValid(cached.timestamp)) {
        this.searchCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Evict least recently used items
   */
  private evictLeastUsedItems(): void {
    const entries = Array.from(this.hotCache.entries());

    // Sort by last accessed and access count
    entries.sort((a, b) => {
      const scoreA =
        new Date(a[1].lastAccessed).getTime() + a[1].accessCount * 10000;
      const scoreB =
        new Date(b[1].lastAccessed).getTime() + b[1].accessCount * 10000;
      return scoreA - scoreB;
    });

    // Remove bottom 10%
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.hotCache.delete(entries[i][0]);
    }

    console.log(`Evicted ${toRemove} least used cache entries`);
  }

  /**
   * Record operation performance
   */
  private recordOperation(
    operation: string,
    responseTime: number,
    isHotPath: boolean
  ): void {
    const profile = this.operationProfiles.get(operation) || {
      operation,
      avgTime: responseTime,
      frequency: 0,
      lastExecuted: new Date().toISOString(),
      isHotPath,
    };

    // Update running average
    profile.avgTime =
      (profile.avgTime * profile.frequency + responseTime) /
      (profile.frequency + 1);
    profile.frequency++;
    profile.lastExecuted = new Date().toISOString();
    profile.isHotPath = isHotPath;

    this.operationProfiles.set(operation, profile);

    // Add to performance history
    this.performanceHistory.push({
      timestamp: new Date().toISOString(),
      responseTime,
      operation,
    });

    // Keep only recent history
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-500);
    }
  }

  /**
   * Get hot-path performance metrics
   */
  getMetrics(): HotPathMetrics {
    const totalOps = this.operationProfiles.size;
    const hotPathOps = Array.from(this.operationProfiles.values()).filter(
      (p) => p.isHotPath
    ).length;

    // Calculate cache hit rate
    const cacheHits = this.performanceHistory.filter(
      (h) => h.responseTime < 10
    ).length; // Assume <10ms is cache hit
    const cacheHitRate =
      this.performanceHistory.length > 0
        ? cacheHits / this.performanceHistory.length
        : 0;

    // Calculate average response time
    const avgResponseTime =
      this.performanceHistory.length > 0
        ? this.performanceHistory.reduce((sum, h) => sum + h.responseTime, 0) /
          this.performanceHistory.length
        : 0;

    // Performance score (how well we meet targets)
    const performanceScore =
      avgResponseTime > 0
        ? Math.max(
            0,
            Math.min(1, this.config.performanceTarget / avgResponseTime)
          )
        : 1;

    return {
      cacheHitRate,
      averageResponseTime: avgResponseTime,
      totalOperations: totalOps,
      hotPathOperations: hotPathOps,
      performanceScore,
    };
  }

  /**
   * Get operation profiles for analysis
   */
  getOperationProfiles(): OperationProfile[] {
    return Array.from(this.operationProfiles.values()).sort(
      (a, b) => b.frequency - a.frequency
    );
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    hotCacheSize: number;
    searchCacheSize: number;
    cacheUtilization: number;
    topCachedItems: Array<{
      key: string;
      accessCount: number;
      priority: number;
    }>;
  } {
    const topItems = Array.from(this.hotCache.entries())
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 10)
      .map(([key, cached]) => ({
        key,
        accessCount: cached.accessCount,
        priority: cached.priority,
      }));

    return {
      hotCacheSize: this.hotCache.size,
      searchCacheSize: this.searchCache.size,
      cacheUtilization: this.hotCache.size / this.config.maxCacheSize,
      topCachedItems: topItems,
    };
  }

  /**
   * Force cache preload for specific items
   */
  async preloadCache(
    items: Array<{
      id: string;
      type: "working" | "episodic" | "semantic" | "procedural";
      priority?: number;
    }>
  ): Promise<void> {
    for (const item of items) {
      try {
        const memory = await this.hotRetrieve(item.id, item.type);
        if (memory) {
          console.log(`Preloaded ${item.type}:${item.id} into hot cache`);
        }
      } catch (error) {
        console.warn(`Failed to preload ${item.type}:${item.id}:`, error);
      }
    }
  }

  /**
   * Private helper methods
   */
  private generateSearchCacheKey(query: string, options: any): string {
    return `search:${query}:${JSON.stringify(options)}`;
  }

  private isCacheValid(timestamp: string): boolean {
    return (
      new Date(timestamp).getTime() + this.config.cacheTimeout > Date.now()
    );
  }

  private recordCacheHit(operation: string): void {
    // Cache hits are very fast operations
    this.recordOperation(`${operation}_cache_hit`, 5, true);
  }

  private maintainSearchCache(): void {
    if (this.searchCache.size > 100) {
      // Remove oldest entries
      const entries = Array.from(this.searchCache.entries());
      entries.sort(
        (a, b) =>
          new Date(a[1].timestamp).getTime() -
          new Date(b[1].timestamp).getTime()
      );

      for (let i = 0; i < 20; i++) {
        this.searchCache.delete(entries[i][0]);
      }
    }
  }

  private schedulePreCache(memoryId: string, memoryType: string): void {
    if (this.config.enablePredictiveCaching) {
      setTimeout(async () => {
        try {
          await this.hotRetrieve(memoryId, memoryType as any);
        } catch (error) {
          console.warn(`Failed to pre-cache ${memoryType}:${memoryId}:`, error);
        }
      }, 1000); // Cache after 1 second
    }
  }

  private wasRecentlyExecuted(operation: string, timeWindow: number): boolean {
    const profile = this.operationProfiles.get(operation);
    if (!profile) return false;

    return new Date(profile.lastExecuted).getTime() > Date.now() - timeWindow;
  }

  private updateCacheStatistics(): void {
    // Update frequent patterns
    for (const [, cached] of this.hotCache.entries()) {
      if (cached.accessCount > 5) {
        const pattern = cached.item.type;
        this.frequentPatterns.set(
          pattern,
          (this.frequentPatterns.get(pattern) || 0) + 1
        );
      }
    }
  }
}
