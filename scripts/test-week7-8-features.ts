#!/usr/bin/env npx tsx

/**
 * Week 7-8 Features Test: Background Processing & User Feedback
 * Tests all new services: Background Processor, User Feedback, Memory Validation, Performance Monitor
 */

import { MemoryTypesManager } from "../src/services/memory-types-manager.js";
import { BackgroundProcessor } from "../src/services/background-processor.js";
import { UserFeedbackService } from "../src/services/user-feedback.js";
import { MemoryValidationService } from "../src/services/memory-validation.js";
import { PerformanceMonitoringService } from "../src/services/performance-monitor.js";
import type { MemoryContext } from "../src/types/memory-types.js";

console.log("🚀 Testing Week 7-8: Background Processing & User Feedback");
console.log("=".repeat(70));

async function testBackgroundProcessor() {
  console.log("\n1️⃣ Testing Background Memory Processor...");

  const memoryManager = new MemoryTypesManager();
  const backgroundProcessor = new BackgroundProcessor(memoryManager, {
    consolidationInterval: 1, // 1 minute for testing
    maxProcessingTime: 5000, // 5 seconds
    similarityThreshold: 0.8,
    enableRealTimeProcessing: true,
  });

  // Add some test memories first
  const context: MemoryContext = {
    sessionId: "bg_test_001",
    conversationId: "bg_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["testing", "background"],
  };

  // Store various memory types
  await memoryManager.storeContextualMemory(
    "Test semantic knowledge about fuzzy search",
    context,
    {
      type: "semantic",
      metadata: { domain: "computer-science", confidence: 0.9 },
    }
  );

  await memoryManager.storeContextualMemory(
    "User successfully implemented search feature",
    context,
    {
      type: "episodic",
      metadata: {
        userAction: "implemented search",
        systemResponse: "provided guidance",
        outcome: "successful",
      },
    }
  );

  await memoryManager.storeContextualMemory(
    "How to implement fuzzy search effectively",
    context,
    {
      type: "procedural",
      metadata: {
        skillName: "Fuzzy Search Implementation",
        triggers: ["search", "fuzzy"],
        effectiveness: 0.8,
      },
    }
  );

  console.log("✅ Added test memories for background processing");

  // Schedule background tasks
  const consolidationTaskId = backgroundProcessor.scheduleTask(
    "consolidation",
    "high"
  );
  const validationTaskId = backgroundProcessor.scheduleTask(
    "validation",
    "medium"
  );
  const cleanupTaskId = backgroundProcessor.scheduleTask("cleanup", "low");

  console.log(
    `✅ Scheduled tasks: consolidation(${consolidationTaskId}), validation(${validationTaskId}), cleanup(${cleanupTaskId})`
  );

  // Wait a moment for tasks to process
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Check task statuses
  const consolidationStatus =
    backgroundProcessor.getTaskStatus(consolidationTaskId);
  const validationStatus = backgroundProcessor.getTaskStatus(validationTaskId);

  console.log(`✅ Consolidation task: ${consolidationStatus?.status}`);
  console.log(`✅ Validation task: ${validationStatus?.status}`);

  // Get processing stats
  const stats = backgroundProcessor.getProcessingStats();
  console.log(
    `✅ Processing stats: ${stats.totalTasks} total, ${stats.completedTasks} completed, ${stats.failedTasks} failed`
  );

  // Force consolidation for immediate testing
  const consolidationResult = await backgroundProcessor.forceConsolidation();
  console.log(
    `✅ Force consolidation: processed ${consolidationResult.processed}, merged ${consolidationResult.merged}, optimized ${consolidationResult.optimized}`
  );

  // Cleanup old tasks
  const cleanedTasks = backgroundProcessor.cleanupTasks(0); // Clean all for testing
  console.log(`✅ Cleaned up ${cleanedTasks} old tasks`);

  // Stop background processor
  backgroundProcessor.stop();
  console.log("✅ Background processor stopped");

  return { memoryManager, backgroundProcessor };
}

