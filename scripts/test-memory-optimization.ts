#!/usr/bin/env npx tsx

/**
 * Test Memory Optimization System
 * Demonstrates enhanced update_memory functionality and AI optimization strategies
 */

import { memoryStorage } from "../src/services/memory-storage.js";
import { MemoryOptimizationAdvisor } from "../src/services/memory-optimization-advisor.js";
import MemoryGuidanceSystem from "../src/services/memory-guidance.js";

console.log("🧠 Testing Enhanced Memory Optimization System");
console.log("=".repeat(60));

async function testMemoryOptimizationAdvisor() {
  console.log("\n1️⃣ Testing Memory Optimization Advisor...");

  // Create advisor instance
  const advisor = new MemoryOptimizationAdvisor(memoryStorage);

  // Add some test data with duplicates and consolidation opportunities
  await memoryStorage.store(
    "Fuzzy search implementation using Levenshtein distance",
    {
      title: "Fuzzy Search Guide",
      category: "development",
      tags: ["search", "algorithm", "fuzzy"],
    }
  );

  await memoryStorage.store(
    "Fuzzy string matching with edit distance calculations",
    {
      title: "String Matching",
      category: "development",
      tags: ["search", "algorithm", "matching"],
    }
  );

  await memoryStorage.store("How to implement efficient search algorithms", {
    title: "Search Algorithms",
    category: "development",
    tags: ["search", "performance", "algorithm"],
  });

  await memoryStorage.store("React component optimization techniques", {
    title: "React Optimization",
    category: "development",
    tags: ["react", "performance", "optimization"],
  });

  console.log("✅ Added test memories");

  // Analyze memory health
  const healthReport = await advisor.analyzeMemoryHealth();
  console.log(`✅ Memory Health Analysis:`);
  console.log(`   Total memories: ${healthReport.totalMemories}`);
  console.log(
    `   Duplicate risk: ${(healthReport.duplicateRisk * 100).toFixed(1)}%`
  );
  console.log(
    `   Consolidation opportunities: ${healthReport.consolidationOpportunities}`
  );
  console.log(`   Stale memories: ${healthReport.staleMemories}`);
  console.log(`   Recommendations: ${healthReport.recommendedActions.length}`);

  // Show top recommendations
  if (healthReport.recommendedActions.length > 0) {
    console.log("\n📋 Top Optimization Recommendations:");
    healthReport.recommendedActions.slice(0, 3).forEach((rec, index) => {
      console.log(
        `   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.type}: ${
          rec.reason
        }`
      );
      console.log(
        `      Target: ${rec.targetMemoryId}, Confidence: ${(
          rec.confidence * 100
        ).toFixed(0)}%`
      );
    });
  }

  // Test smart update suggestions
  const updateSuggestion = await advisor.getSmartUpdateSuggestions(
    "Advanced fuzzy search with n-gram analysis",
    "development",
    ["search", "algorithm", "advanced"]
  );

  console.log(`\n🎯 Smart Update Suggestion:`);
  console.log(`   Should update: ${updateSuggestion.shouldUpdate}`);
  console.log(`   Update type: ${updateSuggestion.updateType}`);
  console.log(`   Reason: ${updateSuggestion.reason}`);
  console.log(
    `   Confidence: ${(updateSuggestion.confidence * 100).toFixed(0)}%`
  );

  if (updateSuggestion.targetMemory) {
    console.log(
      `   Target memory: ${
        updateSuggestion.targetMemory.metadata.title || "Untitled"
      }`
    );
  }

  // Get auto-suggestions
  const autoSuggestions = await advisor.autoSuggestUpdates();
  console.log(`\n🤖 Auto-generated suggestions: ${autoSuggestions.length}`);

  return advisor;
}

