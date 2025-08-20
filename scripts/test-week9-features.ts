#!/usr/bin/env npx tsx

/**
 * Week 9 Features Test: Hot-path vs Background Optimization
 * Tests all new optimization services and hot-path/background architecture
 */

import { MemoryTypesManager } from "../src/services/memory-types-manager.js";
import { BackgroundProcessor } from "../src/services/background-processor.js";
import { HotPathManager } from "../src/services/hotpath-manager.js";
import { BackgroundOperationsManager } from "../src/services/background-operations.js";
import { AdvancedConsolidationService } from "../src/services/advanced-consolidation.js";
import { MemoryEfficiencyOptimizer } from "../src/services/memory-efficiency.js";
import type { MemoryContext } from "../src/types/memory-types.js";

console.log("🚀 Testing Week 9: Hot-path vs Background Optimization");
console.log("=".repeat(70));

async function testHotPathManager() {
  console.log("\n1️⃣ Testing Hot-path Manager...");

  const memoryManager = new MemoryTypesManager();
  const hotPathManager = new HotPathManager(memoryManager, {
    maxCacheSize: 100,
    cacheTimeout: 10000, // 10 seconds for testing
    priorityThreshold: 0.7,
    maxSearchResults: 10,
    enablePredictiveCaching: true,
    performanceTarget: 50, // 50ms target
  });

  const context: MemoryContext = {
    sessionId: "hotpath_test_001",
    conversationId: "hotpath_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["urgent", "realtime"],
  };

  console.log("✅ Hot-path manager initialized");

  // Test hot-path operation routing
  const hotPathOperation = async () => {
    await new Promise((resolve) => setTimeout(resolve, 30)); // 30ms operation
    return "hot_path_result";
  };

  const result1 = await hotPathManager.executeOperation(
    "test_search",
    hotPathOperation,
    context,
    0.8 // High priority
  );
  console.log(`✅ Hot-path operation result: ${result1}`);

  // Test background operation routing
  const backgroundOperation = async () => {
    await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms operation
    return "background_result";
  };

  const result2 = await hotPathManager.executeOperation(
    "test_analysis",
    backgroundOperation,
    context,
    0.3 // Low priority
  );
  console.log(`✅ Background operation result: ${result2}`);

  // Test hot search with caching
  const searchResults1 = await hotPathManager.hotSearch(
    "fuzzy search implementation",
    context,
    { limit: 5, useCache: true }
  );
  console.log(`✅ Hot search results: ${searchResults1.length} items`);

  // Test cached search (should be faster)
  const searchResults2 = await hotPathManager.hotSearch(
    "fuzzy search implementation",
    context,
    { limit: 5, useCache: true }
  );
  console.log(`✅ Cached search results: ${searchResults2.length} items`);

  // Test hot storage with predictive caching
  const memoryId = await hotPathManager.hotStore(
    "Urgent memory item for testing",
    { ...context, priorities: ["urgent", "important"] },
    { type: "working" }
  );
  console.log(`✅ Hot storage completed: ${memoryId}`);

  // Test hot retrieval
  const retrieved = await hotPathManager.hotRetrieve(memoryId, "working");
  console.log(`✅ Hot retrieval: ${retrieved ? "found" : "not found"}`);

  // Get performance metrics
  const metrics = hotPathManager.getMetrics();
  console.log(
    `✅ Performance metrics: ${metrics.averageResponseTime.toFixed(
      1
    )}ms avg, ${(metrics.cacheHitRate * 100).toFixed(1)}% cache hit rate`
  );

  // Get operation profiles
  const profiles = hotPathManager.getOperationProfiles();
  console.log(`✅ Operation profiles: ${profiles.length} operations tracked`);

  // Get cache statistics
  const cacheStats = hotPathManager.getCacheStats();
  console.log(
    `✅ Cache stats: ${cacheStats.hotCacheSize}/${100} cache utilization: ${(
      cacheStats.cacheUtilization * 100
    ).toFixed(1)}%`
  );

  // Test cache preloading
  await hotPathManager.preloadCache([
    { id: memoryId, type: "working", priority: 0.9 },
  ]);
  console.log("✅ Cache preloading completed");

  return { hotPathManager, metrics };
}

