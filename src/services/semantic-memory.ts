/**
 * Semantic Memory Service - Handles factual knowledge and conceptual relationships
 * Based on cognitive science: long-term knowledge store, fact-based, hierarchical
 */

import type {
  SemanticMemoryItem,
  SemanticMemorySearch,
  MemoryContext,
  MemoryTypeSearchResult,
  MemoryTypesConfig,
} from "../types/memory-types.js";

export interface KnowledgeCreationOptions {
  category: SemanticMemoryItem["category"];
  domain: string;
  confidence?: number;
  sources?: string[];
  examples?: string[];
  parentConcepts?: string[];
  childConcepts?: string[];
  relatedConcepts?: string[];
}

export class SemanticMemoryService {
  private items: Map<string, SemanticMemoryItem> = new Map();
  private domainIndex: Map<string, Set<string>> = new Map(); // domain -> itemIds
  private conceptIndex: Map<string, Set<string>> = new Map(); // concept name -> itemIds
  private config: MemoryTypesConfig["semanticMemory"];

  constructor(config?: Partial<MemoryTypesConfig["semanticMemory"]>) {
    this.config = {
      confidenceThreshold: config?.confidenceThreshold || 0.3,
      relationshipDepth: config?.relationshipDepth || 3,
      validationInterval: config?.validationInterval || 30, // days
    };
  }

  /**
   * Store factual knowledge or concepts
   */
  async storeKnowledge(
    content: string,
    context: MemoryContext,
    options: KnowledgeCreationOptions
  ): Promise<string> {
    const now = new Date().toISOString();
    const id = this.generateId();

    // Validate confidence level
    const confidence = Math.max(0, Math.min(1, options.confidence || 0.8));

    if (confidence < this.config.confidenceThreshold) {
      throw new Error(
        `Knowledge confidence ${confidence} below threshold ${this.config.confidenceThreshold}`
      );
    }

    const item: SemanticMemoryItem = {
      id,
      type: "semantic",
      content,
      category: options.category,
      domain: options.domain,
      confidence,
      sources: options.sources || [],
      relationships: {
        parentConcepts: options.parentConcepts || [],
        childConcepts: options.childConcepts || [],
        relatedConcepts: options.relatedConcepts || [],
      },
      examples: options.examples || [],
      lastValidated: now,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now,
    };

    // Store the knowledge
    this.items.set(id, item);

    // Index by domain
    if (!this.domainIndex.has(options.domain)) {
      this.domainIndex.set(options.domain, new Set());
    }
    this.domainIndex.get(options.domain)!.add(id);

    // Index by concept (using content as concept name for now)
    const conceptKey = this.extractConceptKey(content);
    if (!this.conceptIndex.has(conceptKey)) {
      this.conceptIndex.set(conceptKey, new Set());
    }
    this.conceptIndex.get(conceptKey)!.add(id);

    // Auto-discover and link related concepts
    await this.linkRelatedConcepts(item);

    return id;
  }

  /**
   * Retrieve specific knowledge by ID
   */
  async retrieve(id: string): Promise<SemanticMemoryItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    // Check if knowledge needs validation
    await this.validateKnowledgeFreshness(item);

    // Update access tracking
    item.accessCount++;
    item.lastAccessed = new Date().toISOString();
    this.items.set(id, item);

