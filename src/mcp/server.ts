import type {
  CreateMemoryRequest,
  Memory,
  MemorySearchResult,
  MemoryStats,
  SearchMemoryRequest,
} from '@/types/memory';
import { logger } from '@/utils/logger';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

export class BeruMemorixServer {
  private server: Server;
  private memories: Map<string, Memory> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'beru-memorix',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<{ tools: Tool[] }> => {
      return {
        tools: [
          {
            name: 'store_memory',
            description: 'Store a new memory with optional metadata',
            inputSchema: {
              type: 'object',
              properties: {
                content: { type: 'string', description: 'Content to store' },
                type: {
                  type: 'string',
                  enum: ['short_term', 'long_term', 'session', 'persistent'],
                  description: 'Type of memory',
                  default: 'short_term',
                },
                source: {
                  type: 'string',
                  description: 'Source of the memory',
                },
                context: {
                  type: 'string',
                  description: 'Context information',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for categorization',
                },
                importance_score: {
                  type: 'number',
                  minimum: 0,
                  maximum: 10,
                  description: 'Importance score (0-10)',
                },
              },
              required: ['content', 'source'],
            },
          },
          {
            name: 'retrieve_memory',
            description: 'Retrieve a memory by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Memory ID' },
              },
              required: ['id'],
            },
          },
          {
            name: 'search_memory',
            description: 'Search memories by content or metadata',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                type: {
                  type: 'string',
                  enum: ['short_term', 'long_term', 'session', 'persistent'],
                  description: 'Filter by memory type',
                },
                limit: {
                  type: 'number',
                  minimum: 1,
                  maximum: 100,
                  default: 10,
                  description: 'Maximum number of results',
                },
                include_metadata: {
                  type: 'boolean',
                  default: true,
                  description: 'Include metadata in results',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_memory_stats',
            description: 'Get memory usage statistics',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'delete_memory',
            description: 'Delete a memory by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Memory ID' },
              },
              required: ['id'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'store_memory':
            return await this.storeMemory(args as unknown as CreateMemoryRequest);
          case 'retrieve_memory': {
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments for retrieve_memory');
            }
            return await this.retrieveMemory(args.id as string);
          }
          case 'search_memory':
            return await this.searchMemory(args as unknown as SearchMemoryRequest);
          case 'get_memory_stats':
            return await this.getMemoryStats();
          case 'delete_memory': {
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments for delete_memory');
            }
            return await this.deleteMemory(args.id as string);
          }
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Tool execution error', {
          tool: name,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async storeMemory(request: CreateMemoryRequest) {
    const { nanoid } = await import('nanoid');

    const memory: Memory = {
      id: nanoid(),
      type: request.type || 'short_term',
      content: request.content,
      metadata: {
        timestamp: new Date(),
        source: request.source,
        context: request.context || '',
        tags: request.tags || [],
        importance_score: request.importance_score || 5,
        access_count: 0,
      },
    };

    this.memories.set(memory.id, memory);

    logger.info('Memory stored', { id: memory.id, type: memory.type });

    return {
      content: [
        {
          type: 'text',
          text: `Memory stored successfully with ID: ${memory.id}`,
        },
      ],
    };
  }

  private async retrieveMemory(id: string) {
    const memory = this.memories.get(id);

    if (!memory) {
      return {
        content: [
          {
            type: 'text',
            text: `Memory with ID ${id} not found`,
          },
        ],
      };
    }

    // Update access count
    memory.metadata.access_count += 1;
    memory.metadata.last_accessed = new Date();

    logger.info('Memory retrieved', { id });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(memory, null, 2),
        },
      ],
    };
  }

  private async searchMemory(request: SearchMemoryRequest) {
    const { query, type, limit = 10 } = request;
    const results: MemorySearchResult[] = [];

    for (const [_id, memory] of this.memories) {
      if (type && memory.type !== type) {
        continue;
      }

      // Simple text matching (in production, use vector similarity)
      const contentMatch = memory.content.toLowerCase().includes(query.toLowerCase());
      const tagMatch = memory.metadata.tags.some((tag) =>
        tag.toLowerCase().includes(query.toLowerCase())
      );

      if (contentMatch || tagMatch) {
        results.push({
          memory,
          similarity_score: contentMatch ? 0.9 : 0.7,
          rank: results.length + 1,
        });
      }
    }

    // Sort by similarity score and limit results
    const sortedResults = results
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit);

    logger.info('Memory search completed', {
      query,
      resultsCount: sortedResults.length,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(sortedResults, null, 2),
        },
      ],
    };
  }

  private async getMemoryStats(): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const stats: MemoryStats = {
      total_memories: this.memories.size,
      by_type: {
        short_term: 0,
        long_term: 0,
        session: 0,
        persistent: 0,
      },
      storage_used: 0,
      avg_importance_score: 0,
      most_recent_access: new Date(0),
    };

    let totalImportance = 0;

    for (const memory of this.memories.values()) {
      stats.by_type[memory.type] += 1;
      stats.storage_used += JSON.stringify(memory).length;
      totalImportance += memory.metadata.importance_score;

      if (
        memory.metadata.last_accessed &&
        memory.metadata.last_accessed > stats.most_recent_access
      ) {
        stats.most_recent_access = memory.metadata.last_accessed;
      }
    }

    stats.avg_importance_score = this.memories.size > 0 ? totalImportance / this.memories.size : 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }

  private async deleteMemory(id: string) {
    const deleted = this.memories.delete(id);

    if (!deleted) {
      return {
        content: [
          {
            type: 'text',
            text: `Memory with ID ${id} not found`,
          },
        ],
      };
    }

    logger.info('Memory deleted', { id });

    return {
      content: [
        {
          type: 'text',
          text: `Memory with ID ${id} deleted successfully`,
        },
      ],
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('BeruMemorix MCP Server started');
  }
}
