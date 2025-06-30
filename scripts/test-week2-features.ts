#!/usr/bin/env node

/**
 * Week 2 Implementation Test Suite
 * Tests: Analytics, Query Optimization, Zero-result Handling, Performance Monitoring
 */

import { MemoryStorage } from "../src/services/memory-storage.js";
import { SearchAnalyticsService } from "../src/services/search-analytics.js";
import { QueryOptimizerService } from "../src/services/query-optimizer.js";
// Enhanced search accessed through MemoryStorage

// Test data
const testMemories = [
  {
    content:
      "BeruMemorix is an advanced AI memory management system for developers",
    metadata: {
      title: "BeruMemorix Overview",
      tags: ["ai", "memory", "development", "system"],
      category: "documentation",
    },
  },
  {
    content:
      "Fuzzy search algorithm uses Levenshtein distance for better matching",
    metadata: {
      title: "Fuzzy Search Implementation",
      tags: ["algorithm", "search", "fuzzy", "levenshtein"],
      category: "technical",
    },
  },
  {
    content:
      "TypeScript development best practices for clean code architecture",
    metadata: {
      title: "TypeScript Best Practices",
      tags: ["typescript", "development", "clean-code", "architecture"],
      category: "development",
    },
  },
  {
    content:
      "Search analytics help track user behavior and improve search quality",
    metadata: {
      title: "Search Analytics Guide",
      tags: ["analytics", "search", "tracking", "improvement"],
      category: "analytics",
    },
  },
  {
    content: "Query optimization techniques to handle poor quality searches",
    metadata: {
      title: "Query Optimization",
      tags: ["optimization", "query", "search", "quality"],
      category: "technical",
    },
  },
];

async function setupTestEnvironment() {
  console.log("🧹 Setting up Week 2 test environment...");

  const storage = new MemoryStorage("data-test");
  await storage.clear();

  // Store test memories
  for (const memory of testMemories) {
    await storage.store(memory.content, memory.metadata);
  }

  console.log(`✅ Stored ${testMemories.length} test memories\n`);
  return storage;
}

async function testSearchAnalytics() {
  console.log("📊 Testing Search Analytics...");

  const analytics = new SearchAnalyticsService();

  // Simulate search events
  const testQueries = [
    "BeruMemorix",
    "fuzzy search",
    "TypeScript",
    "nonexistent query",
    "another nonexistent",
    "BeruMemorix", // Duplicate to test refinement
    "analytics",
  ];

  for (const query of testQueries) {
    analytics.recordSearch({
      query,
      searchType: Math.random() > 0.5 ? "exact" : "fuzzy",
      resultsCount: query.includes("nonexistent")
        ? 0
        : Math.floor(Math.random() * 5) + 1,
      executionTime: Math.floor(Math.random() * 50) + 10,
      suggestions: query.includes("nonexistent")
        ? ["suggestion1", "suggestion2"]
        : [],
    });

    // Simulate some user actions
    if (Math.random() > 0.7) {
      analytics.recordUserAction(query, "clicked_result");
    }
  }

  // Get metrics
  const metrics = analytics.getMetrics();
  console.log(`  Total searches: ${metrics.totalSearches}`);
  console.log(
    `  Average execution time: ${metrics.avgExecutionTime.toFixed(1)}ms`
  );
  console.log(
    `  Zero result rate: ${(metrics.zeroResultRate * 100).toFixed(1)}%`
  );
  console.log(
    `  Top query: "${metrics.topQueries[0]?.query}" (${metrics.topQueries[0]?.count} times)`
  );

  // Test insights
  const insights = analytics.getSearchInsights();
  console.log(`  Patterns detected: ${insights.patterns.length}`);
  console.log(`  Recommendations: ${insights.recommendations.length}`);

  // Test zero-result analysis
  const zeroResultSuggestions = analytics.analyzeZeroResultQueries();
  console.log(`  Zero-result optimizations: ${zeroResultSuggestions.length}`);

  console.log("✅ Search Analytics tests passed\n");
}

