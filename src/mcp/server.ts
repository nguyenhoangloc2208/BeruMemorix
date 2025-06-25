#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { nanoid } from "nanoid";
import { z } from "zod";

// Memory storage interface
interface MemoryItem {
  id: string;
  content: string;
  metadata: {
    title?: string;
    tags?: string[];
    category?: string;
    createdAt: string;
    updatedAt: string;
  };
}

// Memory storage - simple in-memory Map for demonstration
const memories = new Map<string, MemoryItem>();

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

    const id = nanoid();
    const now = new Date().toISOString();

    const memory: MemoryItem = {
      id,
      content,
      metadata: {
        ...(title && { title }),
        tags: tags || [],
        ...(category && { category }),
        createdAt: now,
        updatedAt: now,
      },
    };

    memories.set(id, memory);

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

    const memory = memories.get(id);
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

    const allMemories = Array.from(memories.values());

    // Simple search implementation
    let filteredMemories = allMemories.filter((memory) => {
      // Content search
      const contentMatch =
        memory.content.toLowerCase().includes(query.toLowerCase()) ||
        (memory.metadata.title &&
          memory.metadata.title.toLowerCase().includes(query.toLowerCase()));

      // Category filter
      const categoryMatch = !category || memory.metadata.category === category;

      // Tags filter
      const tagsMatch =
        !tags || tags.some((tag) => memory.metadata.tags?.includes(tag));

      return contentMatch && categoryMatch && tagsMatch;
    });

    // Sort by updated date (most recent first)
    filteredMemories.sort(
      (a, b) =>
        new Date(b.metadata.updatedAt).getTime() -
        new Date(a.metadata.updatedAt).getTime()
    );

    // Apply limit
    filteredMemories = filteredMemories.slice(0, limit);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              count: filteredMemories.length,
              memories: filteredMemories,
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
    const allMemories = Array.from(memories.values());
    const categories = new Set(
      allMemories.map((m) => m.metadata.category).filter(Boolean)
    );
    const tags = new Set(allMemories.flatMap((m) => m.metadata.tags || []));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              stats: {
                totalMemories: allMemories.length,
                categoriesCount: categories.size,
                tagsCount: tags.size,
                categories: Array.from(categories),
                tags: Array.from(tags),
              },
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

    const existed = memories.has(id);
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

    memories.delete(id);

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
