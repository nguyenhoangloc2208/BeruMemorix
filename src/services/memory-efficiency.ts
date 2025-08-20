/**
 * Memory Efficiency Optimizer
 * Optimizes memory usage, storage efficiency, and system performance
 */

import { MemoryTypesManager } from "./memory-types-manager.js";
import { HotPathManager } from "./hotpath-manager.js";
import type { MemoryTypeItem, MemoryContext } from "../types/memory-types.js";

export interface EfficiencyConfig {
  compressionEnabled: boolean;
  compressionThreshold: number; // bytes, compress items larger than this
  deduplicationEnabled: boolean;
  deduplicationThreshold: number; // similarity threshold for duplicates
  cacheOptimization: boolean;
  accessPrediction: boolean;
  resourceMonitoring: boolean;
  autoTuning: boolean;
  garbageCollection: {
    enabled: boolean;
    interval: number; // ms
    aggressiveness: number; // 0-1
  };
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
}

export interface DeduplicationResult {
  duplicatesFound: number;
  duplicatesRemoved: number;
  spaceSaved: number;
  similarityThreshold: number;
}

export interface EfficiencyMetrics {
  totalMemoryUsage: number; // bytes
  compressionRatio: number;
  deduplicationSavings: number;
  cacheHitRate: number;
  accessPredictionAccuracy: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    io: number;
  };
  performanceGains: {
    responseTime: number; // improvement percentage
    throughput: number; // improvement percentage
  };
}

export interface OptimizationRecommendation {
  type:
    | "compression"
    | "deduplication"
    | "caching"
    | "access_pattern"
    | "resource";
  priority: "low" | "medium" | "high" | "critical";
  description: string;
  expectedImpact: number; // 0-1
  implementationCost: number; // 0-1
  autoApplicable: boolean;
}

export interface StorageAnalysis {
  totalItems: number;
  totalSize: number;
  averageItemSize: number;
  compressionPotential: number;
  deduplicationPotential: number;
  unusedSpace: number;
  hotData: number; // frequently accessed
  coldData: number; // rarely accessed
}

export class MemoryEfficiencyOptimizer {
  private memoryManager: MemoryTypesManager;
  private hotPathManager?: HotPathManager;
  private config: EfficiencyConfig;

  // Compression and storage
  private compressionCache: Map<string, CompressionResult> = new Map();
  private deduplicationIndex: Map<string, string[]> = new Map(); // hash -> memory IDs
  private sizeTracking: Map<string, number> = new Map();

  // Access pattern tracking
  private accessPatterns: Map<
    string,
    {
      frequency: number;
      lastAccess: string;
      predictedNext: string[];
      pattern: "sequential" | "random" | "temporal" | "associative";
    }
  > = new Map();

  // Resource monitoring
  private resourceHistory: Array<{
    timestamp: string;
    cpu: number;
    memory: number;
    io: number;
  }> = [];

  // Optimization history
  private optimizationHistory: Array<{
    timestamp: string;
    type: string;
    impact: number;
    cost: number;
  }> = [];

  constructor(
    memoryManager: MemoryTypesManager,
    config?: Partial<EfficiencyConfig>
  ) {
    this.memoryManager = memoryManager;
    this.config = {
      compressionEnabled: config?.compressionEnabled ?? true,
      compressionThreshold: config?.compressionThreshold || 1024, // 1KB
      deduplicationEnabled: config?.deduplicationEnabled ?? true,
      deduplicationThreshold: config?.deduplicationThreshold || 0.95,
      cacheOptimization: config?.cacheOptimization ?? true,
      accessPrediction: config?.accessPrediction ?? true,
      resourceMonitoring: config?.resourceMonitoring ?? true,
      autoTuning: config?.autoTuning ?? true,
      garbageCollection: {
        enabled: config?.garbageCollection?.enabled ?? true,
        interval: config?.garbageCollection?.interval || 300000, // 5 minutes
        aggressiveness: config?.garbageCollection?.aggressiveness || 0.5,
        ...config?.garbageCollection,
      },
      ...config,
    };

    this.initializeOptimizer();
  }

