#!/usr/bin/env node

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const MCP_CONFIG_PATH = path.join(process.env.HOME!, ".cursor", "mcp.json");

async function checkMcpConfig() {
  console.log("🔍 Checking MCP Configuration...\n");

  if (!fs.existsSync(MCP_CONFIG_PATH)) {
    console.log("❌ MCP config file not found at:", MCP_CONFIG_PATH);
    return false;
  }

  try {
    const config = JSON.parse(fs.readFileSync(MCP_CONFIG_PATH, "utf8"));
    console.log("✅ MCP config file found");

    if (config.mcpServers?.BeruMemorix) {
      console.log("✅ BeruMemorix server configured");
      console.log(
        "📋 Server config:",
        JSON.stringify(config.mcpServers.BeruMemorix, null, 2)
      );
      return true;
    } else {
      console.log("❌ BeruMemorix server not found in config");
      return false;
    }
  } catch (error) {
    console.log("❌ Invalid MCP config JSON:", error);
    return false;
  }
}

async function testServerConnection() {
  console.log("\n🔌 Testing Server Connection...\n");

  return new Promise<boolean>((resolve) => {
    const serverProcess = spawn("npx", ["tsx", "src/mcp/server.ts"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let hasOutput = false;
    let errorOutput = "";

    const timeout = setTimeout(() => {
      serverProcess.kill();
      if (hasOutput) {
        console.log("✅ Server started successfully (killed after 3s)");
        resolve(true);
      } else {
        console.log("❌ Server failed to start within 3 seconds");
        console.log("Error output:", errorOutput);
        resolve(false);
      }
    }, 3000);

    serverProcess.stdout.on("data", (data) => {
      hasOutput = true;
      console.log("📤 Server stdout:", data.toString().trim());
    });

    serverProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.log("📥 Server stderr:", data.toString().trim());
    });

    serverProcess.on("error", (error) => {
      clearTimeout(timeout);
      console.log("❌ Server process error:", error);
      resolve(false);
    });

    serverProcess.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0 || hasOutput) {
        console.log("✅ Server process completed");
        resolve(true);
      } else {
        console.log("❌ Server process exited with code:", code);
        resolve(false);
      }
    });

    // Send a test input to simulate MCP handshake
    setTimeout(() => {
      try {
        const initMessage =
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2024-06-18",
              capabilities: {},
              clientInfo: {
                name: "test-client",
                version: "1.0.0",
              },
            },
          }) + "\n";

        serverProcess.stdin?.write(initMessage);
      } catch (error) {
        console.log("⚠️ Could not send test message:", error);
      }
    }, 500);
  });
}

async function checkProcesses() {
  console.log("\n🔍 Checking Running Processes...\n");

  return new Promise<void>((resolve) => {
    const ps = spawn("ps", ["aux"]);
    let output = "";

    ps.stdout.on("data", (data) => {
      output += data.toString();
    });

    ps.on("close", () => {
      const lines = output.split("\n");
      const mcpProcesses = lines.filter(
        (line) =>
          (line.includes("tsx") && line.includes("mcp")) ||
          line.includes("BeruMemorix") ||
          line.includes("server.ts")
      );

      if (mcpProcesses.length > 0) {
        console.log("🔍 Found MCP-related processes:");
        mcpProcesses.forEach((line) => console.log("  ", line.trim()));
      } else {
        console.log("ℹ️ No MCP-related processes found");
      }
      resolve();
    });
  });
}

async function checkCursorLogs() {
  console.log("\n📋 Checking Cursor Logs...\n");

  const logPaths = [
    path.join(process.env.HOME!, "Library", "Logs", "Cursor"),
    path.join(process.env.HOME!, ".cursor", "logs"),
    path.join(
      process.env.HOME!,
      "Library",
      "Application Support",
      "Cursor",
      "logs"
    ),
  ];

  for (const logPath of logPaths) {
    if (fs.existsSync(logPath)) {
      console.log("📁 Found log directory:", logPath);
      try {
        const files = fs.readdirSync(logPath);
        const recentLogs = files
          .filter((f) => f.includes("main") || f.includes("renderer"))
          .slice(-3);

        console.log("📄 Recent log files:", recentLogs);
      } catch (error) {
        console.log("⚠️ Could not read log directory:", error);
      }
    }
  }
}

async function generateDiagnostics() {
  console.log("\n🩺 Generating Diagnostics...\n");

  console.log("📊 Environment Info:");
  console.log("  Node version:", process.version);
  console.log("  Platform:", process.platform);
  console.log("  Architecture:", process.arch);
  console.log("  Working directory:", process.cwd());
  console.log("  User home:", process.env.HOME);

  console.log("\n📦 Package Info:");
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    console.log("  Project:", packageJson.name, packageJson.version);
    console.log(
      "  MCP SDK version:",
      packageJson.dependencies?.["@modelcontextprotocol/sdk"] || "Not found"
    );
  } catch (error) {
    console.log("  ⚠️ Could not read package.json");
  }
}

async function main() {
  console.log("🔍 BeruMemorix MCP Server Status Check\n");
  console.log("=" + "=".repeat(50) + "\n");

  const configOk = await checkMcpConfig();
  const serverOk = await testServerConnection();
  await checkProcesses();
  await checkCursorLogs();
  await generateDiagnostics();

  console.log("\n" + "=".repeat(50));
  console.log("📋 Summary:");
  console.log("  MCP Config:", configOk ? "✅ OK" : "❌ FAIL");
  console.log("  Server Connection:", serverOk ? "✅ OK" : "❌ FAIL");

  if (configOk && serverOk) {
    console.log("\n🎉 Server appears to be working correctly!");
    console.log("💡 If Cursor still shows red status, try:");
    console.log("   1. Completely quit Cursor (Cmd+Q)");
    console.log("   2. Wait 5 seconds");
    console.log("   3. Restart Cursor");
    console.log("   4. Check MCP Tools section in settings");
  } else {
    console.log("\n❌ Issues detected. Please review the output above.");
  }
}

main().catch(console.error);