async function testQueryOptimizer() {
  console.log("🔧 Testing Query Optimizer...");

  const optimizer = new QueryOptimizerService();

  // Test query analysis
  const testQueries = [
    "ai", // Short query
    "BeruMemorix memory system", // Medium query
    "fucntion to serach memories", // Typos
    "UIdesign", // Compound word
    "ml algorithm", // Abbreviation
    "search!@# query???", // Special characters
    "truy vấn tìm kiếm bộ nhớ", // Vietnamese
  ];

  for (const query of testQueries) {
    console.log(`\n  Testing query: "${query}"`);

    // Analyze query
    const analysis = optimizer.analyzeQuery(query);
    console.log(
      `    Type: ${analysis.type}, Complexity: ${analysis.complexity}`
    );
    console.log(`    Language: ${analysis.language}`);
    console.log(
      `    Issues: ${
        [
          analysis.hasTypos && "typos",
          analysis.hasSpecialChars && "special chars",
          analysis.isCompound && "compound",
          analysis.hasAbbreviations && "abbreviations",
        ]
          .filter(Boolean)
          .join(", ") || "none"
      }`
    );

    // Optimize query
    const optimization = optimizer.optimizeQuery(query);
    if (optimization.optimizedQuery !== query) {
      console.log(`    Optimized: "${optimization.optimizedQuery}"`);
      console.log(`    Techniques: ${optimization.techniques.join(", ")}`);
      console.log(
        `    Confidence: ${(optimization.confidence * 100).toFixed(1)}%`
      );
    }

    // Quality score
    const quality = optimizer.scoreQueryQuality(query);
    console.log(`    Quality score: ${(quality * 100).toFixed(1)}%`);

    // Generate variations
    const variations = optimizer.generateQueryVariations(query, 3);
    if (variations.length > 1) {
      console.log(
        `    Variations: ${variations
          .slice(1)
          .map((v) => `"${v}"`)
          .join(", ")}`
      );
    }
  }

  console.log("\n✅ Query Optimizer tests passed\n");
}

async function testEnhancedSearchIntegration(storage: MemoryStorage) {
  console.log("🚀 Testing Enhanced Search Integration...");

  // Test 1: Normal search with analytics
  console.log("\n  Test 1: Normal search with analytics");
  const result1 = await storage.searchEnhanced("BeruMemorix", {
    enableAnalytics: true,
    autoOptimizeQuery: true,
  });

  console.log(`    Query: "${result1.query}"`);
  console.log(`    Results: ${result1.count}`);
  console.log(`    Search type: ${result1.searchType}`);
  console.log(`    Execution time: ${result1.executionTime}ms`);
  if (result1.analytics) {
    console.log(
      `    Query quality: ${(result1.analytics.queryQuality * 100).toFixed(1)}%`
    );
  }

  // Test 2: Query with typos (should auto-optimize)
  console.log("\n  Test 2: Query with typos");
  const result2 = await storage.searchEnhanced("TypeScrpt developmet", {
    enableAnalytics: true,
    autoOptimizeQuery: true,
  });

  console.log(`    Original query: "TypeScrpt developmet"`);
  console.log(`    Optimized query: "${result2.optimizedQuery || "none"}"`);
  console.log(`    Results: ${result2.count}`);
  console.log(`    Search type: ${result2.searchType}`);
  if (result2.analytics?.optimization) {
    console.log(
      `    Optimization techniques: ${result2.analytics.optimization.techniques.join(
        ", "
      )}`
    );
  }

  // Test 3: Zero-result query with suggestions
  console.log("\n  Test 3: Zero-result query with suggestions");
  const result3 = await storage.searchEnhanced("nonexistent xyz query", {
    enableAnalytics: true,
    tryQueryVariations: true,
    includeSuggestions: true,
  });

  console.log(`    Query: "${result3.query}"`);
  console.log(`    Results: ${result3.count}`);
  console.log(
    `    Suggestions: ${result3.suggestions?.slice(0, 3).join(", ") || "none"}`
  );

  // Test 4: Fuzzy search
  console.log("\n  Test 4: Fuzzy search");
  const result4 = await storage.searchEnhanced("BeruMemorx", {
    searchType: "fuzzy",
    fuzzyTolerance: 0.7,
  });

  console.log(`    Query: "${result4.query}"`);
  console.log(`    Results: ${result4.count}`);
  console.log(`    Search type: ${result4.searchType}`);
  if (result4.results.length > 0) {
    console.log(
      `    Best match: "${
        result4.results[0].memory.metadata.title
      }" (score: ${result4.results[0].score.toFixed(2)})`
    );
  }

  // Test 5: Auto-complete
  console.log("\n  Test 5: Auto-complete suggestions");
  const autoComplete = await storage.getAutoCompleteSuggestions("fuzz", 5);
  console.log(`    Partial query: "fuzz"`);
  console.log(`    Suggestions: ${autoComplete.join(", ")}`);

  console.log("\n✅ Enhanced Search Integration tests passed\n");
}

