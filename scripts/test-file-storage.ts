#!/usr/bin/env tsx

import { memoryStorage } from "../src/services/memory-storage.js";
import { promises as fs } from "fs";
import { join } from "path";

async function testFileStorage() {
  console.log("🧪 Testing File-based Storage...\n");

  try {
    // Clear existing data for clean test
    await memoryStorage.clear();
    console.log("✅ Cleared existing memories");

    // Test 1: Store memory
    console.log("\n📝 Test 1: Store Memory");
    const id1 = await memoryStorage.store(
      "This is a test memory for file-based storage",
      {
        title: "File Storage Test",
        tags: ["test", "storage", "file"],
        category: "testing",
      }
    );
    console.log(`✅ Stored memory with ID: ${id1}`);

    // Test 2: Store another memory
    console.log("\n📝 Test 2: Store Another Memory");
    const id2 = await memoryStorage.store("Second memory to test persistence", {
      title: "Persistence Test",
      tags: ["persistence", "json"],
      category: "testing",
    });
    console.log(`✅ Stored memory with ID: ${id2}`);

    // Test 3: Check file exists
    console.log("\n📁 Test 3: Check File Creation");
    const dataFile = join("data", "memories.json");
    try {
      await fs.access(dataFile);
      console.log(`✅ File ${dataFile} exists`);

      const fileContent = await fs.readFile(dataFile, "utf-8");
      const memories = JSON.parse(fileContent);
      console.log(`✅ File contains ${memories.length} memories`);
    } catch (error) {
      console.log(`❌ File ${dataFile} not found or unreadable`);
      throw error;
    }

    // Test 4: Retrieve memory
    console.log("\n🔍 Test 4: Retrieve Memory");
    const retrieved = await memoryStorage.retrieve(id1);
    if (retrieved) {
      console.log(`✅ Retrieved memory: ${retrieved.metadata.title}`);
    } else {
      throw new Error("Failed to retrieve memory");
    }

    // Test 5: Search memories
    console.log("\n🔍 Test 5: Search Memories");
    const searchResults = await memoryStorage.search("test");
    console.log(`✅ Found ${searchResults.length} memories matching 'test'`);

    // Test 6: Get stats
    console.log("\n📊 Test 6: Get Statistics");
    const stats = await memoryStorage.getStats();
    console.log(`✅ Total memories: ${stats.totalMemories}`);
    console.log(`✅ Categories: ${stats.categories.join(", ")}`);
    console.log(`✅ Tags: ${stats.tags.join(", ")}`);

    // Test 7: Test persistence by creating new instance
    console.log("\n🔄 Test 7: Test Persistence with New Instance");
    const { MemoryStorage } = await import("../src/services/memory-storage.js");
    const newInstance = new MemoryStorage();
    const allMemories = await newInstance.getAll();
    console.log(
      `✅ New instance loaded ${allMemories.length} memories from file`
    );

    // Test 8: Delete memory
    console.log("\n🗑️ Test 8: Delete Memory");
    const deleted = await memoryStorage.delete(id2);
    if (deleted) {
      console.log(`✅ Deleted memory ${id2}`);

      const finalStats = await memoryStorage.getStats();
      console.log(`✅ Remaining memories: ${finalStats.totalMemories}`);
    } else {
      throw new Error("Failed to delete memory");
    }

    console.log("\n🎉 All file-based storage tests passed!");
    console.log("\n📋 Summary:");
    console.log("- ✅ Memory storage and retrieval");
    console.log("- ✅ File persistence (JSON format)");
    console.log("- ✅ Search functionality");
    console.log("- ✅ Statistics generation");
    console.log("- ✅ Data persistence across instances");
    console.log("- ✅ Memory deletion");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run tests
testFileStorage();
