/**
 * Memory Guidance System
 * Provides intelligent guidance for AI on when and how to use memory operations
 * Focuses on maximizing update_memory usage for optimal memory efficiency
 */

export interface MemoryGuidance {
  shouldUseUpdate: boolean;
  recommendedOperation: "store_memory" | "update_memory" | "search_memory";
  updateOperation?: "retrieve" | "update" | "merge" | "consolidate";
  targetMemoryId?: string;
  reasoning: string;
  confidence: number;
  urgency: "low" | "medium" | "high";
  context: {
    duplicateRisk: number;
    consolidationOpportunity: number;
    relevantMemories: number;
  };
}

export interface GuidancePrompts {
  beforeStoring: string[];
  beforeSearching: string[];
  afterFinding: string[];
  optimization: string[];
  maintenance: string[];
}

export class MemoryGuidanceSystem {
  /**
   * Analyze content and provide guidance on memory operations
   */
  static analyzeContentForGuidance(
    content: string,
    context: {
      category?: string;
      tags?: string[];
      recentSearches?: string[];
      currentMemoryCount?: number;
    } = {}
  ): MemoryGuidance {
    // Default response
    let guidance: MemoryGuidance = {
      shouldUseUpdate: false,
      recommendedOperation: "store_memory",
      reasoning: "No similar content detected - store as new memory",
      confidence: 0.6,
      urgency: "low",
      context: {
        duplicateRisk: 0,
        consolidationOpportunity: 0,
        relevantMemories: 0,
      },
    };

    // High-priority indicators for using update_memory
    const updateIndicators = [
      {
        pattern: /update|modify|change|correct|fix|revise/i,
        weight: 0.8,
        reason: "Content suggests modification",
      },
      {
        pattern: /version|v\d+|revision|updated/i,
        weight: 0.7,
        reason: "Versioning detected",
      },
      {
        pattern: /consolidat|merge|combin|group/i,
        weight: 0.9,
        reason: "Consolidation language detected",
      },
      {
        pattern: /duplicate|similar|repeat|again/i,
        weight: 0.8,
        reason: "Duplication concern mentioned",
      },
      {
        pattern: /optimize|cleanup|organize|efficiency/i,
        weight: 0.7,
        reason: "Optimization intent detected",
      },
    ];

    // Context-based indicators
    const contextualIndicators = [
      {
        condition: (context.currentMemoryCount || 0) > 10,
        weight: 0.6,
        reason: "High memory count suggests consolidation",
      },
      {
        condition:
          context.category &&
          ["development", "project", "learning"].includes(context.category),
        weight: 0.5,
        reason: "Category suggests iterative updates",
      },
      {
        condition: (context.tags?.length || 0) > 3,
        weight: 0.4,
        reason: "Many tags suggest related content exists",
      },
      {
        condition: content.length > 500,
        weight: 0.3,
        reason: "Long content may benefit from consolidation",
      },
    ];

    // Analyze patterns
    let maxWeight = 0;
    let bestReason = "";

    for (const indicator of updateIndicators) {
      if (indicator.pattern.test(content)) {
        if (indicator.weight > maxWeight) {
          maxWeight = indicator.weight;
          bestReason = indicator.reason;
        }
      }
    }

    // Analyze context
    for (const indicator of contextualIndicators) {
      if (indicator.condition) {
        maxWeight = Math.max(maxWeight, indicator.weight);
        if (indicator.weight === maxWeight) {
          bestReason = indicator.reason;
        }
      }
    }

    // Update guidance based on analysis
    if (maxWeight > 0.6) {
      guidance = {
        shouldUseUpdate: true,
        recommendedOperation: "update_memory",
        updateOperation: maxWeight > 0.8 ? "consolidate" : "update",
        reasoning: `${bestReason} (confidence: ${(maxWeight * 100).toFixed(
          0
        )}%)`,
        confidence: maxWeight,
        urgency: maxWeight > 0.8 ? "high" : "medium",
        context: {
          duplicateRisk: maxWeight > 0.7 ? 0.8 : 0.3,
          consolidationOpportunity: maxWeight,
          relevantMemories: Math.floor(maxWeight * 5),
        },
      };
    }

    return guidance;
  }