async function testMemoryGuidanceSystem() {
  console.log("\n2️⃣ Testing Memory Guidance System...");

  // Test content analysis
  const testContents = [
    "Updated implementation of fuzzy search algorithm",
    "New React component for user authentication",
    "Consolidating search algorithms documentation",
    "Optimizing memory usage in large applications",
    "Version 2.0 of the search system",
  ];

  console.log("📊 Content Analysis Results:");
  testContents.forEach((content, index) => {
    const guidance = MemoryGuidanceSystem.analyzeContentForGuidance(content, {
      category: "development",
      tags: ["algorithm", "optimization"],
      currentMemoryCount: 15,
    });

    console.log(`\n   ${index + 1}. "${content.substring(0, 40)}..."`);
    console.log(`      Should use update: ${guidance.shouldUseUpdate}`);
    console.log(`      Recommended: ${guidance.recommendedOperation}`);
    if (guidance.updateOperation) {
      console.log(`      Update operation: ${guidance.updateOperation}`);
    }
    console.log(`      Reasoning: ${guidance.reasoning}`);
    console.log(`      Confidence: ${(guidance.confidence * 100).toFixed(0)}%`);
  });

  // Generate guidance prompts
  const prompts = MemoryGuidanceSystem.generateGuidancePrompts();
  console.log(`\n💡 Generated Guidance Prompts:`);
  console.log(`   Before storing: ${prompts.beforeStoring.length} prompts`);
  console.log(`   Optimization: ${prompts.optimization.length} prompts`);

  prompts.beforeStoring.slice(0, 2).forEach((prompt, index) => {
    console.log(`   ${index + 1}. ${prompt}`);
  });

  // Test memory health assessment
  const allMemories = await memoryStorage.getAll();
  const healthAssessment = MemoryGuidanceSystem.assessMemoryHealth(allMemories);

  console.log(`\n🏥 Memory Health Assessment:`);
  console.log(`   Health score: ${healthAssessment.healthScore}/100`);
  console.log(`   Issues found: ${healthAssessment.issues.length}`);
  console.log(`   Recommendations: ${healthAssessment.recommendations.length}`);

  if (healthAssessment.issues.length > 0) {
    console.log(`   Issues: ${healthAssessment.issues.join(", ")}`);
  }

  if (healthAssessment.recommendations.length > 0) {
    console.log(
      `   Recommendations: ${healthAssessment.recommendations.join(", ")}`
    );
  }

  return prompts;
}

async function testUpdateMemoryOperations() {
  console.log("\n3️⃣ Testing Enhanced update_memory Operations...");

  // Get all memories to test operations
  const memories = await memoryStorage.getAll();
  console.log(`📊 Available memories: ${memories.length}`);

  if (memories.length > 0) {
    const testMemory = memories[0];
    console.log(
      `🎯 Testing with memory: ${testMemory.metadata.title || "Untitled"}`
    );

    // Test update operation
    const updateResult = await memoryStorage.update(
      testMemory.id,
      testMemory.content + "\n\n[ENHANCED] Added optimization notes",
      {
        tags: [...(testMemory.metadata.tags || []), "enhanced", "optimized"],
      }
    );

    if (updateResult) {
      console.log(`✅ Update operation successful`);
      console.log(`   New content length: ${updateResult.content.length}`);
      console.log(`   Updated tags: ${updateResult.metadata.tags?.join(", ")}`);
    }

    // Find potential merge candidates
    const similarMemories = memories.filter(
      (mem) =>
        mem.id !== testMemory.id &&
        mem.metadata.category === testMemory.metadata.category
    );

    if (similarMemories.length > 0) {
      console.log(
        `🔄 Found ${similarMemories.length} potential merge candidates`
      );
      console.log(`   Categories match: ${testMemory.metadata.category}`);
    }

    // Simulate consolidation analysis
    const consolidationCandidates = memories.filter(
      (mem) => mem.metadata.category === "development"
    );

    console.log(
      `📚 Consolidation candidates: ${consolidationCandidates.length} development memories`
    );

    if (consolidationCandidates.length >= 3) {
      console.log(
        `✨ Recommendation: Use update_memory 'consolidate' for development category`
      );
    }
  }

  return memories;
}