  /**
   * Set hot path manager for integration
   */
  setHotPathManager(hotPathManager: HotPathManager): void {
    this.hotPathManager = hotPathManager;
  }

  /**
   * Run comprehensive memory optimization
   */
  async optimizeMemorySystem(
    options: {
      aggressiveMode?: boolean;
      targetMemoryReduction?: number; // 0-1, percentage
      preservePerformance?: boolean;
    } = {}
  ): Promise<{
    compressionResults: CompressionResult;
    deduplicationResults: DeduplicationResult;
    cacheOptimization: any;
    resourceOptimization: any;
    totalSavings: number;
    performanceImpact: number;
  }> {
    console.log("Starting comprehensive memory optimization...");

    const startTime = Date.now();
    const initialMetrics = await this.getEfficiencyMetrics();

    // Step 1: Storage optimization
    const compressionResults = await this.optimizeCompression(
      options.aggressiveMode
    );
    const deduplicationResults = await this.optimizeDeduplication(
      options.aggressiveMode
    );

    // Step 2: Cache optimization
    const cacheOptimization = await this.optimizeCache();

    // Step 3: Resource optimization
    const resourceOptimization = await this.optimizeResourceUsage();

    // Step 4: Access pattern optimization
    await this.optimizeAccessPatterns();

    // Step 5: Garbage collection
    if (this.config.garbageCollection.enabled) {
      await this.runGarbageCollection(
        options.aggressiveMode
          ? 0.8
          : this.config.garbageCollection.aggressiveness
      );
    }

    const finalMetrics = await this.getEfficiencyMetrics();
    const totalSavings =
      (initialMetrics.totalMemoryUsage - finalMetrics.totalMemoryUsage) /
      initialMetrics.totalMemoryUsage;
    const performanceImpact = this.calculatePerformanceImpact(
      initialMetrics,
      finalMetrics
    );

    const duration = Date.now() - startTime;
    console.log(
      `Memory optimization completed in ${duration}ms: ${(
        totalSavings * 100
      ).toFixed(1)}% space saved`
    );

    return {
      compressionResults,
      deduplicationResults,
      cacheOptimization,
      resourceOptimization,
      totalSavings,
      performanceImpact,
    };
  }

  /**
   * Optimize storage compression
   */
  async optimizeCompression(
    aggressiveMode = false
  ): Promise<CompressionResult> {
    if (!this.config.compressionEnabled) {
      return {
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 1,
        algorithm: "none",
      };
    }

    console.log("Optimizing storage compression...");

    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    let itemsCompressed = 0;

    // Get all memories for compression analysis
    const memories = await this.getAllMemories();

    for (const memory of memories) {
      const memorySize = this.estimateMemorySize(memory);

      if (memorySize > this.config.compressionThreshold) {
        const compressionResult = await this.compressMemoryItem(
          memory,
          aggressiveMode
        );

        if (compressionResult.compressionRatio < 0.9) {
          // Only if significant compression
          totalOriginalSize += compressionResult.originalSize;
          totalCompressedSize += compressionResult.compressedSize;
          itemsCompressed++;

          // Cache compression result
          this.compressionCache.set(memory.id, compressionResult);
        }
      }
    }

    const overallRatio =
      totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1;

    console.log(
      `Compressed ${itemsCompressed} items, ${(overallRatio * 100).toFixed(
        1
      )}% compression ratio`
    );

    return {
      originalSize: totalOriginalSize,
      compressedSize: totalCompressedSize,
      compressionRatio: overallRatio,
      algorithm: aggressiveMode ? "lzma" : "gzip",
    };
  }

