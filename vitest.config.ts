import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}", "tests/**/*.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist", "build"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "dist/**",
        "build/**",
        "coverage/**",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/index.ts",
        "src/types/**",
        "tests/**",
        "scripts/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/types": resolve(__dirname, "./src/types"),
      "@/config": resolve(__dirname, "./src/config"),
      "@/utils": resolve(__dirname, "./src/utils"),
      "@/services": resolve(__dirname, "./src/services"),
      "@/middleware": resolve(__dirname, "./src/middleware"),
      "@/controllers": resolve(__dirname, "./src/controllers"),
      "@/models": resolve(__dirname, "./src/models"),
      "@/schemas": resolve(__dirname, "./src/schemas"),
      "@/mcp": resolve(__dirname, "./src/mcp"),
      "@/db": resolve(__dirname, "./src/db"),
      "@/tests": resolve(__dirname, "./tests"),
    },
  },
  esbuild: {
    target: "es2022",
  },
});