    return item;
  }

  /**
   * Search semantic memory
   */
  async search(
    query: string,
    searchOptions: SemanticMemorySearch = {},
    limit: number = 10
  ): Promise<MemoryTypeSearchResult<SemanticMemoryItem>> {
    const startTime = Date.now();
    let results: SemanticMemoryItem[] = [];

    // Get all items
    let allItems = Array.from(this.items.values());

    // Apply filters
    if (searchOptions.category) {
      allItems = allItems.filter(
        (item) => item.category === searchOptions.category
      );
    }

    if (searchOptions.domain) {
      allItems = allItems.filter(
        (item) => item.domain === searchOptions.domain
      );
    }

    if (searchOptions.confidence) {
      allItems = allItems.filter(
        (item) =>
          item.confidence >= searchOptions.confidence!.min &&
          item.confidence <= searchOptions.confidence!.max
      );
    }

    // Related concept search
    if (searchOptions.relatedTo) {
      const relatedItems = await this.findRelatedConcepts(
        searchOptions.relatedTo,
        this.config.relationshipDepth
      );
      const relatedIds = new Set(relatedItems.map((item) => item.id));
      allItems = allItems.filter((item) => relatedIds.has(item.id));
    }

    // Text search
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      allItems = allItems.filter((item) => {
        const contentMatch = item.content.toLowerCase().includes(queryLower);
        const exampleMatch = searchOptions.examples
          ? item.examples.some((example) =>
              example.toLowerCase().includes(queryLower)
            )
          : false;
        return contentMatch || exampleMatch;
      });
    }

    // Sort by relevance (confidence, access count, freshness)
    allItems.sort((a, b) => {
      let scoreA = a.confidence * 10; // Base confidence score
      let scoreB = b.confidence * 10;

      // Access count bonus
      scoreA += Math.log(a.accessCount + 1);
      scoreB += Math.log(b.accessCount + 1);

      // Freshness bonus (recently validated knowledge gets higher score)
      const ageA = Date.now() - new Date(a.lastValidated).getTime();
      const ageB = Date.now() - new Date(b.lastValidated).getTime();

      const maxAge = this.config.validationInterval * 24 * 60 * 60 * 1000;
      scoreA += (maxAge - ageA) / maxAge;
      scoreB += (maxAge - ageB) / maxAge;

      return scoreB - scoreA;
    });

    results = allItems.slice(0, limit);

    // Update access count for retrieved items
    results.forEach((item) => {
      item.accessCount++;
      item.lastAccessed = new Date().toISOString();
      this.items.set(item.id, item);
    });

    return {
      items: results,
      count: results.length,
      searchType: "semantic_knowledge",
      executionTime: Date.now() - startTime,
      context: {
        sessionId: "semantic_search",
        conversationId: "semantic_search",
        timestamp: new Date().toISOString(),
        priorities: ["factual_accuracy", "conceptual_clarity"],
      },
    };
  }

  /**
   * Find concepts related to a given concept
   */
  async findRelatedConcepts(
    conceptQuery: string,
    maxDepth: number = 2
  ): Promise<SemanticMemoryItem[]> {
    const visited = new Set<string>();
    const relatedItems: SemanticMemoryItem[] = [];

    // Start with direct matches
    const directMatches = Array.from(this.items.values()).filter(
      (item) =>
        item.content.toLowerCase().includes(conceptQuery.toLowerCase()) ||
        item.relationships.parentConcepts.includes(conceptQuery) ||
        item.relationships.childConcepts.includes(conceptQuery) ||
        item.relationships.relatedConcepts.includes(conceptQuery)
    );

    // BFS through relationships
    const queue: Array<{ item: SemanticMemoryItem; depth: number }> =
      directMatches.map((item) => ({ item, depth: 0 }));

    while (queue.length > 0) {
      const { item, depth } = queue.shift()!;

      if (visited.has(item.id) || depth > maxDepth) continue;

      visited.add(item.id);
      relatedItems.push(item);

      if (depth < maxDepth) {
        // Add related concepts to queue
        const relatedConcepts = [
          ...item.relationships.parentConcepts,
          ...item.relationships.childConcepts,
          ...item.relationships.relatedConcepts,
        ];

        relatedConcepts.forEach((conceptName) => {
          const conceptItems = this.getItemsByConcept(conceptName);
          conceptItems.forEach((conceptItem) => {
            if (!visited.has(conceptItem.id)) {
              queue.push({ item: conceptItem, depth: depth + 1 });
            }
          });
        });
      }
    }

    return relatedItems;
  }

  /**
   * Update knowledge confidence or add examples
   */
  async updateKnowledge(
    id: string,
    updates: Partial<{
      confidence: number;
      examples: string[];
      sources: string[];
      relationships: SemanticMemoryItem["relationships"];
    }>
  ): Promise<boolean> {
    const item = this.items.get(id);
    if (!item) return false;

    if (updates.confidence !== undefined) {
      item.confidence = Math.max(0, Math.min(1, updates.confidence));
    }

    if (updates.examples) {
      item.examples = [...new Set([...item.examples, ...updates.examples])];
    }

    if (updates.sources) {
      item.sources = [...new Set([...item.sources, ...updates.sources])];
    }

    if (updates.relationships) {
      item.relationships = {
        parentConcepts: [
          ...new Set([
            ...item.relationships.parentConcepts,
            ...updates.relationships.parentConcepts,
          ]),
        ],
        childConcepts: [
          ...new Set([
            ...item.relationships.childConcepts,
            ...updates.relationships.childConcepts,
          ]),
        ],
        relatedConcepts: [
          ...new Set([
            ...item.relationships.relatedConcepts,
            ...updates.relationships.relatedConcepts,
          ]),
        ],
      };
    }

    item.updatedAt = new Date().toISOString();
    item.lastValidated = new Date().toISOString();
    this.items.set(id, item);

    return true;
  }

  /**
   * Get knowledge by domain
   */
  async getKnowledgeByDomain(
    domain: string,
    limit: number = 20
  ): Promise<SemanticMemoryItem[]> {
    const domainItemIds = this.domainIndex.get(domain) || new Set();
    const items = Array.from(domainItemIds)
      .map((id) => this.items.get(id))
      .filter((item): item is SemanticMemoryItem => item !== undefined);

    // Sort by confidence and freshness
    items.sort((a, b) => {
      const scoreA = a.confidence + a.accessCount / 10;
      const scoreB = b.confidence + b.accessCount / 10;
      return scoreB - scoreA;
    });

    return items.slice(0, limit);
  }

  /**
   * Validate and refresh stale knowledge
   */
  async validateKnowledge(): Promise<{
    validated: number;
    stale: number;
    lowConfidence: number;
  }> {
    const now = Date.now();
    const validationThreshold =
      this.config.validationInterval * 24 * 60 * 60 * 1000;

    let validated = 0;
    let stale = 0;
    let lowConfidence = 0;

    for (const item of this.items.values()) {
      const age = now - new Date(item.lastValidated).getTime();

      if (age > validationThreshold) {
        stale++;
        // Mark for potential re-validation
        console.log(
          `Stale knowledge detected: ${item.content.slice(0, 50)}...`
        );
      } else {
        validated++;
      }

      if (item.confidence < this.config.confidenceThreshold) {
        lowConfidence++;
      }
    }

    return { validated, stale, lowConfidence };
  }

  /**
   * Get knowledge network statistics and insights
   */
  getKnowledgeInsights(): {
    domains: Record<string, number>;
    categories: Record<string, number>;
    averageConfidence: number;
    conceptNetwork: {
      totalConcepts: number;
      averageConnections: number;
      topConcepts: Array<{ concept: string; connections: number }>;
    };
    qualityMetrics: {
      highConfidence: number;
      wellConnected: number;
      recentlyValidated: number;
    };
  } {
    const allItems = Array.from(this.items.values());

    // Domain distribution
    const domains: Record<string, number> = {};
    const categories: Record<string, number> = {};
    let totalConfidence = 0;

    allItems.forEach((item) => {
      domains[item.domain] = (domains[item.domain] || 0) + 1;
      categories[item.category] = (categories[item.category] || 0) + 1;
      totalConfidence += item.confidence;
    });

    const averageConfidence =
      allItems.length > 0 ? totalConfidence / allItems.length : 0;

    // Concept network analysis
    const conceptConnections: Record<string, number> = {};
    allItems.forEach((item) => {
      const conceptKey = this.extractConceptKey(item.content);
      const connections =
        item.relationships.parentConcepts.length +
        item.relationships.childConcepts.length +
        item.relationships.relatedConcepts.length;
      conceptConnections[conceptKey] = connections;
    });

    const topConcepts = Object.entries(conceptConnections)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([concept, connections]) => ({ concept, connections }));

    const totalConnections = Object.values(conceptConnections).reduce(
      (a, b) => a + b,
      0
    );
    const averageConnections =
      allItems.length > 0 ? totalConnections / allItems.length : 0;

    // Quality metrics
    const highConfidence = allItems.filter(
      (item) => item.confidence > 0.8
    ).length;
    const wellConnected = allItems.filter((item) => {
      const connections =
        item.relationships.parentConcepts.length +
        item.relationships.childConcepts.length +
        item.relationships.relatedConcepts.length;
      return connections >= 3;
    }).length;

    const recentValidationThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    const recentlyValidated = allItems.filter(
      (item) =>
        new Date(item.lastValidated).getTime() > recentValidationThreshold
    ).length;

    return {
      domains,
      categories,
      averageConfidence,
      conceptNetwork: {
        totalConcepts: allItems.length,
        averageConnections,
        topConcepts,
      },
      qualityMetrics: {
        highConfidence,
        wellConnected,
        recentlyValidated,
      },
    };
  }

  /**
   * Get semantic memory statistics
   */
  getStats() {
    const allItems = Array.from(this.items.values());

    const domainCounts = Array.from(this.domainIndex.entries()).reduce(
      (acc, [domain, items]) => {
        acc[domain] = items.size;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalConnections = allItems.reduce((sum, item) => {
      return (
        sum +
        item.relationships.parentConcepts.length +
        item.relationships.childConcepts.length +
        item.relationships.relatedConcepts.length
      );
    }, 0);

    const averageConfidence =
      allItems.length > 0
        ? allItems.reduce((sum, item) => sum + item.confidence, 0) /
          allItems.length
        : 0;

    const staleThreshold =
      Date.now() - this.config.validationInterval * 24 * 60 * 60 * 1000;
    const staleKnowledge = allItems.filter(
      (item) => new Date(item.lastValidated).getTime() < staleThreshold
    ).length;

    return {
      totalKnowledge: allItems.length,
      knowledgeDomains: domainCounts,
      conceptNetwork: {
        nodes: allItems.length,
        connections: totalConnections,
        averageConfidence,
      },
      staleKnowledge,
    };
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return (
      "sm_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    );
  }

  private extractConceptKey(content: string): string {
    // Extract the main concept from content (first few words or key terms)
    return content
      .slice(0, 30)
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  private getItemsByConcept(conceptName: string): SemanticMemoryItem[] {
    const conceptKey = conceptName.toLowerCase();
    const itemIds = this.conceptIndex.get(conceptKey) || new Set();

    return Array.from(itemIds)
      .map((id) => this.items.get(id))
      .filter((item): item is SemanticMemoryItem => item !== undefined);
  }

  private async linkRelatedConcepts(
    newItem: SemanticMemoryItem
  ): Promise<void> {
    const allItems = Array.from(this.items.values()).filter(
      (item) => item.id !== newItem.id
    );

    const relatedConcepts: string[] = [];

    // Find concepts with similar content or in same domain
    allItems.forEach((item) => {
      if (item.domain === newItem.domain) {
        const similarity = this.calculateConceptSimilarity(
          newItem.content,
          item.content
        );
        if (similarity > 0.6) {
          const conceptKey = this.extractConceptKey(item.content);
          relatedConcepts.push(conceptKey);
        }
      }
    });

    // Update relationships
    if (relatedConcepts.length > 0) {
      newItem.relationships.relatedConcepts = [
        ...new Set([
          ...newItem.relationships.relatedConcepts,
          ...relatedConcepts,
        ]),
      ];
      this.items.set(newItem.id, newItem);
    }
  }

  private calculateConceptSimilarity(
    content1: string,
    content2: string
  ): number {
    const words1 = content1.toLowerCase().split(/\s+/);
    const words2 = content2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter(
      (word) => words2.includes(word) && word.length > 3
    );
    return commonWords.length / Math.max(words1.length, words2.length, 1);
  }

  private async validateKnowledgeFreshness(
    item: SemanticMemoryItem
  ): Promise<void> {
    const age = Date.now() - new Date(item.lastValidated).getTime();
    const validationThreshold =
      this.config.validationInterval * 24 * 60 * 60 * 1000;

    if (age > validationThreshold) {
      // Mark as potentially stale but don't auto-delete
      console.log(
        `Knowledge may be stale: ${item.content.slice(0, 50)}... (${Math.floor(
          age / (24 * 60 * 60 * 1000)
        )} days old)`
      );
    }
  }
}