  /**
   * Optimize deduplication
   */
  async optimizeDeduplication(
    aggressiveMode = false
  ): Promise<DeduplicationResult> {
    if (!this.config.deduplicationEnabled) {
      return {
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        spaceSaved: 0,
        similarityThreshold: 0,
      };
    }

    console.log("Optimizing memory deduplication...");

    const memories = await this.getAllMemories();
    const duplicateGroups = await this.findDuplicateGroups(
      memories,
      aggressiveMode
    );

    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    let spaceSaved = 0;

    for (const group of duplicateGroups) {
      if (group.length > 1) {
        duplicatesFound += group.length - 1;

        // Keep the most recent or highest quality memory
        const toKeep = this.selectBestMemoryFromGroup(group);
        const toRemove = group.filter((m) => m.id !== toKeep.id);

        for (const memory of toRemove) {
          spaceSaved += this.estimateMemorySize(memory);
          await this.markForDeletion(memory);
          duplicatesRemoved++;
        }
      }
    }

    console.log(
      `Found ${duplicatesFound} duplicates, removed ${duplicatesRemoved}, saved ${spaceSaved} bytes`
    );

    return {
      duplicatesFound,
      duplicatesRemoved,
      spaceSaved,
      similarityThreshold: this.config.deduplicationThreshold,
    };
  }

  /**
   * Optimize cache performance
   */
  async optimizeCache(): Promise<{
    beforeHitRate: number;
    afterHitRate: number;
    cacheSize: number;
    evictedItems: number;
  }> {
    if (!this.config.cacheOptimization || !this.hotPathManager) {
      return {
        beforeHitRate: 0,
        afterHitRate: 0,
        cacheSize: 0,
        evictedItems: 0,
      };
    }

    console.log("Optimizing cache performance...");

    const beforeStats = this.hotPathManager.getCacheStats();
    const beforeMetrics = this.hotPathManager.getMetrics();

    // Analyze access patterns for better caching
    const accessAnalysis = await this.analyzeAccessPatterns();

    // Preload frequently accessed items
    const frequentItems = accessAnalysis.frequent.slice(0, 50);
    await this.hotPathManager.preloadCache(frequentItems);

    // Remove rarely accessed items from cache
    let evictedItems = 0;
    const rareItems = accessAnalysis.rare;
    for (const item of rareItems) {
      // Implementation would evict from cache
      evictedItems++;
    }

    // Wait for new metrics
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const afterMetrics = this.hotPathManager.getMetrics();

    console.log(
      `Cache optimized: ${beforeMetrics.cacheHitRate} -> ${afterMetrics.cacheHitRate} hit rate`
    );

    return {
      beforeHitRate: beforeMetrics.cacheHitRate,
      afterHitRate: afterMetrics.cacheHitRate,
      cacheSize: beforeStats.hotCacheSize,
      evictedItems,
    };
  }

  /**
   * Optimize resource usage
   */
  async optimizeResourceUsage(): Promise<{
    cpuOptimization: number;
    memoryOptimization: number;
    ioOptimization: number;
    recommendations: OptimizationRecommendation[];
  }> {
    console.log("Optimizing resource usage...");

    const currentUsage = await this.getCurrentResourceUsage();
    const recommendations: OptimizationRecommendation[] = [];

    // CPU optimization
    let cpuOptimization = 0;
    if (currentUsage.cpu > 0.8) {
      cpuOptimization = await this.optimizeCPUUsage();
      recommendations.push({
        type: "resource",
        priority: "high",
        description: "Reduce CPU-intensive operations during peak times",
        expectedImpact: 0.3,
        implementationCost: 0.2,
        autoApplicable: true,
      });
    }

    // Memory optimization
    let memoryOptimization = 0;
    if (currentUsage.memory > 0.7) {
      memoryOptimization = await this.optimizeMemoryUsage();
      recommendations.push({
        type: "resource",
        priority: "medium",
        description: "Implement more aggressive garbage collection",
        expectedImpact: 0.4,
        implementationCost: 0.1,
        autoApplicable: true,
      });
    }

    // I/O optimization
    let ioOptimization = 0;
    if (currentUsage.io > 0.6) {
      ioOptimization = await this.optimizeIOUsage();
      recommendations.push({
        type: "access_pattern",
        priority: "medium",
        description: "Batch I/O operations to reduce disk access",
        expectedImpact: 0.5,
        implementationCost: 0.3,
        autoApplicable: false,
      });
    }

    return {
      cpuOptimization,
      memoryOptimization,
      ioOptimization,
      recommendations,
    };
  }

