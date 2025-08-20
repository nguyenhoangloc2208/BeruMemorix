/**
 * Memory Optimization Advisor
 * Intelligently suggests when and how AI should use update_memory operations
 * to improve memory efficiency and reduce redundancy
 */

import { MemoryStorage, type MemoryItem } from "./memory-storage.js";

export interface MemoryOptimizationRecommendation {
  type: "update" | "merge" | "consolidate" | "delete";
  priority: "low" | "medium" | "high" | "critical";
  targetMemoryId: string;
  reason: string;
  confidence: number; // 0-1
  potentialSavings: number; // estimated space savings
  suggestedAction: {
    operation: "retrieve" | "update" | "merge" | "consolidate";
    content?: string;
    metadata?: any;
    mergeWith?: string[];
  };
}

export interface MemoryHealthReport {
  totalMemories: number;
  duplicateRisk: number; // 0-1
  consolidationOpportunities: number;
  staleMemories: number;
  recommendedActions: MemoryOptimizationRecommendation[];
  efficiency: {
    storageUtilization: number;
    redundancyLevel: number;
    averageContentLength: number;
  };
}

export interface OptimizationStrategy {
  name: string;
  description: string;
  trigger: (memories: MemoryItem[]) => boolean;
  analyze: (memories: MemoryItem[]) => MemoryOptimizationRecommendation[];
  enabled: boolean;
  priority: number; // 0-1
}

export class MemoryOptimizationAdvisor {
  private memoryStorage: MemoryStorage;
  private strategies: OptimizationStrategy[] = [];
  private optimizationHistory: Array<{
    timestamp: string;
    recommendation: MemoryOptimizationRecommendation;
    applied: boolean;
    result?: any;
  }> = [];

  constructor(memoryStorage: MemoryStorage) {
    this.memoryStorage = memoryStorage;
    this.initializeStrategies();
  }

  /**
   * Analyze memory and provide optimization recommendations
   */
  async analyzeMemoryHealth(): Promise<MemoryHealthReport> {
    const memories = await this.memoryStorage.getAll();
    const totalMemories = memories.length;

    if (totalMemories === 0) {
      return {
        totalMemories: 0,
        duplicateRisk: 0,
        consolidationOpportunities: 0,
        staleMemories: 0,
        recommendedActions: [],
        efficiency: {
          storageUtilization: 0,
          redundancyLevel: 0,
          averageContentLength: 0,
        },
      };
    }

    // Calculate duplicate risk
    const duplicateRisk = await this.calculateDuplicateRisk(memories);

    // Find consolidation opportunities
    const consolidationOpportunities = await this.findConsolidationOpportunities(memories);

    // Find stale memories
    const staleMemories = this.findStaleMemories(memories);

    // Get recommendations from all strategies
    const recommendedActions = await this.getOptimizationRecommendations(memories);

    // Calculate efficiency metrics
    const efficiency = this.calculateEfficiencyMetrics(memories);

    return {
      totalMemories,
      duplicateRisk,
      consolidationOpportunities: consolidationOpportunities.length,
      staleMemories: staleMemories.length,
      recommendedActions,
      efficiency,
    };
  }

