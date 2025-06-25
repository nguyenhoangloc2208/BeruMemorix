#!/usr/bin/env tsx

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const WORKSPACE_STRUCTURE = [
  "src",
  "src/config",
  "src/controllers",
  "src/db",
  "src/middleware",
  "src/models",
  "src/mcp",
  "src/schemas",
  "src/services",
  "src/types",
  "src/utils",
  "tests",
  "tests/unit",
  "tests/integration",
  "tests/fixtures",
  "scripts",
  "docker",
  "docs",
];

const GITIGNORE_CONTENT = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build outputs
dist/
build/
target/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Coverage
coverage/
.nyc_output/

# Cache
.cache/
.parcel-cache/
.eslintcache
.stylelintcache
.biome-cache/

# Editor
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite
*.sqlite3

# TypeScript
*.tsbuildinfo

# Testing
**/__snapshots__/
*.snap

# Docker
docker/data/
docker/logs/
`;

async function createDirectory(path: string): Promise<void> {
  if (!existsSync(path)) {
    await mkdir(path, { recursive: true });
    console.log(`✅ Created directory: ${path}`);
  } else {
    console.log(`📁 Directory exists: ${path}`);
  }
}

async function createGitignore(): Promise<void> {
  const gitignorePath = ".gitignore";
  if (!existsSync(gitignorePath)) {
    await writeFile(gitignorePath, GITIGNORE_CONTENT);
    console.log("✅ Created .gitignore");
  } else {
    console.log("📄 .gitignore exists");
  }
}

async function setupWorkspace(): Promise<void> {
  console.log("🚀 Setting up BeruMemorix workspace...\n");

  try {
    // Create directory structure
    console.log("📁 Creating directory structure...");
    for (const dir of WORKSPACE_STRUCTURE) {
      await createDirectory(dir);
    }

    // Create .gitignore
    console.log("\n📄 Setting up .gitignore...");
    await createGitignore();

    console.log("\n✨ Workspace setup complete!");
    console.log("\n📋 Next steps:");
    console.log("1. npm install (install dependencies)");
    console.log("2. npm run check (verify biome setup)");
    console.log("3. npm run dev (start development server)");
    console.log("4. npm run test (run tests)");
  } catch (error) {
    console.error("❌ Error setting up workspace:", error);
    process.exit(1);
  }
}

// Run setup if called directly
if (process.argv[1]?.endsWith("setup-workspace.ts")) {
  setupWorkspace();
}

export { setupWorkspace };
