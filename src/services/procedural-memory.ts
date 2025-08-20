/**
 * Procedural Memory Service - Handles skills, procedures, and behavioral patterns
 * Based on cognitive science: pattern-based, skill-oriented, improvement-focused
 */

import type {
  ProceduralMemoryItem,
  ProceduralMemorySearch,
  MemoryContext,
  MemoryTypeSearchResult,
  MemoryTypesConfig,
} from "../types/memory-types.js";

export interface ProcedureCreationOptions {
  skillName: string;
  steps: Array<{
    action: string;
    conditions: string[];
    expectedOutcome: string;
  }>;
  triggers: string[];
  context: string[];
  effectiveness?: number;
  variations?: string[];
  prerequisites?: string[];
}

export class ProceduralMemoryService {
  private items: Map<string, ProceduralMemoryItem> = new Map();
  private skillIndex: Map<string, Set<string>> = new Map(); // skillName -> itemIds
  private triggerIndex: Map<string, Set<string>> = new Map(); // trigger -> itemIds
  private config: MemoryTypesConfig["proceduralMemory"];

  constructor(config?: Partial<MemoryTypesConfig["proceduralMemory"]>) {
    this.config = {
      effectivenessThreshold: config?.effectivenessThreshold || 0.3,
      usageDecayFactor: config?.usageDecayFactor || 0.95,
      maxVariations: config?.maxVariations || 5,
    };
  }

  /**
   * Store a new procedure or skill
   */
  async storeProcedure(
    content: string,
    context: MemoryContext,
    options: ProcedureCreationOptions
  ): Promise<string> {
    const now = new Date().toISOString();
    const id = this.generateId();

    const item: ProceduralMemoryItem = {
      id,
      type: "procedural",
      content,
      skillName: options.skillName,
      procedure: {
        steps: options.steps,
        triggers: options.triggers,
        context: options.context,
      },
      effectiveness: Math.max(0, Math.min(1, options.effectiveness || 0.5)),
      usageCount: 0,
      lastUsed: now,
      variations: options.variations || [],
      prerequisites: options.prerequisites || [],
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now,
    };

    // Store the procedure
    this.items.set(id, item);

    // Index by skill name
    if (!this.skillIndex.has(options.skillName)) {
      this.skillIndex.set(options.skillName, new Set());
    }
    this.skillIndex.get(options.skillName)!.add(id);

    // Index by triggers
    options.triggers.forEach((trigger) => {
      if (!this.triggerIndex.has(trigger)) {
        this.triggerIndex.set(trigger, new Set());
      }
      this.triggerIndex.get(trigger)!.add(id);
    });

    return id;
  }

  /**
   * Retrieve a specific procedure
   */
  async retrieve(id: string): Promise<ProceduralMemoryItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    // Update access tracking
    item.accessCount++;
    item.lastAccessed = new Date().toISOString();
    this.items.set(id, item);

