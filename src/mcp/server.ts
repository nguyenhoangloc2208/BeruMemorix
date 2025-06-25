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

const SearchMemorySchema = z.object({
  query: z.string().min(1, "Search query is required"),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional().default(10),
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

// Search memory function
async function searchMemory(args: z.infer<typeof SearchMemorySchema>) {
  try {
    const { query, category, tags, limit } = args;

    // Filter out undefined values
    const options: { category?: string; tags?: string[]; limit?: number } = {};
    if (category !== undefined) options.category = category;
    if (tags !== undefined) options.tags = tags;
    if (limit !== undefined) options.limit = limit;

    const memories = await memoryStorage.search(query, options);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              count: memories.length,
              memories,
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

    const existed = await memoryStorage.delete(id);
    if (!existed) {
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

// Register tools using the McpServer pattern
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
  "Search memories by content or metadata",
  {
    query: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    limit: z.number().optional(),
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
(async () => {
  try {
    console.error("BeruMemorix MCP Server starting...");

    const transport = new StdioServerTransport();

    // Ensure stdout is only used for JSON messages
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
      // Only allow JSON messages to pass through
      if (typeof chunk === "string" && !chunk.startsWith("{")) {
        return true; // Silently skip non-JSON messages
      }
      return originalStdoutWrite(chunk, encoding, callback);
    };

    await server.connect(transport);
    console.error("BeruMemorix MCP Server connected successfully!");
  } catch (error) {
    console.error("Failed to initialize BeruMemorix MCP server:", error);
    process.exit(1);
  }
})();