async function testUserFeedback() {
  console.log("\n2️⃣ Testing User Feedback Integration System...");

  const memoryManager = new MemoryTypesManager();
  const feedbackService = new UserFeedbackService(memoryManager);

  const context: MemoryContext = {
    sessionId: "feedback_test_001",
    conversationId: "feedback_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["testing", "feedback"],
    userId: "test_user_123",
  };

  // Test positive feedback
  const positiveFeedbackId = await feedbackService.submitFeedback(
    "interaction_001",
    "positive",
    context,
    { explanation: "Great search results!" }
  );
  console.log(`✅ Positive feedback submitted: ${positiveFeedbackId}`);

  // Test negative feedback
  const negativeFeedbackId = await feedbackService.submitFeedback(
    "interaction_002",
    "negative",
    context,
    { explanation: "Search results were not relevant" }
  );
  console.log(`✅ Negative feedback submitted: ${negativeFeedbackId}`);

  // Test correction feedback
  const correctionFeedbackId = await feedbackService.submitFeedback(
    "interaction_003",
    "correction",
    context,
    {
      originalContent: "Fuzzy search uses exact matching",
      correctedContent:
        "Fuzzy search uses approximate matching with Levenshtein distance",
      explanation: "The original statement was incorrect",
    }
  );
  console.log(`✅ Correction feedback submitted: ${correctionFeedbackId}`);

  // Test rating feedback
  const ratingFeedbackId = await feedbackService.submitFeedback(
    "interaction_004",
    "rating",
    context,
    { rating: 4, explanation: "Good but could be better" }
  );
  console.log(`✅ Rating feedback submitted: ${ratingFeedbackId}`);

  // Test suggestion feedback
  const suggestionFeedbackId = await feedbackService.submitFeedback(
    "interaction_005",
    "suggestion",
    context,
    { explanation: "Add autocomplete functionality to search" }
  );
  console.log(`✅ Suggestion feedback submitted: ${suggestionFeedbackId}`);

  // Process pending feedback
  const processedCount = await feedbackService.processPendingFeedback();
  console.log(`✅ Processed ${processedCount} pending feedback items`);

  // Get feedback analytics
  const analytics = feedbackService.getFeedbackAnalytics();
  console.log(
    `✅ Feedback analytics: ${analytics.totalFeedback} total, ${(
      analytics.positiveRatio * 100
    ).toFixed(1)}% positive, avg rating ${analytics.averageRating.toFixed(1)}`
  );

  // Get recent feedback
  const recentFeedback = feedbackService.getRecentFeedback(3);
  console.log(`✅ Recent feedback: ${recentFeedback.length} items`);

  // Get confidence updates
  const confidenceUpdates = feedbackService.getConfidenceUpdates(5);
  console.log(
    `✅ Confidence updates: ${confidenceUpdates.length} updates recorded`
  );

  return { feedbackService };
}

async function testMemoryValidation() {
  console.log("\n3️⃣ Testing Memory Validation Service...");

  const memoryManager = new MemoryTypesManager();
  const validationService = new MemoryValidationService(memoryManager, {
    confidenceDecayRate: 0.05, // Higher decay for testing
    staleThresholdDays: 1, // 1 day for testing
    crossValidationEnabled: true,
    autoValidationInterval: 1, // 1 minute for testing
    minConfidenceThreshold: 0.2,
  });

  // Add some test memories with different ages
  const context: MemoryContext = {
    sessionId: "validation_test_001",
    conversationId: "validation_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["testing", "validation"],
  };

  // Store memories for validation
  const semanticId = await memoryManager.semantic.storeKnowledge(
    "Test knowledge for validation",
    context,
    {
      category: "fact",
      domain: "testing",
      confidence: 0.8,
    }
  );

  const proceduralId = await memoryManager.procedural.storeProcedure(
    "Test procedure for validation",
    context,
    {
      skillName: "Testing",
      steps: [{ action: "Test", conditions: [], expectedOutcome: "Success" }],
      triggers: ["test"],
      context: ["validation"],
      effectiveness: 0.7,
    }
  );

  console.log(
    `✅ Added test memories: semantic(${semanticId}), procedural(${proceduralId})`
  );

  // Run validation cycle
  const validationReport = await validationService.runValidationCycle();
  console.log(
    `✅ Validation cycle completed: ${validationReport.totalValidated} validated, ${validationReport.staleMemoriesFound} stale found`
  );
  console.log(
    `✅ Memory breakdown: ${Object.entries(validationReport.memoryTypeBreakdown)
      .map(([type, count]) => `${type}(${count})`)
      .join(", ")}`
  );

  if (validationReport.recommendations.length > 0) {
    console.log(
      `✅ Recommendations: ${validationReport.recommendations.join("; ")}`
    );
  }

  // Test individual memory validation
  const memoryValidation = await validationService.validateMemory(
    semanticId,
    "semantic"
  );
  console.log(
    `✅ Individual validation: confidence ${memoryValidation.oldConfidence} → ${memoryValidation.newConfidence}, stale: ${memoryValidation.isStale}`
  );

  // Get quality metrics
  const qualityMetrics = validationService.getQualityMetrics();
  console.log(
    `✅ Quality metrics: ${(qualityMetrics.overallHealth * 100).toFixed(
      1
    )}% health, ${(qualityMetrics.averageConfidence * 100).toFixed(
      1
    )}% confidence`
  );

  // Get validation history
  const validationHistory = validationService.getValidationHistory(5);
  console.log(`✅ Validation history: ${validationHistory.length} records`);

  // Force full validation
  const fullValidation = await validationService.forceFullValidation();
  console.log(
    `✅ Force validation: ${fullValidation.totalValidated} memories validated in ${fullValidation.executionTime}ms`
  );

  // Cleanup validation history
  const cleanedRecords = validationService.cleanupValidationHistory(0); // Clean all for testing
  console.log(`✅ Cleaned up ${cleanedRecords} validation records`);

  // Stop validation service
  validationService.stop();
  console.log("✅ Validation service stopped");

  return { validationService };
}