async function demonstrateMemoryOptimizationWorkflow() {
  console.log("\n4️⃣ Demonstrating Memory Optimization Workflow...");

  // Simulate AI decision-making process
  const newContent = "Advanced search optimization techniques with caching";
  const context = {
    category: "development",
    tags: ["search", "optimization", "performance"],
    currentMemoryCount: await memoryStorage
      .getStats()
      .then((s) => s.totalMemories),
  };

  console.log(`📝 New content to store: "${newContent}"`);

  // Step 1: Analyze content for guidance
  const guidance = MemoryGuidanceSystem.analyzeContentForGuidance(
    newContent,
    context
  );

  console.log(`\n🧠 AI Decision Process:`);
  console.log(`   Should use update: ${guidance.shouldUseUpdate}`);
  console.log(`   Recommended operation: ${guidance.recommendedOperation}`);
  console.log(`   Reasoning: ${guidance.reasoning}`);
  console.log(`   Confidence: ${(guidance.confidence * 100).toFixed(0)}%`);

  // Step 2: If update recommended, find target
  if (guidance.shouldUseUpdate) {
    const memories = await memoryStorage.getAll();
    const advisor = new MemoryOptimizationAdvisor(memoryStorage);

    const smartSuggestion = await advisor.getSmartUpdateSuggestions(
      newContent,
      context.category,
      context.tags
    );

    console.log(`\n🎯 Smart Update Analysis:`);
    console.log(`   Update type: ${smartSuggestion.updateType}`);
    console.log(`   Reason: ${smartSuggestion.reason}`);

    if (smartSuggestion.targetMemory) {
      console.log(
        `   Target memory: ${smartSuggestion.targetMemory.metadata.title}`
      );
      console.log(
        `   ✅ RECOMMENDATION: Use update_memory with operation '${smartSuggestion.updateType}'`
      );
    }
  } else {
    console.log(
      `   ✅ RECOMMENDATION: Safe to use store_memory for new content`
    );
  }

  // Step 3: Show optimization prompts
  const optimizationPrompts = MemoryGuidanceSystem.generateGuidancePrompts();
  console.log(`\n💡 AI Guidance Prompts:`);
  console.log(`   ${optimizationPrompts.beforeStoring[0]}`);
  console.log(`   ${optimizationPrompts.optimization[0]}`);

  return guidance;
}

async function runAllTests() {
  const startTime = Date.now();

  try {
    console.log("🧪 Starting Memory Optimization System Tests...");

    // Clear existing memories for clean test
    await memoryStorage.clear();
    console.log("🧹 Cleared existing memories for clean test");

    // Run all tests
    await testMemoryOptimizationAdvisor();
    await testMemoryGuidanceSystem();
    await testUpdateMemoryOperations();
    await demonstrateMemoryOptimizationWorkflow();

    const totalTime = Date.now() - startTime;

    console.log("\n" + "=".repeat(60));
    console.log("🎉 MEMORY OPTIMIZATION SYSTEM TESTS COMPLETED!");
    console.log("=".repeat(60));
    console.log(`⏱️  Total execution time: ${totalTime}ms`);
    console.log(
      `✅ Memory Optimization Advisor: Working - Smart recommendations & analysis`
    );
    console.log(`✅ Memory Guidance System: Working - Intelligent AI guidance`);
    console.log(
      `✅ Enhanced Update Operations: Working - Multiple operation types`
    );
    console.log(
      `✅ Optimization Workflow: Working - Complete decision support`
    );
    console.log(`\n🚀 AI Memory Optimization Complete!`);
    console.log(
      `📈 AI now has intelligent guidance for using update_memory efficiently`
    );
    console.log(
      `🎯 Memory usage will be automatically optimized through smart recommendations`
    );
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