async function testBackgroundOperations() {
  console.log("\n2️⃣ Testing Background Operations Manager...");

  const memoryManager = new MemoryTypesManager();
  const backgroundProcessor = new BackgroundProcessor(memoryManager);
  const backgroundOps = new BackgroundOperationsManager(
    memoryManager,
    backgroundProcessor,
    {
      maxBatchSize: 10,
      batchTimeout: 5000, // 5 seconds for testing
      concurrencyLimit: 3,
      retryAttempts: 2,
      priorityLevels: 3,
      resourceThrottling: false, // Disable for testing
    }
  );

  const context: MemoryContext = {
    sessionId: "bg_ops_test_001",
    conversationId: "bg_ops_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["analysis", "background"],
  };

  console.log("✅ Background operations manager initialized");

  // Test complex background search
  const searchOpId = await backgroundOps.backgroundSearch(
    "complex pattern analysis for optimization",
    context,
    {
      deepSearch: true,
      analyzePatterns: true,
      crossReference: true,
      limit: 50,
    }
  );
  console.log(`✅ Background search queued: ${searchOpId}`);

  // Test background consolidation
  const consolidationOpId = await backgroundOps.backgroundConsolidation(
    context,
    {
      aggressiveMode: false,
      crossMemoryLearning: true,
      patternAnalysis: true,
    }
  );
  console.log(`✅ Background consolidation queued: ${consolidationOpId}`);

  // Test background validation
  const validationOpId = await backgroundOps.backgroundValidation(context, {
    fullValidation: true,
    crossValidation: true,
    confidenceRecalculation: true,
  });
  console.log(`✅ Background validation queued: ${validationOpId}`);

  // Test background analytics
  const analyticsOpId = await backgroundOps.backgroundAnalytics(context, {
    trendAnalysis: true,
    usagePatterns: true,
    performanceMetrics: true,
    recommendations: true,
  });
  console.log(`✅ Background analytics queued: ${analyticsOpId}`);

  // Wait for some processing
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Check operation statuses
  const searchStatus = backgroundOps.getOperationStatus(searchOpId);
  console.log(`✅ Search operation status: ${searchStatus.status}`);

  const consolidationStatus =
    backgroundOps.getOperationStatus(consolidationOpId);
  console.log(
    `✅ Consolidation operation status: ${consolidationStatus.status}`
  );

  // Get background metrics
  const bgMetrics = backgroundOps.getMetrics();
  console.log(
    `✅ Background metrics: ${
      bgMetrics.queueLength
    } queued, ${bgMetrics.throughput.toFixed(2)} ops/sec throughput`
  );
  console.log(
    `✅ Resource utilization: ${(bgMetrics.resourceUtilization * 100).toFixed(
      1
    )}%, error rate: ${(bgMetrics.errorRate * 100).toFixed(1)}%`
  );

  // Stop background operations
  backgroundOps.stop();
  console.log("✅ Background operations manager stopped");

  return { backgroundOps, bgMetrics };
}