async function testPerformanceMonitoring() {
  console.log("\n4️⃣ Testing Performance Monitoring System...");

  const memoryManager = new MemoryTypesManager();
  const backgroundProcessor = new BackgroundProcessor(memoryManager);
  const feedbackService = new UserFeedbackService(memoryManager);
  const validationService = new MemoryValidationService(memoryManager);

  const performanceMonitor = new PerformanceMonitoringService(memoryManager, {
    samplingInterval: 2, // 2 seconds for testing
    historyRetention: 1, // 1 day
    alertThresholds: {
      healthScore: 0.5, // Lower threshold for testing
      responseTime: 100, // 100ms threshold
      memoryUsage: 100, // 100MB threshold
      staleRatio: 0.2, // 20% stale ratio
    },
    enableRealTimeAlerts: true,
    enableTrendAnalysis: true,
  });

  // Inject services for comprehensive monitoring
  performanceMonitor.setServices(
    backgroundProcessor,
    feedbackService,
    validationService
  );

  // Record some operation timings
  performanceMonitor.recordOperation("search", 150); // Slow search
  performanceMonitor.recordOperation("search", 50);
  performanceMonitor.recordOperation("store", 75);
  performanceMonitor.recordOperation("retrieval", 25);

  console.log("✅ Recorded operation timings");

  // Force metrics collection
  const metrics = await performanceMonitor.forceMetricsCollection();
  console.log(
    `✅ Metrics collected: ${(metrics.overallHealth * 100).toFixed(
      1
    )}% health, ${metrics.responseTime.search}ms search time`
  );

  // Get current health
  const currentHealth = performanceMonitor.getCurrentHealth();
  console.log(`✅ Current system health: ${(currentHealth * 100).toFixed(1)}%`);

  // Wait for another metrics collection
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Get metrics history
  const metricsHistory = performanceMonitor.getMetricsHistory(3);
  console.log(
    `✅ Metrics history: ${metricsHistory.length} data points collected`
  );

  // Generate trend analysis
  const trendAnalysis = performanceMonitor.generateTrendAnalysis(1); // Last hour
  console.log(
    `✅ Trend analysis (${trendAnalysis.timeRange}): ${trendAnalysis.insights.length} insights`
  );
  trendAnalysis.insights.forEach((insight) => console.log(`   - ${insight}`));

  // Check for alerts
  const activeAlerts = performanceMonitor.getActiveAlerts();
  console.log(`✅ Active alerts: ${activeAlerts.length}`);

  if (activeAlerts.length > 0) {
    activeAlerts.forEach((alert) => {
      console.log(`   🚨 [${alert.severity.toUpperCase()}] ${alert.message}`);
    });

    // Resolve first alert for testing
    if (activeAlerts[0]) {
      const resolved = performanceMonitor.resolveAlert(activeAlerts[0].id);
      console.log(`✅ Alert resolution: ${resolved ? "success" : "failed"}`);
    }
  }

  // Get performance summary
  const summary = performanceMonitor.getPerformanceSummary();
  console.log(
    `✅ Performance summary: ${summary.health} health, status: ${summary.status}`
  );
  console.log(
    `✅ Active alerts: ${summary.alerts}, recommendations: ${summary.recommendations.length}`
  );

  if (summary.recommendations.length > 0) {
    console.log("✅ Recommendations:");
    summary.recommendations.forEach((rec) => console.log(`   - ${rec}`));
  }

  // Stop performance monitoring
  performanceMonitor.stop();
  console.log("✅ Performance monitoring stopped");

  return { performanceMonitor };
}

