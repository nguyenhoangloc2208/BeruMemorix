import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";

// Global test setup
beforeAll(async () => {
  // Setup test environment
  process.env["NODE_ENV"] = "test";
  process.env["LOG_LEVEL"] = "error"; // Suppress logs during tests
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(async () => {
  // Setup before each test
});

afterEach(async () => {
  // Cleanup after each test
});

// Global test utilities
export const createTestMemory = () => ({
  content: "Test memory content",
  source: "test",
  context: "Test context",
  tags: ["test", "memory"],
  importance_score: 5,
});

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