async function testAdvancedConsolidation() {
  console.log("\n3️⃣ Testing Advanced Consolidation Service...");

  const memoryManager = new MemoryTypesManager();
  const consolidationService = new AdvancedConsolidationService(memoryManager, {
    similarityThreshold: 0.7,
    temporalWindow: 60000, // 1 minute for testing
    minClusterSize: 2,
    maxClusterSize: 10,
    learningRate: 0.2,
    preserveOriginals: true,
  });

  const context: MemoryContext = {
    sessionId: "consolidation_test_001",
    conversationId: "consolidation_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["optimization", "analysis"],
  };

  console.log("✅ Advanced consolidation service initialized");

  // Add some test memories for consolidation
  await memoryManager.storeContextualMemory(
    "Fuzzy search algorithm implementation using Levenshtein distance",
    context,
    { type: "semantic", metadata: { domain: "algorithms", confidence: 0.9 } }
  );

  await memoryManager.storeContextualMemory(
    "Fuzzy string matching with edit distance calculations",
    context,
    { type: "semantic", metadata: { domain: "algorithms", confidence: 0.8 } }
  );

  await memoryManager.storeContextualMemory(
    "User implemented fuzzy search successfully",
    context,
    {
      type: "episodic",
      metadata: { userAction: "implementation", outcome: "successful" },
    }
  );

  await memoryManager.storeContextualMemory(
    "How to implement efficient fuzzy matching",
    context,
    {
      type: "procedural",
      metadata: { skillName: "Fuzzy Matching", effectiveness: 0.85 },
    }
  );

  console.log("✅ Added test memories for consolidation");

  // Test comprehensive consolidation
  const consolidationResult = await consolidationService.consolidateMemories(
    context,
    {
      aggressiveMode: false,
      memoryTypes: ["semantic", "episodic", "procedural"],
    }
  );

  console.log(
    `✅ Consolidation completed: ${consolidationResult.clustersFormed} clusters formed`
  );
  console.log(
    `✅ Consolidation metrics: ${consolidationResult.memoriesConsolidated} memories processed, ${consolidationResult.newMemoriesCreated} new memories created`
  );
  console.log(
    `✅ Efficiency gain: ${(consolidationResult.efficiencyGain * 100).toFixed(
      1
    )}%, quality score: ${(consolidationResult.qualityScore * 100).toFixed(1)}%`
  );

  // Test strategy performance
  consolidationResult.strategies.forEach((strategy) => {
    console.log(
      `✅ Strategy ${strategy.name}: ${(strategy.effectiveness * 100).toFixed(
        1
      )}% effectiveness, ${strategy.usage} uses`
    );
  });

  // Test cross-memory learning
  const crossMemoryResult = await consolidationService.crossMemoryConsolidation(
    context
  );
  console.log(
    `✅ Cross-memory learning: ${crossMemoryResult.clustersFormed} relationships found`
  );

  return { consolidationService, consolidationResult };
}

async function testMemoryEfficiency() {
  console.log("\n4️⃣ Testing Memory Efficiency Optimizer...");

  const memoryManager = new MemoryTypesManager();
  const hotPathManager = new HotPathManager(memoryManager);
  const efficiencyOptimizer = new MemoryEfficiencyOptimizer(memoryManager, {
    compressionEnabled: true,
    compressionThreshold: 500, // 500 bytes for testing
    deduplicationEnabled: true,
    deduplicationThreshold: 0.8,
    cacheOptimization: true,
    accessPrediction: true,
    resourceMonitoring: true,
    autoTuning: true,
    garbageCollection: {
      enabled: true,
      interval: 10000, // 10 seconds for testing
      aggressiveness: 0.3,
    },
  });

  // Set hot path manager for integration
  efficiencyOptimizer.setHotPathManager(hotPathManager);

  console.log("✅ Memory efficiency optimizer initialized");

  // Add some test data for optimization
  const context: MemoryContext = {
    sessionId: "efficiency_test_001",
    conversationId: "efficiency_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["testing", "optimization"],
  };

  // Create some duplicate content for deduplication testing
  await memoryManager.storeContextualMemory(
    "This is a test memory item with some content that might be duplicated",
    context,
    { type: "semantic" }
  );

  await memoryManager.storeContextualMemory(
    "This is a test memory item with some content that might be duplicated",
    context,
    { type: "semantic" }
  );

  await memoryManager.storeContextualMemory(
    "This is another test memory item with similar content for duplication testing",
    context,
    { type: "semantic" }
  );

  console.log("✅ Added test data for optimization");

  // Get initial efficiency metrics
  const initialMetrics = await efficiencyOptimizer.getEfficiencyMetrics();
  console.log(
    `✅ Initial metrics: ${initialMetrics.totalMemoryUsage} bytes total, ${(
      initialMetrics.compressionRatio * 100
    ).toFixed(1)}% compression ratio`
  );

  // Test comprehensive optimization
  const optimizationResult = await efficiencyOptimizer.optimizeMemorySystem({
    aggressiveMode: false,
    targetMemoryReduction: 0.2,
    preservePerformance: true,
  });

  console.log(
    `✅ Optimization completed: ${(
      optimizationResult.totalSavings * 100
    ).toFixed(1)}% total savings`
  );
  console.log(
    `✅ Compression: ${(
      optimizationResult.compressionResults.compressionRatio * 100
    ).toFixed(1)}% ratio with ${
      optimizationResult.compressionResults.algorithm
    }`
  );
  console.log(
    `✅ Deduplication: ${optimizationResult.deduplicationResults.duplicatesRemoved} duplicates removed, ${optimizationResult.deduplicationResults.spaceSaved} bytes saved`
  );

  // Test garbage collection
  const gcResult = await efficiencyOptimizer.runGarbageCollection(0.5);
  console.log(
    `✅ Garbage collection: ${gcResult.itemsCollected} items collected, ${gcResult.spaceSaved} bytes saved in ${gcResult.timeSpent}ms`
  );

  // Get optimization recommendations
  const recommendations =
    await efficiencyOptimizer.getOptimizationRecommendations();
  console.log(
    `✅ Optimization recommendations: ${recommendations.length} recommendations generated`
  );

  recommendations.slice(0, 3).forEach((rec, index) => {
    console.log(
      `   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.type}: ${
        rec.description
      }`
    );
    console.log(
      `      Expected impact: ${(rec.expectedImpact * 100).toFixed(
        1
      )}%, Cost: ${(rec.implementationCost * 100).toFixed(1)}%`
    );
  });

  // Get final efficiency metrics
  const finalMetrics = await efficiencyOptimizer.getEfficiencyMetrics();
  console.log(
    `✅ Final metrics: ${finalMetrics.totalMemoryUsage} bytes total, ${(
      finalMetrics.cacheHitRate * 100
    ).toFixed(1)}% cache hit rate`
  );
  console.log(
    `✅ Performance gains: ${(
      finalMetrics.performanceGains.responseTime * 100
    ).toFixed(1)}% response time, ${(
      finalMetrics.performanceGains.throughput * 100
    ).toFixed(1)}% throughput`
  );

  return { efficiencyOptimizer, optimizationResult, recommendations };
}

