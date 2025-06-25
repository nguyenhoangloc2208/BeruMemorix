#!/usr/bin/env tsx

import { exec } from "child_process";
import { readFile } from "fs/promises";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

async function validateMCPSetup(): Promise<void> {
  console.log("🔍 Validating BeruMemorix MCP Setup...\n");

  try {
    // 1. Check if MCP config file exists
    console.log("1️⃣ Checking MCP configuration file...");
    const mcpConfigPath = path.join(
      process.env.HOME || "~",
      ".cursor",
      "mcp.json"
    );

    try {
      const mcpConfig = await readFile(mcpConfigPath, "utf-8");
      const config = JSON.parse(mcpConfig);

      if (config.mcpServers?.BeruMemorix) {
        console.log("✅ BeruMemorix found in MCP configuration");

        const beruConfig = config.mcpServers.BeruMemorix;
        console.log("📋 Configuration:");
        console.log(`   Command: ${beruConfig.command}`);
        console.log(`   Args: ${JSON.stringify(beruConfig.args)}`);
        console.log(`   Working Directory: ${beruConfig.cwd}`);

        // Validate paths
        if (beruConfig.cwd === process.cwd()) {
          console.log("✅ Working directory matches current project");
        } else {
          console.log("⚠️  Working directory mismatch!");
          console.log(`   Expected: ${process.cwd()}`);
          console.log(`   Configured: ${beruConfig.cwd}`);
        }
      } else {
        console.log("❌ BeruMemorix not found in MCP configuration");
        return;
      }
    } catch (error) {
      console.log("❌ MCP configuration file not found or invalid");
      console.log("📋 Expected location:", mcpConfigPath);
      return;
    }

    // 2. Test server functionality
    console.log("\n2️⃣ Testing server functionality...");

    try {
      const { stdout } = await execAsync(
        'echo \'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\' | npx tsx src/mcp/server.ts',
        { cwd: process.cwd() || ".", timeout: 10000 }
      );

      const lines = stdout.trim().split("\n");
      const jsonResponse = lines[lines.length - 1];
      const response = JSON.parse(jsonResponse || "{}");

      if (response.result?.tools?.length > 0) {
        console.log("✅ Server responds correctly");
        console.log(`📊 Found ${response.result.tools.length} tools:`);
        response.result.tools.forEach((tool: any) => {
          console.log(`   - ${tool.name}: ${tool.description}`);
        });
      } else {
        console.log("❌ Server response invalid");
      }
    } catch (error) {
      console.log("❌ Server test failed:", error);
      return;
    }

    // 3. Test tool execution
    console.log("\n3️⃣ Testing tool execution...");

    try {
      const { stdout } = await execAsync(
        'echo \'{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_memory_stats","arguments":{}}}\' | npx tsx src/mcp/server.ts',
        { cwd: process.cwd() || ".", timeout: 10000 }
      );

      const lines = stdout.trim().split("\n");
      const jsonResponse = lines[lines.length - 1];
      const response = JSON.parse(jsonResponse || "{}");

      if (response.result?.content) {
        console.log("✅ Tool execution successful");
        console.log("📊 Memory stats retrieved successfully");
      } else {
        console.log("❌ Tool execution failed");
      }
    } catch (error) {
      console.log("❌ Tool execution test failed:", error);
      return;
    }

    // 4. Final validation
    console.log("\n🎉 All validations passed!");
    console.log("\n📋 Troubleshooting steps if MCP still doesn't work:");
    console.log("1. Restart Cursor completely (not just reload window)");
    console.log("2. Check if other MCP servers are working");
    console.log(
      "3. Look for errors in Cursor's developer console (Help > Toggle Developer Tools)"
    );
    console.log("4. Verify Node.js version compatibility (v18+ required)");
    console.log("5. Check Cursor's MCP logs in ~/.cursor/logs/");

    console.log("\n🔧 To use BeruMemorix in Cursor:");
    console.log("- Type 'store memory' to save information");
    console.log("- Type 'search memory' to find stored information");
    console.log("- Type 'get memory stats' to see usage statistics");
  } catch (error) {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  }
}

// Run validation if called directly
if (process.argv[1]?.endsWith("validate-mcp.ts")) {
  validateMCPSetup();
}

export { validateMCPSetup };
