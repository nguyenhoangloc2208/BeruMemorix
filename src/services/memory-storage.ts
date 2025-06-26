import { promises as fs } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import { EnhancedSearchService } from "./enhanced-search.js";
import type {
  SearchResponse,
  EnhancedSearchOptions,
} from "./enhanced-search.js";

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "../..");

// Memory storage interface
export interface MemoryItem {
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

export class MemoryStorage {
  private memories = new Map<string, MemoryItem>();
  private readonly dataDir: string;
  private readonly dataFile: string;
  private isLoaded = false;
  public enhancedSearchService = new EnhancedSearchService();

  constructor(dataDir = "data") {
    // Use project root to ensure it works from any working directory
    this.dataDir = resolve(PROJECT_ROOT, dataDir);
    this.dataFile = join(this.dataDir, "memories.json");
  }

  // Ensure data directory exists
  private async ensureDataDir(): Promise<void> {
    try {
      console.error(`Checking data directory: ${this.dataDir}`);
      await fs.access(this.dataDir);
      console.error(`Data directory exists: ${this.dataDir}`);
    } catch {
      console.error(`Creating data directory: ${this.dataDir}`);
      await fs.mkdir(this.dataDir, { recursive: true });
      console.error(`Data directory created: ${this.dataDir}`);
    }
  }

  // Load memories from file
  private async loadFromFile(): Promise<void> {
    if (this.isLoaded) return;

    try {
      await this.ensureDataDir();

      try {
        const data = await fs.readFile(this.dataFile, "utf-8");
        const memoriesArray: MemoryItem[] = JSON.parse(data);

        this.memories.clear();
        for (const memory of memoriesArray) {
          this.memories.set(memory.id, memory);
        }

        console.error(`Loaded ${memoriesArray.length} memories from storage`);
      } catch (error: any) {
        if (error.code === "ENOENT") {
          // File doesn't exist yet, start with empty storage
          console.error(
            "No existing memory file found, starting with empty storage"
          );
        } else {
          console.error("Error loading memories:", error.message);
        }
      }
    } catch (error: any) {
      console.error("Failed to initialize memory storage:", error.message);
    }

    this.isLoaded = true;
  }

  // Save memories to file
  private async saveToFile(): Promise<void> {
    try {
      await this.ensureDataDir();

      const memoriesArray = Array.from(this.memories.values());
      const data = JSON.stringify(memoriesArray, null, 2);

      await fs.writeFile(this.dataFile, data, "utf-8");
      console.error(`Saved ${memoriesArray.length} memories to storage`);
    } catch (error: any) {
      console.error("Failed to save memories:", error.message);
      throw error;
    }
  }

  // Store a new memory
  async store(
    content: string,
    metadata: Partial<MemoryItem["metadata"]> = {}
  ): Promise<string> {
    await this.loadFromFile();

    const id = nanoid();
    const now = new Date().toISOString();

    const memory: MemoryItem = {
      id,
      content,
      metadata: {
        ...metadata,
        tags: metadata.tags || [],
        createdAt: now,
        updatedAt: now,
      },
    };

    this.memories.set(id, memory);
    await this.saveToFile();

    return id;
  }

  // Retrieve a memory by ID
  async retrieve(id: string): Promise<MemoryItem | null> {
    await this.loadFromFile();
    return this.memories.get(id) || null;
  }

  // Legacy search method (kept for backward compatibility)
  async search(
    query: string,
    options: {
      category?: string;
      tags?: string[];
      limit?: number;
    } = {}
  ): Promise<MemoryItem[]> {
    const enhancedResults = await this.searchEnhanced(query, {
      ...options,
      maxResults: options.limit || 10,
    });

    return enhancedResults.results.map((result) => result.memory);
  }

  // Enhanced search with fuzzy matching and suggestions
  async searchEnhanced(
    query: string,
    options: Partial<EnhancedSearchOptions> & {
      category?: string;
      tags?: string[];
      limit?: number;
    } = {}
  ): Promise<SearchResponse> {
    await this.loadFromFile();

    const allMemories = Array.from(this.memories.values());

    // Apply legacy filters first if provided
    let filteredMemories = allMemories;

    if (options.category || options.tags) {
      filteredMemories = allMemories.filter((memory) => {
        const categoryMatch =
          !options.category || memory.metadata.category === options.category;
        const tagsMatch =
          !options.tags ||
          options.tags.some((tag) => memory.metadata.tags?.includes(tag));
        return categoryMatch && tagsMatch;
      });
    }

    // Convert limit to maxResults for enhanced search
    const enhancedOptions: Partial<EnhancedSearchOptions> = {
      ...options,
      maxResults: options.limit || options.maxResults || 10,
    };

    return await this.enhancedSearchService.search(
      query,
      filteredMemories,
      enhancedOptions
    );
  }

  // Get all memories
  async getAll(): Promise<MemoryItem[]> {
    await this.loadFromFile();
    return Array.from(this.memories.values());
  }

  // Delete a memory
  async delete(id: string): Promise<boolean> {
    await this.loadFromFile();

    const existed = this.memories.has(id);
    if (existed) {
      this.memories.delete(id);
      await this.saveToFile();
    }

    return existed;
  }

  // Get storage statistics
  async getStats(): Promise<{
    totalMemories: number;
    categoriesCount: number;
    tagsCount: number;
    categories: string[];
    tags: string[];
  }> {
    await this.loadFromFile();

    const allMemories = Array.from(this.memories.values());
    const categories = new Set(
      allMemories.map((m) => m.metadata.category).filter(Boolean) as string[]
    );
    const tags = new Set(allMemories.flatMap((m) => m.metadata.tags || []));

    return {
      totalMemories: allMemories.length,
      categoriesCount: categories.size,
      tagsCount: tags.size,
      categories: Array.from(categories),
      tags: Array.from(tags),
    };
  }

  // Clear all memories (for testing)
  async clear(): Promise<void> {
    await this.loadFromFile();
    this.memories.clear();
    await this.saveToFile();
  }
}

// Export singleton instance
export const memoryStorage = new MemoryStorage();