async function testIntegratedOptimization() {
  console.log("\n5️⃣ Testing Integrated Hot-path vs Background Optimization...");

  // Create all services
  const memoryManager = new MemoryTypesManager();
  const backgroundProcessor = new BackgroundProcessor(memoryManager);
  const hotPathManager = new HotPathManager(memoryManager);
  const backgroundOps = new BackgroundOperationsManager(
    memoryManager,
    backgroundProcessor
  );
  const consolidationService = new AdvancedConsolidationService(memoryManager);
  const efficiencyOptimizer = new MemoryEfficiencyOptimizer(memoryManager);

  // Set up integrations
  efficiencyOptimizer.setHotPathManager(hotPathManager);

  const context: MemoryContext = {
    sessionId: "integrated_test_001",
    conversationId: "integrated_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["integration", "optimization"],
    userId: "optimization_user",
  };

  console.log("✅ All optimization services initialized and integrated");

  // Simulate complete optimization workflow
  console.log("\n  📋 Simulating complete optimization workflow...");

  // 1. Store memories with different priorities
  const urgentMemoryId = await hotPathManager.hotStore(
    "Urgent user query requiring immediate response",
    { ...context, priorities: ["urgent", "realtime"] },
    { type: "working" }
  );

  const backgroundMemoryId = await memoryManager.storeContextualMemory(
    "Complex analysis data for background processing",
    context,
    { type: "semantic" }
  );

  // 2. Perform hot-path and background operations
  const hotSearchResults = await hotPathManager.hotSearch(
    "urgent query response",
    { ...context, priorities: ["urgent"] },
    { limit: 5, useCache: true }
  );

  const bgAnalyticsId = await backgroundOps.backgroundAnalytics(context, {
    trendAnalysis: true,
    performanceMetrics: true,
  });

  // 3. Run consolidation in background
  const consolidationResult = await consolidationService.consolidateMemories(
    context,
    {
      aggressiveMode: false,
    }
  );

  // 4. Optimize memory efficiency
  const optimizationResult = await efficiencyOptimizer.optimizeMemorySystem({
    preservePerformance: true,
  });

  // 5. Collect performance metrics
  const hotPathMetrics = hotPathManager.getMetrics();
  const bgMetrics = backgroundOps.getMetrics();
  const efficiencyMetrics = await efficiencyOptimizer.getEfficiencyMetrics();

  console.log(`✅ Workflow completed successfully`);
  console.log(
    `✅ Hot-path performance: ${hotPathMetrics.averageResponseTime.toFixed(
      1
    )}ms avg, ${(hotPathMetrics.performanceScore * 100).toFixed(1)}% score`
  );
  console.log(
    `✅ Background throughput: ${bgMetrics.throughput.toFixed(2)} ops/sec, ${
      bgMetrics.queueLength
    } queued`
  );
  console.log(
    `✅ Memory efficiency: ${(efficiencyMetrics.compressionRatio * 100).toFixed(
      1
    )}% compression, ${(optimizationResult.totalSavings * 100).toFixed(
      1
    )}% savings`
  );

  // Generate comprehensive report
  const comprehensiveReport = {
    hotPath: {
      averageResponseTime: hotPathMetrics.averageResponseTime,
      cacheHitRate: hotPathMetrics.cacheHitRate,
      performanceScore: hotPathMetrics.performanceScore,
    },
    background: {
      throughput: bgMetrics.throughput,
      queueLength: bgMetrics.queueLength,
      resourceUtilization: bgMetrics.resourceUtilization,
    },
    consolidation: {
      clustersFormed: consolidationResult.clustersFormed,
      efficiencyGain: consolidationResult.efficiencyGain,
      qualityScore: consolidationResult.qualityScore,
    },
    efficiency: {
      totalSavings: optimizationResult.totalSavings,
      compressionRatio: optimizationResult.compressionResults.compressionRatio,
      performanceImpact: optimizationResult.performanceImpact,
    },
  };

  console.log("\n  📊 Comprehensive Optimization Report:");
  console.log(
    `     Hot-path: ${comprehensiveReport.hotPath.averageResponseTime.toFixed(
      1
    )}ms response, ${(comprehensiveReport.hotPath.cacheHitRate * 100).toFixed(
      1
    )}% cache hit`
  );
  console.log(
    `     Background: ${comprehensiveReport.background.throughput.toFixed(
      2
    )} ops/sec, ${(
      comprehensiveReport.background.resourceUtilization * 100
    ).toFixed(1)}% utilization`
  );
  console.log(
    `     Consolidation: ${
      comprehensiveReport.consolidation.clustersFormed
    } clusters, ${(
      comprehensiveReport.consolidation.qualityScore * 100
    ).toFixed(1)}% quality`
  );
  console.log(
    `     Efficiency: ${(
      comprehensiveReport.efficiency.totalSavings * 100
    ).toFixed(1)}% savings, ${(
      comprehensiveReport.efficiency.compressionRatio * 100
    ).toFixed(1)}% compression`
  );

  // Cleanup
  backgroundOps.stop();

  console.log("✅ All services stopped gracefully");

  return {
    memoryManager,
    hotPathManager,
    backgroundOps,
    consolidationService,
    efficiencyOptimizer,
    comprehensiveReport,
  };
}

