#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { generateId } from "../utils/logger.js";
import { FileStorage, type MemoryItem } from "../utils/file-storage.js";

// Initialize file storage
const storage = new FileStorage();

console.error("BeruMemorix MCP Server starting...");

const server = new Server(
  {
    name: "BeruMemorix",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools: Tool[] = [
  {
    name: "store_memory",
    description: "Store a memory with optional metadata",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Memory content" },
        title: { type: "string", description: "Memory title" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Memory tags",
        },
        category: { type: "string", description: "Memory category" },
      },
      required: ["content"],
    },
  },
  {
    name: "retrieve_memory",
    description: "Retrieve a memory by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Memory ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "search_memory",
    description: "Search memories by content or metadata",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        category: { type: "string", description: "Filter by category" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
        limit: { type: "number", description: "Limit results" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_memory_stats",
    description: "Get memory usage statistics",
    inputSchema: {
      type: "object",
      properties: {
        random_string: {
          type: "string",
          description: "Dummy parameter for no-parameter tools",
        },
      },
      required: ["random_string"],
    },
  },
  {
    name: "delete_memory",
    description: "Delete a memory by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Memory ID" },
      },
      required: ["id"],
    },
  },
];

// Handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "store_memory": {
      const { content, title, tags, category } = args as {
        content: string;
        title?: string;
        tags?: string[];
        category?: string;
      };

      const id = generateId();
      const now = new Date().toISOString();

      const memory: MemoryItem = {
        id,
        content,
        metadata: {
          ...(title && { title }),
          ...(tags && { tags }),
          ...(category && { category }),
          createdAt: now,
          updatedAt: now,
        },
      };

      storage.set(id, memory);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              id,
              message: "Memory stored successfully",
              memory,
            }),
          },
        ],
      };
    }

    case "retrieve_memory": {
      const { id } = args as { id: string };

      const memory = storage.get(id);
      if (!memory) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Memory not found",
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              memory,
            }),
          },
        ],
      };
    }

    case "search_memory": {
      const {
        query,
        category,
        tags,
        limit = 10,
      } = args as {
        query: string;
        category?: string;
        tags?: string[];
        limit?: number;
      };

      let results = Array.from(storage.values());

      // Filter by category
      if (category) {
        results = results.filter(
          (memory) => memory.metadata.category === category
        );
      }

      // Filter by tags
      if (tags && tags.length > 0) {
        results = results.filter((memory) =>
          tags.some((tag) => memory.metadata.tags?.includes(tag))
        );
      }

      // Search in content and title
      const queryLower = query.toLowerCase();
      results = results.filter(
        (memory) =>
          memory.content.toLowerCase().includes(queryLower) ||
          memory.metadata.title?.toLowerCase().includes(queryLower)
      );

      // Limit results
      results = results.slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              results,
              count: results.length,
            }),
          },
        ],
      };
    }

    case "get_memory_stats": {
      const stats = storage.getStats();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              stats,
            }),
          },
        ],
      };
    }

    case "delete_memory": {
      const { id } = args as { id: string };

      const success = storage.delete(id);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success,
              message: success
                ? "Memory deleted successfully"
                : "Memory not found",
            }),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BeruMemorix MCP Server connected successfully!");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