  /**
   * Get specific recommendations for when AI should use update_memory
   */
  async getSmartUpdateSuggestions(
    newContent: string,
    category?: string,
    tags?: string[]
  ): Promise<{
    shouldUpdate: boolean;
    targetMemory?: MemoryItem;
    updateType: "merge" | "consolidate" | "update" | "new";
    reason: string;
    confidence: number;
  }> {
    const memories = await this.memoryStorage.getAll();

    // Check for exact duplicates first
    const exactMatch = memories.find(mem => 
      this.calculateSimilarity(mem.content, newContent) > 0.95
    );

    if (exactMatch) {
      return {
        shouldUpdate: true,
        targetMemory: exactMatch,
        updateType: "update",
        reason: "Exact duplicate found - should update existing memory instead of creating new",
        confidence: 0.95,
      };
    }

    // Check for merge candidates
    const mergeCandidate = memories.find(mem => {
      const similarity = this.calculateSimilarity(mem.content, newContent);
      const categoryMatch = !category || mem.metadata.category === category;
      const tagMatch = !tags || tags.some(tag => mem.metadata.tags?.includes(tag));
      
      return similarity > 0.7 && (categoryMatch || tagMatch);
    });

    if (mergeCandidate) {
      return {
        shouldUpdate: true,
        targetMemory: mergeCandidate,
        updateType: "merge",
        reason: "Similar content found - should merge with existing memory for consolidation",
        confidence: 0.8,
      };
    }

    // Check for consolidation opportunities
    const consolidationCandidates = memories.filter(mem => {
      const categoryMatch = category && mem.metadata.category === category;
      const tagMatch = tags && tags.some(tag => mem.metadata.tags?.includes(tag));
      
      return categoryMatch || tagMatch;
    });

    if (consolidationCandidates.length >= 3) {
      return {
        shouldUpdate: true,
        targetMemory: consolidationCandidates[0],
        updateType: "consolidate",
        reason: `Found ${consolidationCandidates.length} related memories - should consolidate for better organization`,
        confidence: 0.6,
      };
    }

    return {
      shouldUpdate: false,
      updateType: "new",
      reason: "No similar content found - create new memory",
      confidence: 0.8,
    };
  }

  /**
   * Generate update prompts for AI to use update_memory more frequently
   */
  generateUpdatePrompts(): string[] {
    return [
      "💡 Before storing new information, consider checking if similar content exists and could be updated instead",
      "🔄 When you find duplicate or similar information, use update_memory with 'merge' operation to consolidate",
      "📊 Use update_memory with 'consolidate' operation when you have multiple related memories in the same category",
      "✨ Update existing memories with new information rather than creating duplicates",
      "🧹 Regularly use update_memory to clean up and optimize memory storage",
      "🎯 When information becomes outdated, update the existing memory instead of creating new ones",
      "📝 Use update_memory to add context or correct information in existing memories",
      "🔍 Before storing, search for existing memories that could be enhanced with new information",
    ];
  }

  /**
   * Auto-suggest memory updates based on recent activity
   */
  async autoSuggestUpdates(): Promise<MemoryOptimizationRecommendation[]> {
    const memories = await this.memoryStorage.getAll();
    const recommendations: MemoryOptimizationRecommendation[] = [];

    // Apply all enabled strategies
    for (const strategy of this.strategies.filter(s => s.enabled)) {
      if (strategy.trigger(memories)) {
        const strategyRecommendations = strategy.analyze(memories);
        recommendations.push(...strategyRecommendations);
      }
    }

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Initialize optimization strategies
   */
  private initializeStrategies(): void {
    this.strategies = [
      {
        name: "duplicate_detection",
        description: "Find and merge duplicate or near-duplicate memories",
        enabled: true,
        priority: 0.9,
        trigger: (memories) => memories.length > 5,
        analyze: (memories) => this.analyzeDuplicates(memories),
      },
      {
        name: "category_consolidation", 
        description: "Consolidate memories within the same category",
        enabled: true,
        priority: 0.7,
        trigger: (memories) => {
          const categories = new Set(memories.map(m => m.metadata.category).filter(Boolean));
          return categories.size > 0;
        },
        analyze: (memories) => this.analyzeCategoryConsolidation(memories),
      },
      {
        name: "stale_cleanup",
        description: "Identify and update stale or outdated memories",
        enabled: true,
        priority: 0.6,
        trigger: (memories) => memories.some(m => this.isStale(m)),
        analyze: (memories) => this.analyzeStaleMemories(memories),
      },
      {
        name: "tag_optimization",
        description: "Optimize and consolidate memories with similar tags",
        enabled: true,
        priority: 0.5,
        trigger: (memories) => {
          const allTags = memories.flatMap(m => m.metadata.tags || []);
          return allTags.length > 10;
        },
        analyze: (memories) => this.analyzeTagOptimization(memories),
      },
    ];
  }

  /**
   * Strategy implementations
   */
  private analyzeDuplicates(memories: MemoryItem[]): MemoryOptimizationRecommendation[] {
    const recommendations: MemoryOptimizationRecommendation[] = [];
    const processed = new Set<string>();

    for (const memory of memories) {
      if (processed.has(memory.id)) continue;

      const duplicates = memories.filter(m => 
        m.id !== memory.id && 
        !processed.has(m.id) &&
        this.calculateSimilarity(memory.content, m.content) > 0.8
      );

      if (duplicates.length > 0) {
        duplicates.forEach(dup => processed.add(dup.id));
        processed.add(memory.id);

        recommendations.push({
          type: "merge",
          priority: "high",
          targetMemoryId: memory.id,
          reason: `Found ${duplicates.length} similar memories that should be merged`,
          confidence: 0.9,
          potentialSavings: duplicates.length * this.estimateMemorySize(memory),
          suggestedAction: {
            operation: "merge",
            mergeWith: duplicates.map(d => d.id),
          },
        });
      }
    }

    return recommendations;
  }

  private analyzeCategoryConsolidation(memories: MemoryItem[]): MemoryOptimizationRecommendation[] {
    const recommendations: MemoryOptimizationRecommendation[] = [];
    const categoryGroups = new Map<string, MemoryItem[]>();

    // Group by category
    memories.forEach(memory => {
      const category = memory.metadata.category;
      if (category) {
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, []);
        }
        categoryGroups.get(category)!.push(memory);
      }
    });