    return item;
  }

  /**
   * Search procedural memory
   */
  async search(
    query: string,
    searchOptions: ProceduralMemorySearch = {},
    limit: number = 10
  ): Promise<MemoryTypeSearchResult<ProceduralMemoryItem>> {
    const startTime = Date.now();
    let results: ProceduralMemoryItem[] = [];

    // Get all items
    let allItems = Array.from(this.items.values());

    // Apply filters
    if (searchOptions.skillName) {
      allItems = allItems.filter((item) =>
        item.skillName
          .toLowerCase()
          .includes(searchOptions.skillName!.toLowerCase())
      );
    }

    if (searchOptions.triggers && searchOptions.triggers.length > 0) {
      allItems = allItems.filter((item) =>
        searchOptions.triggers!.some((trigger) =>
          item.procedure.triggers.includes(trigger)
        )
      );
    }

    if (searchOptions.effectiveness) {
      allItems = allItems.filter(
        (item) =>
          item.effectiveness >= searchOptions.effectiveness!.min &&
          item.effectiveness <= searchOptions.effectiveness!.max
      );
    }

    if (searchOptions.context && searchOptions.context.length > 0) {
      allItems = allItems.filter((item) =>
        searchOptions.context!.some((ctx) =>
          item.procedure.context.includes(ctx)
        )
      );
    }

    if (searchOptions.recentlyUsed) {
      const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
      allItems = allItems.filter(
        (item) => new Date(item.lastUsed).getTime() > recentThreshold
      );
    }

    // Text search
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      allItems = allItems.filter(
        (item) =>
          item.content.toLowerCase().includes(queryLower) ||
          item.skillName.toLowerCase().includes(queryLower) ||
          item.procedure.steps.some(
            (step) =>
              step.action.toLowerCase().includes(queryLower) ||
              step.expectedOutcome.toLowerCase().includes(queryLower)
          ) ||
          item.variations.some((variation) =>
            variation.toLowerCase().includes(queryLower)
          )
      );
    }

    // Sort by relevance (effectiveness, usage, recency)
    allItems.sort((a, b) => {
      let scoreA = a.effectiveness * 10; // Base effectiveness score
      let scoreB = b.effectiveness * 10;

      // Usage frequency bonus
      scoreA += Math.log(a.usageCount + 1) * 2;
      scoreB += Math.log(b.usageCount + 1) * 2;

      // Recency bonus
      const ageA = Date.now() - new Date(a.lastUsed).getTime();
      const ageB = Date.now() - new Date(b.lastUsed).getTime();

      scoreA -= ageA / (1000 * 60 * 60 * 24 * 7); // Decay by weeks
      scoreB -= ageB / (1000 * 60 * 60 * 24 * 7);

      // Access count bonus
      scoreA += a.accessCount;
      scoreB += b.accessCount;

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
      searchType: "procedural_skills",
      executionTime: Date.now() - startTime,
      context: {
        sessionId: "procedural_search",
        conversationId: "procedural_search",
        timestamp: new Date().toISOString(),
        priorities: ["skill_application", "process_optimization"],
      },
    };
  }

  /**
   * Find procedures by trigger conditions
   */
  async findByTriggers(
    triggers: string[],
    limit: number = 5
  ): Promise<ProceduralMemoryItem[]> {
    const matchingItems: ProceduralMemoryItem[] = [];
    const seen = new Set<string>();

    triggers.forEach((trigger) => {
      const itemIds = this.triggerIndex.get(trigger) || new Set();
      itemIds.forEach((id) => {
        if (!seen.has(id)) {
          const item = this.items.get(id);
          if (
            item &&
            item.effectiveness >= this.config.effectivenessThreshold
          ) {
            matchingItems.push(item);
            seen.add(id);
          }
        }
      });
    });

    // Sort by effectiveness and usage
    matchingItems.sort((a, b) => {
      const scoreA = a.effectiveness + a.usageCount / 100;
      const scoreB = b.effectiveness + b.usageCount / 100;
      return scoreB - scoreA;
    });

    return matchingItems.slice(0, limit);
  }

  /**
   * Use a procedure (increment usage and update effectiveness)
   */
  async useProcedure(
    id: string,
    outcome: "successful" | "failed" | "partial"
  ): Promise<boolean> {
    const item = this.items.get(id);
    if (!item) return false;

    item.usageCount++;
    item.lastUsed = new Date().toISOString();

    // Update effectiveness based on outcome
    const effectivenessChange =
      outcome === "successful" ? 0.05 : outcome === "partial" ? 0.01 : -0.03;

    item.effectiveness = Math.max(
      0,
      Math.min(1, item.effectiveness + effectivenessChange)
    );

    // Apply usage decay to other procedures (keeps frequently used ones fresh)
    this.applyUsageDecay(id);

    item.updatedAt = new Date().toISOString();
    this.items.set(id, item);

    return true;
  }

  /**
   * Add a variation to an existing procedure
   */
  async addVariation(id: string, variation: string): Promise<boolean> {
    const item = this.items.get(id);
    if (!item) return false;

    if (item.variations.length >= this.config.maxVariations) {
      // Remove oldest variation
      item.variations.shift();
    }

    item.variations.push(variation);
    item.updatedAt = new Date().toISOString();
    this.items.set(id, item);

    return true;
  }

  /**
   * Get procedures by skill category
   */
  async getSkillProcedures(skillName: string): Promise<ProceduralMemoryItem[]> {
    const skillItemIds = this.skillIndex.get(skillName) || new Set();
    return Array.from(skillItemIds)
      .map((id) => this.items.get(id))
      .filter((item): item is ProceduralMemoryItem => item !== undefined)
      .sort((a, b) => b.effectiveness - a.effectiveness);
  }

  /**
   * Get skill improvement suggestions
   */
  getSkillInsights(): {
    topSkills: Array<{ skill: string; usage: number; effectiveness: number }>;
    improvementOpportunities: string[];
    underusedSkills: string[];
    effectivePatterns: string[];
  } {
    const allItems = Array.from(this.items.values());

    // Analyze skills by usage and effectiveness
    const skillStats: Record<
      string,
      { usage: number; effectiveness: number; count: number }
    > = {};

    allItems.forEach((item) => {
      if (!skillStats[item.skillName]) {
        skillStats[item.skillName] = { usage: 0, effectiveness: 0, count: 0 };
      }
      skillStats[item.skillName].usage += item.usageCount;
      skillStats[item.skillName].effectiveness += item.effectiveness;
      skillStats[item.skillName].count++;
    });

    // Calculate averages and create insights
    const topSkills = Object.entries(skillStats)
      .map(([skill, stats]) => ({
        skill,
        usage: stats?.usage || 0,
        effectiveness: stats ? stats.effectiveness / stats.count : 0,
      }))
      .sort((a, b) => b.usage * b.effectiveness - a.usage * a.effectiveness)
      .slice(0, 10);

    // Identify improvement opportunities
    const improvementOpportunities: string[] = [];
    const underusedSkills: string[] = [];

    Object.entries(skillStats).forEach(([skill, stats]) => {
      if (!stats) return;

      const avgEffectiveness = stats.effectiveness / stats.count;

      if (avgEffectiveness < 0.5) {
        improvementOpportunities.push(
          `${skill}: Low effectiveness (${(avgEffectiveness * 100).toFixed(
            1
          )}%)`
        );
      }

      if (stats.usage < 2) {
        underusedSkills.push(skill);
      }
    });

    // Find effective patterns
    const effectivePatterns: string[] = [];
    const highEffectiveItems = allItems.filter(
      (item) => item.effectiveness > 0.8
    );

    // Analyze common triggers in effective procedures
    const triggerFreq: Record<string, number> = {};
    highEffectiveItems.forEach((item) => {
      item.procedure.triggers.forEach((trigger) => {
        triggerFreq[trigger] = (triggerFreq[trigger] || 0) + 1;
      });
    });

    const commonTriggers = Object.entries(triggerFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([trigger, count]) => `${trigger} (${count} effective procedures)`);

    effectivePatterns.push(...commonTriggers);

    return {
      topSkills,
      improvementOpportunities,
      underusedSkills,
      effectivePatterns,
    };
  }

  /**
   * Get procedural memory statistics
   */
  getStats() {
    const allItems = Array.from(this.items.values());

    const totalUsage = allItems.reduce((sum, item) => sum + item.usageCount, 0);
    const averageEffectiveness =
      allItems.length > 0
        ? allItems.reduce((sum, item) => sum + item.effectiveness, 0) /
          allItems.length
        : 0;

    // Most used skills
    const skillUsage: Record<string, number> = {};
    allItems.forEach((item) => {
      skillUsage[item.skillName] =
        (skillUsage[item.skillName] || 0) + item.usageCount;
    });

    const mostUsedSkills = Object.entries(skillUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([skill, usage]) => ({ skill, usage }));

    // Improvement opportunities
    const lowEffectivenessCount = allItems.filter(
      (item) => item.effectiveness < this.config.effectivenessThreshold
    ).length;

    const improvementOpportunities = [];
    if (lowEffectivenessCount > 0) {
      improvementOpportunities.push(
        `${lowEffectivenessCount} procedures need improvement`
      );
    }

    const unusedCount = allItems.filter((item) => item.usageCount === 0).length;
    if (unusedCount > 0) {
      improvementOpportunities.push(`${unusedCount} procedures never used`);
    }

    return {
      totalProcedures: allItems.length,
      totalUsage,
      averageEffectiveness,
      mostUsedSkills,
      improvementOpportunities,
      skillCategories: this.skillIndex.size,
      triggerPatterns: this.triggerIndex.size,
    };
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return (
      "pm_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    );
  }

  private applyUsageDecay(excludeId: string): void {
    this.items.forEach((item, id) => {
      if (id !== excludeId && item.usageCount > 0) {
        // Slight decay to usage-based scoring to keep recently used procedures fresh
        const decayedUsage = item.usageCount * this.config.usageDecayFactor;
        if (decayedUsage < 0.1) {
          item.usageCount = 0;
        } else {
          item.usageCount = Math.floor(decayedUsage);
        }
      }
    });
  }
}
