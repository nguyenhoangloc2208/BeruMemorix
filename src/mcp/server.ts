#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { memoryStorage } from "../services/memory-storage.js";
import type { MemoryItem } from "../services/memory-storage.js";

// Create the MCP server
const server = new McpServer({
  name: "BeruMemorix",
  version: "1.0.0",
});

// Validation schemas
const StoreMemorySchema = z.object({
  content: z.string().min(1, "Content is required"),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
});

const RetrieveMemorySchema = z.object({
  id: z.string().min(1, "Memory ID is required"),
});

// Enhanced unified search schema with all features
const SearchMemorySchema = z.object({
  query: z.string().min(1, "Search query is required"),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional().default(10),
  // Enhanced search options
  searchType: z.enum(["exact", "fuzzy", "auto"]).optional().default("auto"),
  fuzzyTolerance: z.number().min(0).max(1).optional(),
  includeSuggestions: z.boolean().optional().default(false),
  maxSuggestions: z.number().min(1).max(20).optional().default(5),
});

const DeleteMemorySchema = z.object({
  id: z.string().min(1, "Memory ID is required"),
});

// Store memory function
async function storeMemory(args: z.infer<typeof StoreMemorySchema>) {
  try {
    const { content, title, tags, category } = args;

    // Filter out undefined values
    const metadata: Partial<MemoryItem["metadata"]> = {};
    if (title !== undefined) metadata.title = title;
    if (tags !== undefined) metadata.tags = tags;
    if (category !== undefined) metadata.category = category;

    const id = await memoryStorage.store(content, metadata);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              id,
              message: "Memory stored successfully",
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error.message || "Failed to store memory",
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

// Retrieve memory function
async function retrieveMemory(args: z.infer<typeof RetrieveMemorySchema>) {
  try {
    const { id } = args;

    const memory = await memoryStorage.retrieve(id);
    if (!memory) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: false,
                error: "Memory not found",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              memory,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error.message || "Failed to retrieve memory",
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

// Unified search memory function with all features
async function searchMemory(args: z.infer<typeof SearchMemorySchema>) {
  try {
    const {
      query,
      category,
      tags,
      limit,
      searchType,
      fuzzyTolerance,
      includeSuggestions,
      maxSuggestions,
    } = args;

    // Build search options
    const searchOptions: any = {};
    if (category !== undefined) searchOptions.category = category;
    if (tags !== undefined) searchOptions.tags = tags;
    if (limit !== undefined) searchOptions.limit = limit;
    if (fuzzyTolerance !== undefined)
      searchOptions.fuzzyTolerance = fuzzyTolerance;
    if (includeSuggestions !== undefined)
      searchOptions.includeSuggestions = includeSuggestions;
    if (searchType !== undefined) searchOptions.searchType = searchType;

    // Use enhanced search for all search types
    const result = await memoryStorage.searchEnhanced(query, searchOptions);

    // If suggestions requested but no results, generate suggestions
    let suggestions: string[] = [];
    if (includeSuggestions && result.results.length === 0) {
      const allMemories = await memoryStorage.getAll();
      suggestions =
        await memoryStorage.enhancedSearchService.searchWithAutoComplete(
          query,
          allMemories,
          maxSuggestions || 5
        );
    }

    // Extract just the memories for backward compatibility
    const memories = result.results.map((r) => r.memory);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              count: memories.length,
              memories: memories,
              searchType: result.searchType,
              executionTime: result.executionTime,
              ...(suggestions.length > 0 && { suggestions }),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error.message || "Failed to search memories",
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

// Get memory stats function
async function getMemoryStats() {
  try {
    const stats = await memoryStorage.getStats();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              stats,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error.message || "Failed to get memory stats",
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

// Delete memory function
async function deleteMemory(args: z.infer<typeof DeleteMemorySchema>) {
  try {
    const { id } = args;

    const deleted = await memoryStorage.delete(id);
    if (!deleted) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: false,
                error: "Memory not found",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              message: "Memory deleted successfully",
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error.message || "Failed to delete memory",
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

// Register tools using the correct MCP server API
server.tool(
  "store_memory",
  "Store a memory with optional metadata",
  {
    content: z.string(),
    title: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
  },
  async (args) => {
    const validated = StoreMemorySchema.parse(args);
    return await storeMemory(validated);
  }
);

server.tool(
  "retrieve_memory",
  "Retrieve a memory by ID",
  {
    id: z.string(),
  },
  async (args) => {
    const validated = RetrieveMemorySchema.parse(args);
    return await retrieveMemory(validated);
  }
);

server.tool(
  "search_memory",
  "Search memories with advanced options: exact/fuzzy search, suggestions, and filtering. Supports auto mode (exact first, fuzzy fallback), fuzzy tolerance, and search suggestions.",
  {
    query: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    limit: z.number().optional(),
    searchType: z.enum(["exact", "fuzzy", "auto"]).optional(),
    fuzzyTolerance: z.number().optional(),
    includeSuggestions: z.boolean().optional(),
    maxSuggestions: z.number().optional(),
  },
  async (args) => {
    const validated = SearchMemorySchema.parse(args);
    return await searchMemory(validated);
  }
);

server.tool("get_memory_stats", "Get memory usage statistics", {}, async () => {
  return await getMemoryStats();
});

server.tool(
  "delete_memory",
  "Delete a memory by ID",
  {
    id: z.string(),
  },
  async (args) => {
    const validated = DeleteMemorySchema.parse(args);
    return await deleteMemory(validated);
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BeruMemorix MCP Server running with 5 optimized tools");
}

// Export main function for use by other modules
export { main };

// Start the server if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
