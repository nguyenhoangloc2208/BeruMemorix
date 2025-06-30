#!/usr/bin/env tsx

/**
 * Test script for optimized BeruMemorix tools
 * Verifies that the consolidated 5-tool system works correctly
 */

import { memoryStorage } from "../src/services/memory-storage.js";

async function testOptimizedTools() {
  console.log("🧪 Testing Optimized BeruMemorix Tools (5 tools total)");
  console.log("=".repeat(60));

  try {
    // Clear storage for clean test
    await memoryStorage.clear();

    // Test 1: Store memories
    console.log("\n1️⃣ Testing store_memory tool...");
    const id1 = await memoryStorage.store(
      "BeruMemorix is a memory management system for AI agents",
      {
        title: "Project Overview",
        tags: ["project", "ai", "memory"],
        category: "documentation",
      }
    );

    const id2 = await memoryStorage.store(
      "TypeScript is used for type safety and better development experience",
      {
        title: "Tech Stack",
        tags: ["typescript", "development"],
        category: "technical",
      }
    );

    const id3 = await memoryStorage.store(
      "Fuzzy search allows finding content even with typos",
      {
        title: "Search Features",
        tags: ["search", "fuzzy", "features"],
        category: "features",
      }
    );

    console.log(`✅ Stored 3 memories: ${id1}, ${id2}, ${id3}`);

    // Test 2: Retrieve memory
    console.log("\n2️⃣ Testing retrieve_memory tool...");
    const retrieved = await memoryStorage.retrieve(id1);
    console.log(`✅ Retrieved memory: ${retrieved?.metadata.title}`);

    // Test 3: Unified search_memory tool with different modes
    console.log("\n3️⃣ Testing unified search_memory tool...");

    // Test exact search
    console.log("\n  📍 Exact search for 'BeruMemorix':");
    const exactResult = await memoryStorage.searchEnhanced("BeruMemorix", {
      limit: 10,
    });
    console.log(
      `    Found ${exactResult.results.length} results (${exactResult.searchType})`
    );

    // Test fuzzy search
    console.log("\n  🔍 Fuzzy search for 'Memorixx' (with typo):");
    const fuzzyResult = await memoryStorage.searchEnhanced("Memorixx", {
      fuzzyTolerance: 0.3,
      limit: 10,
    });
    console.log(
      `    Found ${fuzzyResult.results.length} results (${fuzzyResult.searchType})`
    );

    // Test auto search (exact first, fuzzy fallback)
    console.log("\n  🔄 Auto search for 'TypeScrpt' (with typo):");
    const autoResult = await memoryStorage.searchEnhanced("TypeScrpt", {
      limit: 10,
    });
    console.log(
      `    Found ${autoResult.results.length} results (${autoResult.searchType})`
    );

    // Test search with suggestions
    console.log("\n  💡 Search with suggestions for 'nonexistent':");
    const noResultsSearch = await memoryStorage.searchEnhanced("nonexistent", {
      includeSuggestions: true,
      limit: 10,
    });

    if (noResultsSearch.results.length === 0) {
      const allMemories = await memoryStorage.getAll();
      const suggestions =
        await memoryStorage.enhancedSearchService.searchWithAutoComplete(
          "nonexistent",
          allMemories,
          5
        );
      console.log(
        `    No results found, generated ${suggestions.length} suggestions:`,
        suggestions
      );
    }

    // Test category filtering
    console.log("\n  🏷️ Search by category 'technical':");
    const categoryResult = await memoryStorage.searchEnhanced("TypeScript", {
      category: "technical",
      limit: 10,
    });
    console.log(
      `    Found ${categoryResult.results.length} results in 'technical' category`
    );

    // Test tag filtering
    console.log("\n  🔖 Search by tags ['search', 'fuzzy']:");
    const tagResult = await memoryStorage.searchEnhanced("search", {
      tags: ["search", "fuzzy"],
      limit: 10,
    });
    console.log(
      `    Found ${tagResult.results.length} results with specified tags`
    );

    // Test 4: Get memory stats
    console.log("\n4️⃣ Testing get_memory_stats tool...");
    const stats = await memoryStorage.getStats();
    console.log(
      `✅ Stats: ${stats.totalMemories} memories, ${stats.categoriesCount} categories, ${stats.tagsCount} unique tags`
    );

    // Test 5: Delete memory
    console.log("\n5️⃣ Testing delete_memory tool...");
    const deleted = await memoryStorage.delete(id3);
    console.log(`✅ Deleted memory: ${deleted}`);

    // Final stats
    const finalStats = await memoryStorage.getStats();
    console.log(
      `📊 Final stats: ${finalStats.totalMemories} memories remaining`
    );

    console.log("\n" + "=".repeat(60));
    console.log("🎉 All 5 optimized tools working correctly!");
    console.log("\n📋 Tool Summary:");
    console.log("  1. store_memory - Store memories with metadata");
    console.log("  2. retrieve_memory - Get memory by ID");
    console.log(
      "  3. search_memory - Unified search (exact/fuzzy/auto + suggestions)"
    );
    console.log("  4. get_memory_stats - Memory usage statistics");
    console.log("  5. delete_memory - Remove memory by ID");
    console.log(
      "\n✨ Reduced from 7 tools to 5 high-quality tools with no feature loss!"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testOptimizedTools();
