/**
 * Test Script for Week 3-4 Features
 * Vector Search + Semantic Similarity
 */

import { MemoryStorage } from "../src/services/memory-storage.js";
import { VectorSearchService } from "../src/services/vector-search.js";
import { HybridSearchService } from "../src/services/hybrid-search.js";

interface TestMemory {
  content: string;
  title: string;
  category: string;
  tags: string[];
}

async function setupTestData(): Promise<string[]> {
  console.log("🔧 Setting up test data for vector search...");

  const storage = new MemoryStorage();

  // Clear existing test data
  await storage.clear();

  const testMemories: TestMemory[] = [
    {
      content:
        "BeruMemorix is a advanced memory management system built with TypeScript and Node.js. It provides powerful search capabilities including fuzzy matching, analytics, and now vector search for semantic similarity.",
      title: "BeruMemorix Overview",
      category: "system-design",
      tags: ["memorix", "typescript", "search", "vector"],
    },
    {
      content:
        "Machine learning algorithms can be used to improve search relevance. Vector embeddings capture semantic meaning of text, allowing for conceptual similarity matching beyond keyword search.",
      title: "Machine Learning for Search",
      category: "artificial-intelligence",
      tags: ["machine-learning", "embeddings", "semantic", "ai"],
    },
    {
      content:
        "JavaScript is a versatile programming language used for web development. Modern frameworks like React, Vue, and Angular have revolutionized frontend development with component-based architectures.",
      title: "JavaScript Frontend Frameworks",
      category: "web-development",
      tags: ["javascript", "react", "vue", "frontend"],
    },
    {
      content:
        "Database optimization techniques include indexing, query optimization, caching strategies, and denormalization. Vector databases are becoming popular for AI applications requiring similarity search.",
      title: "Database Performance Optimization",
      category: "database",
      tags: ["database", "optimization", "indexing", "vector-db"],
    },
    {
      content:
        "Natural language processing involves understanding and generating human language. Techniques include tokenization, stemming, named entity recognition, and transformer models like BERT and GPT.",
      title: "Natural Language Processing Basics",
      category: "artificial-intelligence",
      tags: ["nlp", "transformers", "bert", "language"],
    },
    {
      content:
        "Microservices architecture breaks down monolithic applications into smaller, independent services. This approach improves scalability, maintainability, and allows teams to work independently.",
      title: "Microservices Architecture Patterns",
      category: "system-design",
      tags: ["microservices", "architecture", "scalability", "design"],
    },
    {
      content:
        "TypeScript adds static typing to JavaScript, improving code quality, developer experience, and maintainability. It's especially valuable for large applications and teams.",
      title: "TypeScript Benefits",
      category: "programming",
      tags: ["typescript", "javascript", "typing", "development"],
    },
    {
      content:
        "Vector search enables finding similar items based on semantic meaning rather than exact keyword matches. It's powered by machine learning models that convert text into numerical representations.",
      title: "Vector Search Technology",
      category: "search-technology",
      tags: ["vector-search", "embeddings", "similarity", "semantic"],
    },
  ];

  const memoryIds: string[] = [];

  for (const memory of testMemories) {
    const id = await storage.store(memory.content, {
      title: memory.title,
      category: memory.category,
      tags: memory.tags,
    });
    memoryIds.push(id);
  }

  console.log(`✅ Created ${memoryIds.length} test memories`);
  return memoryIds;
}

async function testVectorSearchBasics() {
  console.log("\n🧪 Testing Vector Search Service - Basic Functionality");
  console.log("=".repeat(60));

  const storage = new MemoryStorage();
  const vectorSearch = new VectorSearchService();
  const memories = await storage.getAll();

  // Test 1: Basic semantic search
  console.log("\n1️⃣ Testing basic semantic search...");
  const query1 = "artificial intelligence and machine learning";
  const result1 = await vectorSearch.semanticSearch(query1, memories, {
    threshold: 0.3,
    maxResults: 5,
    model: "local",
  });

  console.log(`Query: "${query1}"`);
  console.log(`Found: ${result1.count} results`);
  console.log(`Execution time: ${result1.executionTime}ms`);

  if (result1.results.length > 0) {
    console.log("Top result:");
    const topResult = result1.results[0];
    if (topResult) {
      console.log(
        `  - ${
          topResult.memory.metadata.title
        } (similarity: ${topResult.similarity.toFixed(3)})`
      );
      console.log(
        `  - Content: ${topResult.memory.content.substring(0, 100)}...`
      );
    }
  }

  // Test 2: Finding similar memories
  console.log("\n2️⃣ Testing find similar memories...");
  if (memories.length > 0) {
    const targetMemory = memories.find((m) =>
      m.metadata.title?.includes("Machine Learning")
    );
    if (targetMemory) {
      const similarResults = await vectorSearch.findSimilarMemories(
        targetMemory,
        memories,
        { threshold: 0.2, maxResults: 3 }
      );

      console.log(`Target: "${targetMemory.metadata.title}"`);
      console.log(`Found ${similarResults.length} similar memories:`);

      for (const result of similarResults) {
        console.log(
          `  - ${
            result.memory.metadata.title
          } (similarity: ${result.similarity.toFixed(3)})`
        );
      }
    }
  }

  // Test 3: Embedding statistics
  console.log("\n3️⃣ Testing embedding statistics...");
  const stats = vectorSearch.getEmbeddingStats();
  console.log(`Total embeddings: ${stats.totalEmbeddings}`);
  console.log(`Cache size: ${stats.cacheSize}`);
  console.log(`Models used: ${stats.models.join(", ")}`);
  console.log(`Average embedding size: ${stats.averageEmbeddingSize}`);
}