async function testIntegratedWorkflow() {
  console.log("\n5️⃣ Testing Integrated Week 7-8 Workflow...");

  // Create all services
  const memoryManager = new MemoryTypesManager();
  const backgroundProcessor = new BackgroundProcessor(memoryManager);
  const feedbackService = new UserFeedbackService(memoryManager);
  const validationService = new MemoryValidationService(memoryManager);
  const performanceMonitor = new PerformanceMonitoringService(memoryManager);

  // Set up cross-service integration
  performanceMonitor.setServices(
    backgroundProcessor,
    feedbackService,
    validationService
  );

  const context: MemoryContext = {
    sessionId: "integrated_test_001",
    conversationId: "integrated_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["integration", "workflow"],
    userId: "workflow_user",
  };

  console.log("✅ All services initialized and integrated");

  // Simulate a complete workflow
  console.log("\n  📋 Simulating complete workflow...");

  // 1. User interaction creates memories
  const memoryId = await memoryManager.storeContextualMemory(
    "User learned about vector search implementation",
    context,
    { type: "auto" }
  );
  performanceMonitor.recordOperation("store", 85);

  // 2. User provides feedback
  await feedbackService.submitFeedback(memoryId, "positive", context, {
    rating: 5,
    explanation: "Excellent explanation of vector search!",
  });

  // 3. Background processing consolidates memories
  backgroundProcessor.scheduleTask("consolidation", "medium");

  // 4. Validation service checks memory quality
  await validationService.validateMemory(memoryId, "working");

  // 5. Performance monitoring tracks everything
  const finalMetrics = await performanceMonitor.forceMetricsCollection();

  console.log(
    `✅ Workflow completed: ${(finalMetrics.overallHealth * 100).toFixed(
      1
    )}% final health`
  );

  // Generate comprehensive report
  const backgroundStats = backgroundProcessor.getProcessingStats();
  const feedbackAnalytics = feedbackService.getFeedbackAnalytics();
  const qualityMetrics = validationService.getQualityMetrics();
  const performanceSummary = performanceMonitor.getPerformanceSummary();

  console.log("\n  📊 Integration Report:");
  console.log(
    `     Background: ${backgroundStats.completedTasks}/${backgroundStats.totalTasks} tasks completed`
  );
  console.log(
    `     Feedback: ${feedbackAnalytics.totalFeedback} items, ${(
      feedbackAnalytics.positiveRatio * 100
    ).toFixed(1)}% positive`
  );
  console.log(
    `     Validation: ${(qualityMetrics.overallHealth * 100).toFixed(
      1
    )}% system health`
  );
  console.log(
    `     Performance: ${performanceSummary.status} status, ${performanceSummary.alerts} alerts`
  );

  // Cleanup
  backgroundProcessor.stop();
  validationService.stop();
  performanceMonitor.stop();

  console.log("✅ All services stopped gracefully");

  return {
    memoryManager,
    backgroundProcessor,
    feedbackService,
    validationService,
    performanceMonitor,
  };
}

async function runAllTests() {
  const startTime = Date.now();

  try {
    console.log("🧪 Starting comprehensive Week 7-8 testing...\n");

    // Test individual services
    await testBackgroundProcessor();
    await testUserFeedback();
    await testMemoryValidation();
    await testPerformanceMonitoring();

    // Test integrated workflow
    await testIntegratedWorkflow();

    const totalTime = Date.now() - startTime;

    console.log("\n" + "=".repeat(70));
    console.log("🎉 WEEK 7-8 TESTS COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(70));
    console.log(`⏱️  Total execution time: ${totalTime}ms`);
    console.log(`✅ Background Memory Processor: Working`);
    console.log(`✅ User Feedback Integration: Working`);
    console.log(`✅ Memory Validation Service: Working`);
    console.log(`✅ Performance Monitoring: Working`);
    console.log(`✅ Integrated Workflow: Working`);
    console.log(
      "\n🚀 Phase 3 (Week 7-8) Complete: Background Processing & User Feedback!"
    );
    console.log("📈 Ready for Week 9: Hot-path vs Background Optimization");
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