  /**
   * Generate contextual prompts to guide AI memory usage
   */
  static generateGuidancePrompts(): GuidancePrompts {
    return {
      beforeStoring: [
        "🔍 Before storing new information, consider: Does similar content already exist?",
        "💡 Check if this information could enhance an existing memory instead of creating a new one",
        "🔄 If you find related content, use update_memory with 'merge' or 'consolidate' operations",
        "📊 For project or development content, check if this updates existing documentation",
        "🎯 Use update_memory to maintain a clean, consolidated knowledge base",
      ],

      beforeSearching: [
        "🔍 When searching, look for consolidation opportunities",
        "🧹 If you find multiple similar results, consider consolidating them",
        "📝 Use search results to identify memories that could be enhanced or updated",
        "🔄 After finding information, check if it needs updates or corrections",
      ],

      afterFinding: [
        "✨ Found similar content? Use update_memory instead of creating duplicates",
        "🔗 Merge related information using update_memory 'merge' operation",
        "📚 Consolidate multiple related memories into comprehensive summaries",
        "🎯 Update existing memories with new insights or corrections",
        "🧹 Clean up outdated information by updating rather than storing anew",
      ],

      optimization: [
        "🚀 Regularly review and consolidate related memories for better efficiency",
        "📊 Use update_memory 'consolidate' for memories in the same category",
        "🔄 Update stale information rather than creating new versions",
        "💾 Optimize memory usage by merging similar content",
        "🎯 Maintain quality by updating and improving existing memories",
      ],

      maintenance: [
        "🧹 Weekly memory cleanup: consolidate related memories",
        "📝 Update project documentation as it evolves",
        "🔄 Refresh outdated information using update_memory",
        "📊 Monitor for duplicate content and merge when found",
        "✨ Continuously improve memory quality through updates",
      ],
    };
  }

  /**
   * Get specific guidance based on operation type
   */
  static getOperationGuidance(operation: string, context: any = {}): string {
    const guidanceMap: Record<string, string> = {
      store_memory: `
🤔 Before storing new memory:
1. Search for similar content first
2. If found, consider using update_memory instead
3. Check for consolidation opportunities
4. Use meaningful tags and categories for future updates
      `,

      update_memory: `
✨ update_memory best practices:
• Use 'merge' for combining similar content
• Use 'consolidate' for grouping related memories
• Use 'update' for correcting or enhancing content
• Use 'retrieve' only when needed for reference
      `,

      search_memory: `
🔍 After searching:
1. Look for consolidation opportunities
2. Check if found memories need updates
3. Consider merging similar results
4. Update outdated information
      `,
    };

    return (
      guidanceMap[operation] || "Follow memory optimization best practices"
    );
  }

  /**
   * Generate smart prompts based on memory state
   */
  static generateSmartPrompts(memoryStats: {
    totalMemories: number;
    recentStores: number;
    recentUpdates: number;
    categories: string[];
  }): string[] {
    const prompts: string[] = [];

    // High store-to-update ratio
    const updateRatio =
      memoryStats.totalMemories > 0
        ? memoryStats.recentUpdates /
          (memoryStats.recentStores + memoryStats.recentUpdates)
        : 0;

    if (updateRatio < 0.3) {
      prompts.push(
        "🚨 LOW UPDATE RATIO: Consider using update_memory more frequently to optimize memory usage"
      );
    }

    // Many memories
    if (memoryStats.totalMemories > 20) {
      prompts.push(
        "📊 HIGH MEMORY COUNT: Look for consolidation opportunities using update_memory 'consolidate'"
      );
    }

    // Many categories
    if (memoryStats.categories.length > 5) {
      prompts.push(
        "🗂️ MULTIPLE CATEGORIES: Each category might benefit from consolidation"
      );
    }

    // General optimization
    prompts.push(
      "💡 TIP: Always search before storing to find update opportunities"
    );
    prompts.push(
      "🎯 GOAL: Maintain a clean, optimized memory base through smart updates"
    );

    return prompts;
  }