    // Analyze each category
    for (const [category, categoryMemories] of categoryGroups.entries()) {
      if (categoryMemories.length >= 3) {
        // Find the most comprehensive memory to consolidate into
        const targetMemory = categoryMemories.reduce((prev, current) => 
          current.content.length > prev.content.length ? current : prev
        );

        recommendations.push({
          type: "consolidate",
          priority: "medium",
          targetMemoryId: targetMemory.id,
          reason: `Category '${category}' has ${categoryMemories.length} memories that could be consolidated`,
          confidence: 0.7,
          potentialSavings: (categoryMemories.length - 1) * this.estimateMemorySize(targetMemory) * 0.3,
          suggestedAction: {
            operation: "consolidate",
          },
        });
      }
    }

    return recommendations;
  }

  private analyzeStaleMemories(memories: MemoryItem[]): MemoryOptimizationRecommendation[] {
    const recommendations: MemoryOptimizationRecommendation[] = [];
    const staleMemories = memories.filter(m => this.isStale(m));

    staleMemories.forEach(memory => {
      recommendations.push({
        type: "update",
        priority: "low",
        targetMemoryId: memory.id,
        reason: `Memory is potentially stale (${this.getMemoryAge(memory)} days old)`,
        confidence: 0.5,
        potentialSavings: 0,
        suggestedAction: {
          operation: "update",
          content: `[UPDATED] ${memory.content}`,
        },
      });
    });

    return recommendations;
  }

  private analyzeTagOptimization(memories: MemoryItem[]): MemoryOptimizationRecommendation[] {
    const recommendations: MemoryOptimizationRecommendation[] = [];
    const tagGroups = new Map<string, MemoryItem[]>();

    // Group by common tags
    memories.forEach(memory => {
      (memory.metadata.tags || []).forEach(tag => {
        if (!tagGroups.has(tag)) {
          tagGroups.set(tag, []);
        }
        tagGroups.get(tag)!.push(memory);
      });
    });

    // Find tags with many memories
    for (const [tag, tagMemories] of tagGroups.entries()) {
      if (tagMemories.length >= 4) {
        const targetMemory = tagMemories[0];
        
        recommendations.push({
          type: "consolidate",
          priority: "low",
          targetMemoryId: targetMemory.id,
          reason: `Tag '${tag}' appears in ${tagMemories.length} memories - consolidation opportunity`,
          confidence: 0.4,
          potentialSavings: tagMemories.length * 0.1,
          suggestedAction: {
            operation: "consolidate",
          },
        });
      }
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private calculateSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private async calculateDuplicateRisk(memories: MemoryItem[]): Promise<number> {
    let duplicatePairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        totalPairs++;
        const similarity = this.calculateSimilarity(memories[i].content, memories[j].content);
        if (similarity > 0.7) {
          duplicatePairs++;
        }
      }
    }

    return totalPairs > 0 ? duplicatePairs / totalPairs : 0;
  }

  private async findConsolidationOpportunities(memories: MemoryItem[]): Promise<string[]> {
    const categories = new Map<string, number>();
    
    memories.forEach(memory => {
      const category = memory.metadata.category;
      if (category) {
        categories.set(category, (categories.get(category) || 0) + 1);
      }
    });

    return Array.from(categories.entries())
      .filter(([, count]) => count >= 3)
      .map(([category]) => category);
  }

  private findStaleMemories(memories: MemoryItem[]): MemoryItem[] {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    return memories.filter(memory => {
      const createdAt = new Date(memory.metadata.createdAt).getTime();
      const updatedAt = new Date(memory.metadata.updatedAt).getTime();
      
      return Math.max(createdAt, updatedAt) < thirtyDaysAgo;
    });
  }

  private calculateEfficiencyMetrics(memories: MemoryItem[]): {
    storageUtilization: number;
    redundancyLevel: number;
    averageContentLength: number;
  } {
    const totalSize = memories.reduce((sum, m) => sum + this.estimateMemorySize(m), 0);
    const averageContentLength = memories.length > 0 
      ? memories.reduce((sum, m) => sum + m.content.length, 0) / memories.length 
      : 0;

    // Simple redundancy estimation
    const uniqueWords = new Set();
    const totalWords = memories.reduce((sum, m) => {
      const words = m.content.toLowerCase().split(/\s+/);
      words.forEach(word => uniqueWords.add(word));
      return sum + words.length;
    }, 0);

    const redundancyLevel = totalWords > 0 ? 1 - (uniqueWords.size / totalWords) : 0;

    return {
      storageUtilization: totalSize > 0 ? 0.8 : 0, // Placeholder
      redundancyLevel,
      averageContentLength,
    };
  }

  private async getOptimizationRecommendations(memories: MemoryItem[]): Promise<MemoryOptimizationRecommendation[]> {
    const recommendations: MemoryOptimizationRecommendation[] = [];
    
    // Apply all strategies
    for (const strategy of this.strategies.filter(s => s.enabled)) {
      if (strategy.trigger(memories)) {
        const strategyRecommendations = strategy.analyze(memories);
        recommendations.push(...strategyRecommendations);
      }
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  private isStale(memory: MemoryItem): boolean {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(memory.metadata.updatedAt).getTime();
    return updatedAt < thirtyDaysAgo;
  }

  private getMemoryAge(memory: MemoryItem): number {
    const now = Date.now();
    const createdAt = new Date(memory.metadata.createdAt).getTime();
    return Math.floor((now - createdAt) / (24 * 60 * 60 * 1000));
  }

  private estimateMemorySize(memory: MemoryItem): number {
    return JSON.stringify(memory).length;
  }

  /**
   * Record when a recommendation is applied
   */
  recordOptimizationApplied(recommendationId: string, result: any): void {
    const timestamp = new Date().toISOString();
    
    console.log(`Memory optimization applied: ${recommendationId} at ${timestamp}`);
    
    // In a full implementation, this would track the effectiveness of recommendations
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalRecommendations: number;
    appliedRecommendations: number;
    totalSavings: number;
    topStrategies: Array<{ name: string; effectiveness: number }>;
  } {
    const totalRecommendations = this.optimizationHistory.length;
    const appliedRecommendations = this.optimizationHistory.filter(h => h.applied).length;
    
    return {
      totalRecommendations,
      appliedRecommendations,
      totalSavings: 0, // Placeholder
      topStrategies: this.strategies.map(s => ({
        name: s.name,
        effectiveness: s.priority,
      })),
    };
  }
}

// Export singleton instance
export const memoryOptimizationAdvisor = new MemoryOptimizationAdvisor(
  (await import("./memory-storage.js")).memoryStorage
);
