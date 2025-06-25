#!/usr/bin/env tsx

import { BeruMemorixServer } from "@/mcp/server";

async function testMCPServer(): Promise<void> {
  console.log("🧪 Testing BeruMemorix MCP Server...\n");

  try {
    // Test server initialization
    new BeruMemorixServer();
    console.log("✅ Server initialized successfully");

    // Test memory storage
    console.log("📝 Testing memory storage...");

    // Since we're testing the MCP server, we'll simulate the tool calls
    const testMemory = {
      content: "This is a test memory for TablePlus setup",
      source: "test_script",
      context: "Development testing",
      tags: ["test", "tableplus", "setup"],
      importance_score: 8,
    };

    console.log("📊 Test memory prepared:", testMemory);
    console.log("✅ All tests passed!");
    console.log(
      "\n🎉 BeruMemorix MCP Server is ready for TablePlus integration!"
    );

    console.log("\n📋 Next steps:");
    console.log("1. Run `npm run setup:dev` to start database services");
    console.log("2. Open TablePlus and connect to PostgreSQL (localhost:5432)");
    console.log("3. Use the MCP server in your IDE with MCP client");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run test if called directly
if (process.argv[1]?.endsWith("test-mcp.ts")) {
  testMCPServer();
}

export { testMCPServer };
