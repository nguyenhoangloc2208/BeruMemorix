import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";

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

export class FileStorage {
  private dataFile: string;
  private dataDir: string;
  private memories: Map<string, MemoryItem>;

  constructor(dataPath: string = "./data/memories.json") {
    this.dataFile = dataPath;
    this.dataDir = dirname(dataPath);
    this.memories = new Map();
    this.ensureDataDirectory();
    this.loadData();
  }

  private ensureDataDirectory(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadData(): void {
    try {
      if (existsSync(this.dataFile)) {
        const rawData = readFileSync(this.dataFile, "utf-8");
        const data = JSON.parse(rawData) as Record<string, MemoryItem>;

        // Convert object back to Map
        Object.entries(data).forEach(([id, memory]) => {
          this.memories.set(id, memory);
        });

        console.error(
          `✅ Loaded ${this.memories.size} memories from ${this.dataFile}`
        );
      } else {
        console.error(
          `📝 No existing data file found. Starting with empty storage.`
        );
      }
    } catch (error) {
      console.error(`❌ Error loading data from ${this.dataFile}:`, error);
      console.error(`🔄 Starting with empty storage.`);
    }
  }

  private saveData(): void {
    try {
      // Convert Map to object for JSON serialization
      const data = Object.fromEntries(this.memories.entries());
      const jsonData = JSON.stringify(data, null, 2);

      writeFileSync(this.dataFile, jsonData, "utf-8");
      console.error(
        `💾 Saved ${this.memories.size} memories to ${this.dataFile}`
      );
    } catch (error) {
      console.error(`❌ Error saving data to ${this.dataFile}:`, error);
    }
  }

  // Map-compatible interface methods
  set(id: string, memory: MemoryItem): this {
    this.memories.set(id, memory);
    this.saveData(); // Auto-save on write
    return this;
  }

  get(id: string): MemoryItem | undefined {
    return this.memories.get(id);
  }

  has(id: string): boolean {
    return this.memories.has(id);
  }

  delete(id: string): boolean {
    const result = this.memories.delete(id);
    if (result) {
      this.saveData(); // Auto-save on delete
    }
    return result;
  }

  clear(): void {
    this.memories.clear();
    this.saveData();
  }

  values(): IterableIterator<MemoryItem> {
    return this.memories.values();
  }

  keys(): IterableIterator<string> {
    return this.memories.keys();
  }

  entries(): IterableIterator<[string, MemoryItem]> {
    return this.memories.entries();
  }

  get size(): number {
    return this.memories.size;
  }

  // Additional utility methods
  backup(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = this.dataFile.replace(
      ".json",
      `_backup_${timestamp}.json`
    );

    try {
      const data = Object.fromEntries(this.memories.entries());
      writeFileSync(backupFile, JSON.stringify(data, null, 2), "utf-8");
      console.error(`📦 Backup created: ${backupFile}`);
    } catch (error) {
      console.error(`❌ Error creating backup:`, error);
    }
  }

  getStats() {
    const memories = Array.from(this.memories.values());
    const categories = new Set(
      memories.map((m) => m.metadata.category).filter(Boolean)
    );
    const tags = new Set(memories.flatMap((m) => m.metadata.tags || []));

    return {
      totalMemories: memories.length,
      categoriesCount: categories.size,
      tagsCount: tags.size,
      categories: Array.from(categories),
      tags: Array.from(tags),
      dataFile: this.dataFile,
      lastSaved: existsSync(this.dataFile)
        ? new Date(readFileSync(this.dataFile, "utf-8")).toISOString()
        : null,
    };
  }
}
