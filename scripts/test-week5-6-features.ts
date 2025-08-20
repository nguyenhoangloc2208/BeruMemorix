#!/usr/bin/env npx tsx

/**
 * Week 5-6 Features Test: Memory Types System
 */

import { WorkingMemoryService } from "../src/services/working-memory.js";
import { EpisodicMemoryService } from "../src/services/episodic-memory.js";
import { SemanticMemoryService } from "../src/services/semantic-memory.js";
import { ProceduralMemoryService } from "../src/services/procedural-memory.js";
import { MemoryTypesManager } from "../src/services/memory-types-manager.js";
import type { MemoryContext } from "../src/types/memory-types.js";

console.log("🧠 Testing Week 5-6: Memory Types System");
console.log("=".repeat(60));

async function testMemoryTypes() {
  console.log("\n1️⃣ Testing Memory Types...");

  // Test Working Memory
  const workingMemory = new WorkingMemoryService();
  const context: MemoryContext = {
    sessionId: "test_001",
    conversationId: "conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["testing"],
  };

  const workingId = await workingMemory.store("Test working memory", context);
  console.log(`✅ Working Memory: ${workingId}`);

  // Test Episodic Memory
  const episodicMemory = new EpisodicMemoryService();
  const episodeId = await episodicMemory.recordEpisode(
    "Test episode",
    context,
    {
      userAction: "Test action",
      systemResponse: "Test response",
      outcome: "successful",
    }
  );
  console.log(`✅ Episodic Memory: ${episodeId}`);

  // Test Semantic Memory
  const semanticMemory = new SemanticMemoryService();
  const knowledgeId = await semanticMemory.storeKnowledge(
    "Test knowledge",
    context,
    {
      category: "fact",
      domain: "testing",
    }
  );
  console.log(`✅ Semantic Memory: ${knowledgeId}`);

  // Test Procedural Memory
  const proceduralMemory = new ProceduralMemoryService();
  const procedureId = await proceduralMemory.storeProcedure(
    "Test procedure",
    context,
    {
      skillName: "Testing",
      steps: [{ action: "Test", conditions: [], expectedOutcome: "Success" }],
      triggers: ["test"],
      context: ["testing"],
    }
  );
  console.log(`✅ Procedural Memory: ${procedureId}`);

  return { workingMemory, episodicMemory, semanticMemory, proceduralMemory };
}

async function testUnifiedManager() {
  console.log("\n2️⃣ Testing Memory Types Manager...");

  const manager = new MemoryTypesManager();
  const context: MemoryContext = {
    sessionId: "unified_001",
    conversationId: "unified_conv",
    timestamp: new Date().toISOString(),
    priorities: ["unified"],
  };

  // Test unified search
  const results = await manager.unifiedSearch("test", context);
  console.log(
    `✅ Unified Search: ${results.totalResults} results in ${results.executionTime}ms`
  );

  // Test contextual storage
  const stored = await manager.storeContextualMemory(
    "Auto-detect memory type",
    context
  );
  console.log(`✅ Contextual Storage: ${stored.type} - ${stored.id}`);

  // Test analytics
  const analytics = manager.getComprehensiveAnalytics();
  console.log(`✅ Analytics: Working ${analytics.workingMemory.currentLoad}`);

  return manager;
}

async function runTests() {
  const startTime = Date.now();

  try {
    await testMemoryTypes();
    await testUnifiedManager();

    const totalTime = Date.now() - startTime;
    console.log("\n" + "=".repeat(60));
    console.log("🎉 WEEK 5-6 TESTS COMPLETED!");
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log("✅ All 4 memory types working");
    console.log("✅ Unified manager operational");
    console.log("\n🧠 Memory Types System Ready!");
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  }
}

runTests();