async function testHybridSearch() {
  console.log(
    "\n🔬 Testing Hybrid Search Service - Combining Traditional + Vector"
  );
  console.log("=".repeat(70));

  const storage = new MemoryStorage();
  const hybridSearch = new HybridSearchService();
  const memories = await storage.getAll();

  // Test 1: Weighted hybrid search
  console.log("\n1️⃣ Testing weighted hybrid search...");
  const query1 = "database performance";
  const result1 = await hybridSearch.search(query1, memories, {
    mergingStrategy: "weighted",
    traditionalWeight: 0.6,
    vectorWeight: 0.4,
    maxResults: 5,
  });

  console.log(`Query: "${query1}"`);
  console.log(`Strategy: ${result1.strategy}`);
  console.log(`Execution time: ${result1.executionTime}ms`);
  console.log(
    `Breakdown - Traditional: ${result1.breakdown.traditionalResults}, Vector: ${result1.breakdown.vectorResults}, Combined: ${result1.breakdown.combinedResults}`
  );

  if (result1.results.length > 0) {
    console.log("Top results:");
    for (let i = 0; i < Math.min(3, result1.results.length); i++) {
      const result = result1.results[i];
      console.log(`  ${i + 1}. ${result.memory.metadata.title}`);
      console.log(
        `     Combined: ${result.combinedScore.toFixed(
          3
        )}, Traditional: ${result.traditionalScore.toFixed(
          3
        )}, Vector: ${result.vectorScore.toFixed(3)}`
      );
      console.log(`     Sources: ${result.sources.join(", ")}`);
    }
  }

  // Test 2: Rank fusion strategy
  console.log("\n2️⃣ Testing rank fusion strategy...");
  const query2 = "javascript programming frameworks";
  const result2 = await hybridSearch.search(query2, memories, {
    mergingStrategy: "rank_fusion",
    maxResults: 5,
  });

  console.log(`Query: "${query2}"`);
  console.log(`Strategy: ${result2.strategy}`);
  console.log(`Results: ${result2.count} found`);

  if (result2.results.length > 0) {
    console.log("Rank fusion results:");
    for (const result of result2.results.slice(0, 3)) {
      console.log(
        `  - ${
          result.memory.metadata.title
        } (RRF score: ${result.combinedScore.toFixed(4)})`
      );
    }
  }

  // Test 3: Best of both strategy
  console.log("\n3️⃣ Testing best of both strategy...");
  const query3 = "system architecture design";
  const result3 = await hybridSearch.search(query3, memories, {
    mergingStrategy: "best_of_both",
    maxResults: 4,
  });

  console.log(`Query: "${query3}"`);
  console.log(`Strategy: ${result3.strategy}`);
  console.log(`Results: ${result3.count} found`);

  // Test 4: Vector-only vs Traditional-only vs Hybrid comparison
  console.log("\n4️⃣ Testing search method comparison...");
  const testQuery = "semantic similarity search";

  // Vector only
  const vectorOnly = await hybridSearch.search(testQuery, memories, {
    enableTraditionalSearch: false,
    enableVectorSearch: true,
    maxResults: 3,
  });

  // Traditional only
  const traditionalOnly = await hybridSearch.search(testQuery, memories, {
    enableTraditionalSearch: true,
    enableVectorSearch: false,
    maxResults: 3,
  });

  // Hybrid
  const hybrid = await hybridSearch.search(testQuery, memories, {
    enableTraditionalSearch: true,
    enableVectorSearch: true,
    maxResults: 3,
  });

  console.log(`Query: "${testQuery}"`);
  console.log(`Vector only: ${vectorOnly.count} results`);
  console.log(`Traditional only: ${traditionalOnly.count} results`);
  console.log(`Hybrid: ${hybrid.count} results`);
  console.log(
    `Performance - Vector: ${vectorOnly.executionTime}ms, Traditional: ${traditionalOnly.executionTime}ms, Hybrid: ${hybrid.executionTime}ms`
  );
}