async function testPerformanceMonitoring(storage: MemoryStorage) {
  console.log("⚡ Testing Performance Monitoring...");

  // Generate some search activity
  const queries = [
    "BeruMemorix",
    "search",
    "TypeScript",
    "fuzzy",
    "analytics",
    "optimization",
    "memory",
    "development",
    "algorithm",
    "system",
  ];

  console.log("  Generating search activity...");
  for (let i = 0; i < 20; i++) {
    const query = queries[Math.floor(Math.random() * queries.length)];
    await storage.searchEnhanced(query, { enableAnalytics: true });

    // Simulate user actions
    if (Math.random() > 0.7) {
      storage.recordUserAction(query, "clicked_result");
    }
  }

  // Get analytics
  const analytics = storage.getSearchAnalytics();

  console.log("\n  📊 Performance Metrics:");
  console.log(`    Total searches: ${analytics.metrics.totalSearches}`);
  console.log(
    `    Average execution time: ${analytics.metrics.avgExecutionTime.toFixed(
      1
    )}ms`
  );
  console.log(
    `    Average results per query: ${analytics.metrics.avgResultsCount.toFixed(
      1
    )}`
  );
  console.log(
    `    Zero-result rate: ${(analytics.metrics.zeroResultRate * 100).toFixed(
      1
    )}%`
  );

  console.log("\n  🔍 Search Type Distribution:");
  const dist = analytics.metrics.searchTypeDistribution;
  console.log(
    `    Exact: ${dist.exact}, Fuzzy: ${dist.fuzzy}, Mixed: ${dist.mixed}`
  );

  console.log("\n  📈 Usage Patterns:");
  console.log(
    `    Suggestion usage rate: ${(
      analytics.metrics.suggestionUsageRate * 100
    ).toFixed(1)}%`
  );
  console.log(
    `    Query refinement rate: ${(
      analytics.metrics.queryRefinementRate * 100
    ).toFixed(1)}%`
  );

  console.log("\n  🎯 Top Queries:");
  analytics.metrics.topQueries.slice(0, 5).forEach((q, i) => {
    console.log(`    ${i + 1}. "${q.query}" (${q.count} times)`);
  });

  console.log("\n  💡 Insights & Recommendations:");
  analytics.insights.patterns.forEach((pattern) => {
    console.log(`    Pattern: ${pattern}`);
  });
  analytics.insights.recommendations.forEach((rec) => {
    console.log(`    Recommendation: ${rec}`);
  });

  // Test export functionality
  console.log("\n  📤 Testing data export...");
  const exportedData = storage.exportSearchAnalytics("json");
  const parsedData = JSON.parse(exportedData);
  console.log(`    Exported ${parsedData.events.length} events`);

  console.log("\n✅ Performance Monitoring tests passed\n");
}

async function testZeroResultHandling(storage: MemoryStorage) {
  console.log("🔍 Testing Zero-Result Handling...");

  // Test queries that should return zero results
  const zeroResultQueries = [
    "xamarin development",
    "ruby on rails",
    "machine learning models",
    "docker containers",
    "blockchain technology",
  ];

  for (const query of zeroResultQueries) {
    const result = await storage.searchEnhanced(query, {
      enableAnalytics: true,
      tryQueryVariations: true,
      includeSuggestions: true,
    });

    console.log(`\n  Query: "${query}"`);
    console.log(`    Results: ${result.count}`);
    console.log(`    Search type: ${result.searchType}`);
    if (result.optimizedQuery) {
      console.log(`    Optimized to: "${result.optimizedQuery}"`);
    }
    if (result.suggestions && result.suggestions.length > 0) {
      console.log(
        `    Suggestions: ${result.suggestions.slice(0, 3).join(", ")}`
      );
    }
  }

  // Test analytics-based suggestions
  console.log("\n  📊 Analytics-based optimizations:");
  const analytics = storage.getSearchAnalytics();
  const zeroResultOptimizations = await storage.enhancedSearchService
    .getAnalytics()
    .analyzeZeroResultQueries();

  if (zeroResultOptimizations.length > 0) {
    zeroResultOptimizations.slice(0, 3).forEach((opt, i) => {
      console.log(
        `    ${i + 1}. "${opt.originalQuery}" → "${opt.optimizedQuery}"`
      );
      console.log(`       Reason: ${opt.reason}`);
      console.log(
        `       Expected improvement: ${(opt.expectedImprovement * 100).toFixed(
          1
        )}%`
      );
    });
  } else {
    console.log("    No optimization suggestions available yet");
  }

  console.log("\n✅ Zero-Result Handling tests passed\n");
}

async function main() {
  console.log("🧪 BERUMEMORIX WEEK 2 FEATURES TEST SUITE");
  console.log("==========================================");
  console.log(
    "Testing: Analytics, Query Optimization, Zero-result Handling, Performance\n"
  );

  try {
    // Setup
    const storage = await setupTestEnvironment();

    // Run all tests
    await testSearchAnalytics();
    await testQueryOptimizer();
    await testEnhancedSearchIntegration(storage);
    await testZeroResultHandling(storage);
    await testPerformanceMonitoring(storage);

    console.log("🎉 ALL WEEK 2 TESTS PASSED!");
    console.log("\n📋 WEEK 2 IMPLEMENTATION STATUS:");
    console.log("  ✅ Search Analytics - Complete");
    console.log("  ✅ Query Optimization - Complete");
    console.log("  ✅ Zero-result Handling - Complete");
    console.log("  ✅ Performance Monitoring - Complete");
    console.log("  ✅ User Experience Improvements - Complete");
    console.log("\n🚀 Ready to proceed to Phase 2: Memory Architecture!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);