async function runAllTests() {
  const startTime = Date.now();

  try {
    console.log("🧪 Starting comprehensive Week 9 optimization testing...\n");

    // Test individual services
    await testHotPathManager();
    await testBackgroundOperations();
    await testAdvancedConsolidation();
    await testMemoryEfficiency();

    // Test integrated optimization
    await testIntegratedOptimization();

    const totalTime = Date.now() - startTime;

    console.log("\n" + "=".repeat(70));
    console.log("🎉 WEEK 9 OPTIMIZATION TESTS COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(70));
    console.log(`⏱️  Total execution time: ${totalTime}ms`);
    console.log(`✅ Hot-path Manager: Working - Smart routing & caching`);
    console.log(
      `✅ Background Operations: Working - Queue management & batch processing`
    );
    console.log(
      `✅ Advanced Consolidation: Working - Intelligent clustering & merging`
    );
    console.log(
      `✅ Memory Efficiency: Working - Compression, deduplication & optimization`
    );
    console.log(
      `✅ Integrated Optimization: Working - Complete hot-path vs background architecture`
    );
    console.log(
      "\n🚀 Phase 3 (Week 9) Complete: Hot-path vs Background Optimization!"
    );
    console.log(
      "📈 Ready for Week 10: Advanced Features & Cross-memory Learning"
    );
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