  /**
   * Optimize access patterns
   */
  async optimizeAccessPatterns(): Promise<void> {
    if (!this.config.accessPrediction) return;

    console.log("Optimizing access patterns...");

    // Analyze current access patterns
    const patterns = await this.analyzeAccessPatterns();

    // Update prediction models
    await this.updatePredictionModels(patterns);

    // Optimize based on patterns
    for (const [memoryId, pattern] of this.accessPatterns.entries()) {
      if (pattern.pattern === "sequential") {
        // Preload next items in sequence
        await this.preloadSequentialItems(memoryId, pattern.predictedNext);
      } else if (pattern.pattern === "associative") {
        // Preload associated items
        await this.preloadAssociatedItems(memoryId, pattern.predictedNext);
      }
    }
  }

  /**
   * Run garbage collection
   */
  async runGarbageCollection(aggressiveness = 0.5): Promise<{
    itemsCollected: number;
    spaceSaved: number;
    timeSpent: number;
  }> {
    console.log(
      `Running garbage collection (aggressiveness: ${aggressiveness})...`
    );

    const startTime = Date.now();
    let itemsCollected = 0;
    let spaceSaved = 0;

    // Collect expired working memories
    const expiredWorking = await this.collectExpiredWorkingMemories();
    itemsCollected += expiredWorking.count;
    spaceSaved += expiredWorking.size;

    // Collect stale semantic memories
    if (aggressiveness > 0.3) {
      const staleSemantics = await this.collectStaleSemanticMemories(
        aggressiveness
      );
      itemsCollected += staleSemantics.count;
      spaceSaved += staleSemantics.size;
    }

    // Collect unused procedural memories
    if (aggressiveness > 0.6) {
      const unusedProcedurals = await this.collectUnusedProceduralMemories(
        aggressiveness
      );
      itemsCollected += unusedProcedurals.count;
      spaceSaved += unusedProcedurals.size;
    }

    // Clean up optimization caches
    this.cleanupOptimizationCaches();

    const timeSpent = Date.now() - startTime;
    console.log(
      `Garbage collection completed: ${itemsCollected} items collected, ${spaceSaved} bytes saved in ${timeSpent}ms`
    );

    return { itemsCollected, spaceSaved, timeSpent };
  }

