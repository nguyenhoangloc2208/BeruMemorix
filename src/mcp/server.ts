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

const UpdateMemorySchema = z.object({
  id: z.string().min(1, "Memory ID is required"),
  content: z.string().optional(),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  operation: z
    .enum(["retrieve", "update", "merge", "consolidate"])
    .optional()
    .default("retrieve"),
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

// Enhanced update/retrieve memory function
async function updateMemory(args: z.infer<typeof UpdateMemorySchema>) {
  try {
    const { id, content, title, tags, category, operation } = args;

    // First, get the existing memory
    const existingMemory = await memoryStorage.retrieve(id);
    if (!existingMemory) {
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

    // Handle different operations
    switch (operation) {
      case "retrieve":
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  operation: "retrieve",
                  memory: existingMemory,
                },
                null,
                2
              ),
            },
          ],
        };

      case "update":
        // Update the memory with new content/metadata
        const updateData: Partial<MemoryItem["metadata"]> = {};
        if (title !== undefined) updateData.title = title;
        if (tags !== undefined) updateData.tags = tags;
        if (category !== undefined) updateData.category = category;

        const updatedMemory = await memoryStorage.update(
          id,
          content,
          updateData
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  operation: "update",
                  memory: updatedMemory,
                  message: "Memory updated successfully",
                },
                null,
                2
              ),
            },
          ],
        };

      case "merge":
        // Find similar memories and suggest merge candidates
        const allMemoriesForMerge = await memoryStorage.getAll();
        const similarMemories = await findSimilarMemories(
          existingMemory,
          allMemoriesForMerge
        );

        if (similarMemories.length > 0) {
          // Auto-merge with most similar memory
          const mergeCandidate = similarMemories[0];
          if (!mergeCandidate) {
            throw new Error("Merge candidate is undefined");
          }

          const mergedContent = `${existingMemory.content}\n\n[MERGED FROM ${mergeCandidate.id}]: ${mergeCandidate.content}`;
          const mergedTags = [
            ...new Set([
              ...(existingMemory.metadata.tags || []),
              ...(mergeCandidate.metadata.tags || []),
            ]),
          ];

          const updateMetadata: Partial<MemoryItem["metadata"]> = {
            tags: mergedTags,
          };
          const mergedTitle =
            existingMemory.metadata.title || mergeCandidate.metadata.title;
          if (mergedTitle) {
            updateMetadata.title = mergedTitle;
          }
          const mergedCategory =
            existingMemory.metadata.category ||
            mergeCandidate.metadata.category;
          if (mergedCategory) {
            updateMetadata.category = mergedCategory;
          }

          const mergedMemory = await memoryStorage.update(
            id,
            mergedContent,
            updateMetadata
          );

          // Delete the merged memory
          await memoryStorage.delete(mergeCandidate.id);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    success: true,
                    operation: "merge",
                    memory: mergedMemory,
                    mergedWith: mergeCandidate.id,
                    message: `Memory merged with ${mergeCandidate.id}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    success: true,
                    operation: "merge",
                    memory: existingMemory,
                    message: "No similar memories found to merge",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

      case "consolidate":
        // Consolidate related memories by topic/category
        const allMemoriesForConsolidate = await memoryStorage.getAll();
        const relatedMemories = await findRelatedMemories(
          existingMemory,
          allMemoriesForConsolidate
        );
        const consolidationSummary = generateConsolidationSummary(
          existingMemory,
          relatedMemories
        );

        const consolidateUpdateMetadata: Partial<MemoryItem["metadata"]> = {
          title: consolidationSummary.title,
          tags: consolidationSummary.tags,
        };
        if (existingMemory.metadata.category) {
          consolidateUpdateMetadata.category = existingMemory.metadata.category;
        }

        const consolidatedMemory = await memoryStorage.update(
          id,
          consolidationSummary.content,
          consolidateUpdateMetadata
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  operation: "consolidate",
                  memory: consolidatedMemory,
                  consolidatedCount: relatedMemories.length,
                  message: `Memory consolidated with ${relatedMemories.length} related memories`,
                },
                null,
                2
              ),
            },
          ],
        };

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error.message || "Failed to update memory",
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

// Helper function to find similar memories
async function findSimilarMemories(
  targetMemory: MemoryItem,
  allMemories: MemoryItem[],
  threshold: number = 0.7
): Promise<MemoryItem[]> {
  const targetWords = new Set(targetMemory.content.toLowerCase().split(/\s+/));
  const similar: Array<{ memory: MemoryItem; similarity: number }> = [];

  for (const memory of allMemories) {
    if (memory.id === targetMemory.id) continue;

    const memoryWords = new Set(memory.content.toLowerCase().split(/\s+/));
    const intersection = new Set(
      [...targetWords].filter((x) => memoryWords.has(x))
    );
    const union = new Set([...targetWords, ...memoryWords]);
    const similarity = intersection.size / union.size;

    if (similarity >= threshold) {
      similar.push({ memory, similarity });
    }
  }

  return similar
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map((item) => item.memory);
}

// Helper function to find related memories by category/tags
async function findRelatedMemories(
  targetMemory: MemoryItem,
  allMemories: MemoryItem[]
): Promise<MemoryItem[]> {
  const related: MemoryItem[] = [];

  for (const memory of allMemories) {
    if (memory.id === targetMemory.id) continue;

    // Check category match
    if (
      memory.metadata.category &&
      targetMemory.metadata.category &&
      memory.metadata.category === targetMemory.metadata.category
    ) {
      related.push(memory);
      continue;
    }

    // Check tag overlap
    const targetTags = new Set(targetMemory.metadata.tags || []);
    const memoryTags = new Set(memory.metadata.tags || []);
    const tagOverlap = [...targetTags].filter((tag) => memoryTags.has(tag));

    if (tagOverlap.length >= 2) {
      related.push(memory);
    }
  }

  return related.slice(0, 5); // Limit to 5 related memories
}

// Helper function to generate consolidation summary
function generateConsolidationSummary(
  mainMemory: MemoryItem,
  relatedMemories: MemoryItem[]
): {
  content: string;
  title: string;
  tags: string[];
} {
  const allTags = new Set(mainMemory.metadata.tags || []);
  relatedMemories.forEach((mem) => {
    (mem.metadata.tags || []).forEach((tag) => allTags.add(tag));
  });

  const consolidatedContent = [
    `# ${mainMemory.metadata.title || "Consolidated Memory"}`,
    "",
    "## Main Content:",
    mainMemory.content,
    "",
    "## Related Information:",
    ...relatedMemories.map(
      (mem, idx) =>
        `### ${idx + 1}. ${
          mem.metadata.title || `Related Memory ${idx + 1}`
        }\n${mem.content}`
    ),
    "",
    `## Summary: Consolidated from ${
      relatedMemories.length + 1
    } related memories`,
  ].join("\n");

  return {
    content: consolidatedContent,
    title: `Consolidated: ${mainMemory.metadata.title || "Memory"}`,
    tags: Array.from(allTags),
  };
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
  "update_memory",
  "Update/retrieve a memory by ID. Supports multiple operations: retrieve, update, merge, consolidate",
  {
    id: z.string(),
    content: z.string().optional(),
    title: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    operation: z
      .enum(["retrieve", "update", "merge", "consolidate"])
      .optional(),
  },
  async (args) => {
    const validated = UpdateMemorySchema.parse(args);
    return await updateMemory(validated);
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