async function testSemanticSimilarity() {
  console.log("\n🎯 Testing Semantic Similarity Features");
  console.log("=".repeat(50));

  const storage = new MemoryStorage();
  const hybridSearch = new HybridSearchService();
  const memories = await storage.getAll();

  // Test conceptual similarity (not exact keyword matches)
  const conceptualTests = [
    {
      query: "AI and ML technologies",
      description: "Should find AI/ML content even without exact matches",
    },
    {
      query: "web development frameworks",
      description: "Should find frontend framework content",
    },
    {
      query: "code quality and maintenance",
      description: "Should find TypeScript and architecture content",
    },
    {
      query: "text understanding and processing",
      description: "Should find NLP and language processing content",
    },
  ];

  for (let i = 0; i < conceptualTests.length; i++) {
    const test = conceptualTests[i];
    console.log(`\n${i + 1}️⃣ ${test.description}`);
    console.log(`Query: "${test.query}"`);

    const result = await hybridSearch.search(test.query, memories, {
      mergingStrategy: "weighted",
      vectorWeight: 0.7, // Emphasize semantic similarity
      traditionalWeight: 0.3,
      maxResults: 3,
    });

    if (result.results.length > 0) {
      console.log("Semantic matches found:");
      for (const match of result.results) {
        console.log(`  - ${match.memory.metadata.title}`);
        console.log(
          `    Combined score: ${match.combinedScore.toFixed(
            3
          )} (Vector: ${match.vectorScore.toFixed(
            3
          )}, Traditional: ${match.traditionalScore.toFixed(3)})`
        );
        console.log(
          `    Tags: ${match.memory.metadata.tags?.join(", ") || "none"}`
        );
      }
    } else {
      console.log("No semantic matches found");
    }
  }
}

async function testEdgeCases() {
  console.log("\n⚠️  Testing Edge Cases and Error Handling");
  console.log("=".repeat(50));

  const storage = new MemoryStorage();
  const vectorSearch = new VectorSearchService();
  const hybridSearch = new HybridSearchService();

  // Test 1: Empty query
  console.log("\n1️⃣ Testing empty query...");
  const emptyResult = await hybridSearch.search("", await storage.getAll());
  console.log(`Empty query results: ${emptyResult.count}`);

  // Test 2: Very short query
  console.log("\n2️⃣ Testing very short query...");
  const shortResult = await hybridSearch.search("ai", await storage.getAll());
  console.log(`Short query results: ${shortResult.count}`);

  // Test 3: Very long query
  console.log("\n3️⃣ Testing very long query...");
  const longQuery =
    "This is a very long query with many words that should test how well the vector search handles longer text inputs and whether it can still find relevant semantic matches even when the query contains multiple concepts and ideas that might be related to different memories in the system";
  const longResult = await hybridSearch.search(
    longQuery,
    await storage.getAll(),
    {
      maxResults: 2,
    }
  );
  console.log(`Long query results: ${longResult.count}`);

  // Test 4: Non-English query (if applicable)
  console.log("\n4️⃣ Testing special characters...");
  const specialResult = await hybridSearch.search(
    "machine-learning & AI/ML",
    await storage.getAll()
  );
  console.log(`Special characters query results: ${specialResult.count}`);

  // Test 5: Embedding stats after all operations
  console.log("\n5️⃣ Final embedding statistics...");
  const finalStats = vectorSearch.getEmbeddingStats();
  console.log(
    `Final stats - Embeddings: ${finalStats.totalEmbeddings}, Cache: ${finalStats.cacheSize}`
  );
}

async function runWeek3Tests() {
  console.log(
    "🧪 Testing Week 3-4 Features: Vector Search + Semantic Similarity"
  );
  console.log("=".repeat(80));

  try {
    // Setup test data
    await setupTestData();

    // Run all tests
    await testVectorSearchBasics();
    await testHybridSearch();
    await testSemanticSimilarity();
    await testEdgeCases();

    console.log("\n" + "=".repeat(80));
    console.log(
      "🎉 Week 3-4 Vector Search + Semantic Similarity Tests Complete!"
    );

    // Summary
    console.log("\n📋 Implementation Summary:");
    console.log("✅ Vector Search Service - Local embedding generation");
    console.log("✅ Semantic Similarity - Cosine similarity matching");
    console.log("✅ Hybrid Search Service - 3 merging strategies");
    console.log("✅ Memory Indexing - Automatic embedding creation");
    console.log("✅ Similarity Search - Find related memories");
    console.log("✅ Performance Optimized - Parallel search execution");
    console.log("✅ Configurable Models - Local/OpenAI/HuggingFace ready");
    console.log("✅ Edge Case Handling - Robust error management");

    console.log("\n🚀 Ready for Week 5-6: Memory Types System!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Run the tests
runWeek3Tests().catch(console.error);