  /**
   * Get comprehensive efficiency metrics
   */
  async getEfficiencyMetrics(): Promise<EfficiencyMetrics> {
    const analysis = await this.analyzeStorageEfficiency();
    const resourceUsage = await this.getCurrentResourceUsage();

    return {
      totalMemoryUsage: analysis.totalSize,
      compressionRatio: this.calculateOverallCompressionRatio(),
      deduplicationSavings: this.calculateDeduplicationSavings(),
      cacheHitRate: this.hotPathManager?.getMetrics().cacheHitRate || 0,
      accessPredictionAccuracy: this.calculatePredictionAccuracy(),
      resourceUtilization: resourceUsage,
      performanceGains: {
        responseTime: this.calculateResponseTimeImprovement(),
        throughput: this.calculateThroughputImprovement(),
      },
    };
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<
    OptimizationRecommendation[]
  > {
    const recommendations: OptimizationRecommendation[] = [];
    const metrics = await this.getEfficiencyMetrics();
    const analysis = await this.analyzeStorageEfficiency();

    // Compression recommendations
    if (analysis.compressionPotential > 0.2) {
      recommendations.push({
        type: "compression",
        priority: "medium",
        description: `${(analysis.compressionPotential * 100).toFixed(
          1
        )}% compression potential available`,
        expectedImpact: analysis.compressionPotential,
        implementationCost: 0.1,
        autoApplicable: true,
      });
    }

    // Deduplication recommendations
    if (analysis.deduplicationPotential > 0.15) {
      recommendations.push({
        type: "deduplication",
        priority: "high",
        description: `${(analysis.deduplicationPotential * 100).toFixed(
          1
        )}% duplicate content detected`,
        expectedImpact: analysis.deduplicationPotential,
        implementationCost: 0.2,
        autoApplicable: true,
      });
    }

    // Cache recommendations
    if (metrics.cacheHitRate < 0.6) {
      recommendations.push({
        type: "caching",
        priority: "high",
        description: "Low cache hit rate - optimize cache strategy",
        expectedImpact: 0.4,
        implementationCost: 0.3,
        autoApplicable: false,
      });
    }

    // Resource recommendations
    if (metrics.resourceUtilization.memory > 0.8) {
      recommendations.push({
        type: "resource",
        priority: "critical",
        description: "High memory usage - implement aggressive cleanup",
        expectedImpact: 0.6,
        implementationCost: 0.1,
        autoApplicable: true,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Private helper methods
   */
  private initializeOptimizer(): void {
    // Start resource monitoring
    if (this.config.resourceMonitoring) {
      this.startResourceMonitoring();
    }

    // Start garbage collection
    if (this.config.garbageCollection.enabled) {
      this.startGarbageCollectionScheduler();
    }

    console.log("Memory efficiency optimizer initialized");
  }

  private startResourceMonitoring(): void {
    setInterval(async () => {
      const usage = await this.getCurrentResourceUsage();
      this.resourceHistory.push({
        timestamp: new Date().toISOString(),
        ...usage,
      });

      // Keep only last 100 readings
      if (this.resourceHistory.length > 100) {
        this.resourceHistory = this.resourceHistory.slice(-50);
      }
    }, 10000); // Every 10 seconds
  }

  private startGarbageCollectionScheduler(): void {
    setInterval(async () => {
      await this.runGarbageCollection(
        this.config.garbageCollection.aggressiveness
      );
    }, this.config.garbageCollection.interval);
  }

  private async getAllMemories(): Promise<MemoryTypeItem[]> {
    // Placeholder - would retrieve from all memory types
    return [];
  }

  private estimateMemorySize(memory: MemoryTypeItem): number {
    // Simple size estimation based on content length
    const content = JSON.stringify(memory);
    return new Blob([content]).size;
  }

  private async compressMemoryItem(
    memory: MemoryTypeItem,
    aggressive = false
  ): Promise<CompressionResult> {
    const originalContent = JSON.stringify(memory);
    const originalSize = new Blob([originalContent]).size;

    // Simulate compression (in production would use actual compression libraries)
    const compressionRatio = aggressive ? 0.3 : 0.6;
    const compressedSize = Math.floor(originalSize * compressionRatio);

    return {
      originalSize,
      compressedSize,
      compressionRatio,
      algorithm: aggressive ? "lzma" : "gzip",
    };
  }

  private async findDuplicateGroups(
    memories: MemoryTypeItem[],
    aggressive = false
  ): Promise<MemoryTypeItem[][]> {
    const groups: MemoryTypeItem[][] = [];
    const threshold = aggressive ? 0.8 : this.config.deduplicationThreshold;

    // Simple duplicate detection based on content similarity
    const processed = new Set<string>();

    for (const memory of memories) {
      if (processed.has(memory.id)) continue;

      const group = [memory];
      processed.add(memory.id);

      for (const candidate of memories) {
        if (processed.has(candidate.id) || candidate.id === memory.id) continue;

        const similarity = this.calculateContentSimilarity(
          memory.content,
          candidate.content
        );
        if (similarity >= threshold) {
          group.push(candidate);
          processed.add(candidate.id);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  private calculateContentSimilarity(
    content1: string,
    content2: string
  ): number {
    // Simple similarity calculation
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private selectBestMemoryFromGroup(group: MemoryTypeItem[]): MemoryTypeItem {
    // Select most recent or highest confidence
    return group.reduce((best, current) => {
      const bestTime = new Date(
        best.createdAt || best.timestamp || 0
      ).getTime();
      const currentTime = new Date(
        current.createdAt || current.timestamp || 0
      ).getTime();

      return currentTime > bestTime ? current : best;
    });
  }

  private async markForDeletion(memory: MemoryTypeItem): Promise<void> {
    // Mark memory for deletion (placeholder)
    console.log(`Marked memory ${memory.id} for deletion`);
  }

  private async analyzeAccessPatterns(): Promise<{
    frequent: Array<{ id: string; type: any; priority?: number }>;
    rare: Array<{ id: string; type: any }>;
    patterns: any;
  }> {
    // Analyze access patterns (placeholder)
    return {
      frequent: [],
      rare: [],
      patterns: {},
    };
  }

  private async getCurrentResourceUsage(): Promise<{
    cpu: number;
    memory: number;
    io: number;
  }> {
    // Simulate resource usage
    return {
      cpu: Math.random() * 0.8,
      memory: Math.random() * 0.7,
      io: Math.random() * 0.6,
    };
  }

  private async analyzeStorageEfficiency(): Promise<StorageAnalysis> {
    const analytics = this.memoryManager.getComprehensiveAnalytics();

    return {
      totalItems:
        analytics.workingMemory.currentLoad +
        analytics.episodicMemory.totalEpisodes +
        analytics.semanticMemory.conceptNetwork.nodes +
        analytics.proceduralMemory.totalProcedures,
      totalSize: 1000000, // Placeholder
      averageItemSize: 1000,
      compressionPotential: 0.3,
      deduplicationPotential: 0.2,
      unusedSpace: 100000,
      hotData: 500000,
      coldData: 400000,
    };
  }

  // Additional placeholder methods
  private calculateOverallCompressionRatio(): number {
    return 0.7;
  }
  private calculateDeduplicationSavings(): number {
    return 0.15;
  }
  private calculatePredictionAccuracy(): number {
    return 0.75;
  }
  private calculateResponseTimeImprovement(): number {
    return 0.2;
  }
  private calculateThroughputImprovement(): number {
    return 0.15;
  }
  private calculatePerformanceImpact(
    before: EfficiencyMetrics,
    after: EfficiencyMetrics
  ): number {
    return 0.1;
  }

  private async updatePredictionModels(patterns: any): Promise<void> {}
  private async preloadSequentialItems(
    memoryId: string,
    predicted: string[]
  ): Promise<void> {}
  private async preloadAssociatedItems(
    memoryId: string,
    predicted: string[]
  ): Promise<void> {}
  private async optimizeCPUUsage(): Promise<number> {
    return 0.1;
  }
  private async optimizeMemoryUsage(): Promise<number> {
    return 0.2;
  }
  private async optimizeIOUsage(): Promise<number> {
    return 0.15;
  }

  private async collectExpiredWorkingMemories(): Promise<{
    count: number;
    size: number;
  }> {
    return { count: 5, size: 10000 };
  }

  private async collectStaleSemanticMemories(
    aggressiveness: number
  ): Promise<{ count: number; size: number }> {
    return {
      count: Math.floor(aggressiveness * 10),
      size: Math.floor(aggressiveness * 50000),
    };
  }

  private async collectUnusedProceduralMemories(
    aggressiveness: number
  ): Promise<{ count: number; size: number }> {
    return {
      count: Math.floor(aggressiveness * 3),
      size: Math.floor(aggressiveness * 15000),
    };
  }

  private cleanupOptimizationCaches(): void {
    // Cleanup internal caches
    if (this.compressionCache.size > 1000) {
      this.compressionCache.clear();
    }
  }
}