  /**
   * Memory health checker
   */
  static assessMemoryHealth(memories: any[]): {
    healthScore: number; // 0-100
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 100;

    // Check for potential duplicates
    const suspiciousDuplicates = this.findSuspiciousDuplicates(memories);
    if (suspiciousDuplicates > 0) {
      issues.push(`${suspiciousDuplicates} potential duplicate(s) detected`);
      recommendations.push(
        "Use update_memory 'merge' to consolidate duplicates"
      );
      healthScore -= suspiciousDuplicates * 10;
    }

    // Check memory distribution
    const categories = new Set(
      memories.map((m) => m.metadata?.category).filter(Boolean)
    );
    const avgMemoriesPerCategory =
      memories.length / Math.max(categories.size, 1);

    if (avgMemoriesPerCategory > 5) {
      issues.push("Some categories have many memories");
      recommendations.push(
        "Use update_memory 'consolidate' to organize category content"
      );
      healthScore -= 15;
    }

    // Check for stale content
    const staleMemories = memories.filter((m) => {
      const updatedAt = new Date(
        m.metadata?.updatedAt || m.metadata?.createdAt
      );
      const daysSinceUpdate =
        (Date.now() - updatedAt.getTime()) / (24 * 60 * 60 * 1000);
      return daysSinceUpdate > 30;
    });

    if (staleMemories.length > 0) {
      issues.push(`${staleMemories.length} stale memory(ies) (>30 days old)`);
      recommendations.push(
        "Use update_memory 'update' to refresh stale content"
      );
      healthScore -= staleMemories.length * 5;
    }

    return {
      healthScore: Math.max(0, healthScore),
      issues,
      recommendations,
    };
  }

  /**
   * Find suspicious duplicates
   */
  private static findSuspiciousDuplicates(memories: any[]): number {
    let duplicates = 0;
    const seen = new Set<string>();

    for (const memory of memories) {
      const normalized = memory.content
        ?.toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      if (normalized && seen.has(normalized)) {
        duplicates++;
      } else if (normalized) {
        seen.add(normalized);
      }
    }

    return duplicates;
  }

  /**
   * Get dynamic guidance based on AI behavior patterns
   */
  static getDynamicGuidance(behaviorPattern: {
    storeFrequency: number;
    updateFrequency: number;
    searchFrequency: number;
    lastOperations: string[];
  }): string {
    const { storeFrequency, updateFrequency, lastOperations } = behaviorPattern;

    // Detect patterns
    const recentStores = lastOperations.filter(
      (op) => op === "store_memory"
    ).length;
    const recentUpdates = lastOperations.filter(
      (op) => op === "update_memory"
    ).length;

    if (recentStores > recentUpdates * 3) {
      return "🔄 PATTERN ALERT: You're storing more than updating. Consider checking for existing content before storing new memories. Use update_memory to enhance existing memories instead.";
    }

    if (updateFrequency < storeFrequency * 0.3) {
      return "📊 OPTIMIZATION TIP: Your update-to-store ratio is low. Try searching for similar content before storing, and use update_memory operations to maintain cleaner memory organization.";
    }

    return "✅ Good memory usage patterns! Continue using update_memory to maintain optimal memory efficiency.";
  }
}

// Export guidance prompts for easy access
export const MEMORY_OPTIMIZATION_PROMPTS = {
  BEFORE_STORE:
    "🔍 Search first: Does similar content exist that could be updated instead?",
  USE_UPDATE: "🔄 Use update_memory when enhancing existing information",
  CONSOLIDATE: "📊 Consolidate related memories for better organization",
  MERGE_DUPLICATES: "🧹 Merge similar content to reduce redundancy",
  MAINTAIN_QUALITY: "✨ Regular updates maintain high-quality memory base",
};

export default MemoryGuidanceSystem;
