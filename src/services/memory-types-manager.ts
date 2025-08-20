/**
 * Memory Types Manager - Orchestrates all 4 memory types
 * Provides unified interface and cross-type operations
 */

import { WorkingMemoryService } from "./working-memory.js";
import { EpisodicMemoryService } from "./episodic-memory.js";
import { SemanticMemoryService } from "./semantic-memory.js";
import { ProceduralMemoryService } from "./procedural-memory.js";
import type {
  MemoryTypeItem,
  MemoryContext,
  MemoryTypesConfig,
  MemoryTypeAnalytics,
  WorkingMemoryItem,
  EpisodicMemoryItem,
  SemanticMemoryItem,
  ProceduralMemoryItem,
} from "../types/memory-types.js";

export interface UnifiedSearchOptions {
  types?: Array<"working" | "episodic" | "semantic" | "procedural">;
  limit?: number;
  priorityWeights?: {
    working: number;
    episodic: number;
    semantic: number;
    procedural: number;
  };
  timeFrame?: "recent" | "all" | "session";
  context?: string[];
}

export interface UnifiedSearchResult {
  working: WorkingMemoryItem[];
  episodic: EpisodicMemoryItem[];
  semantic: SemanticMemoryItem[];
  procedural: ProceduralMemoryItem[];
  totalResults: number;
  executionTime: number;
  relevanceScores: Record<string, number>;
}

export class MemoryTypesManager {
  private workingMemory: WorkingMemoryService;
  private episodicMemory: EpisodicMemoryService;
  private semanticMemory: SemanticMemoryService;
  private proceduralMemory: ProceduralMemoryService;
  private config: MemoryTypesConfig;

  constructor(config?: Partial<MemoryTypesConfig>) {
    this.config = {
      workingMemory: {
        maxItems: 50,
        sessionTTL: 60,
        priorities: {
          highPriorityTTL: 120,
          lowPriorityTTL: 30,
        },
        ...config?.workingMemory,
      },
      episodicMemory: {
        maxEpisodes: 1000,
        consolidationThreshold: 5,
        emotionalWeighting: true,
        ...config?.episodicMemory,
      },
      semanticMemory: {
        confidenceThreshold: 0.3,
        relationshipDepth: 3,
        validationInterval: 30,
        ...config?.semanticMemory,
      },
      proceduralMemory: {
        effectivenessThreshold: 0.3,
        usageDecayFactor: 0.95,
        maxVariations: 5,
        ...config?.proceduralMemory,
      },
    };

    // Initialize all memory services
    this.workingMemory = new WorkingMemoryService(this.config.workingMemory);
    this.episodicMemory = new EpisodicMemoryService(this.config.episodicMemory);
    this.semanticMemory = new SemanticMemoryService(this.config.semanticMemory);
    this.proceduralMemory = new ProceduralMemoryService(
      this.config.proceduralMemory
    );
  }

  /**
   * Unified search across all memory types
   */
  async unifiedSearch(
    query: string,
    context: MemoryContext,
    options: UnifiedSearchOptions = {}
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const types = options.types || [
      "working",
      "episodic",
      "semantic",
      "procedural",
    ];
    const limit = Math.floor((options.limit || 20) / types.length);

    const weights = options.priorityWeights || {
      working: 0.3,
      episodic: 0.25,
      semantic: 0.25,
      procedural: 0.2,
    };

    const results: UnifiedSearchResult = {
      working: [],
      episodic: [],
      semantic: [],
      procedural: [],
      totalResults: 0,
      executionTime: 0,
      relevanceScores: {},
    };

    // Search each memory type in parallel
    const searchPromises: Promise<void>[] = [];

    if (types.includes("working")) {
      searchPromises.push(
        this.workingMemory
          .search(
            query,
            {
              sessionId: context.sessionId,
              conversationId: context.conversationId,
            },
            limit
          )
          .then((result) => {
            results.working = result.items;
            results.relevanceScores.working =
              result.items.length * weights.working;
          })
      );
    }

    if (types.includes("episodic")) {
      searchPromises.push(
        this.episodicMemory.search(query, {}, limit).then((result) => {
          results.episodic = result.items;
          results.relevanceScores.episodic =
            result.items.length * weights.episodic;
        })
      );
    }

    if (types.includes("semantic")) {
      searchPromises.push(
        this.semanticMemory.search(query, {}, limit).then((result) => {
          results.semantic = result.items;
          results.relevanceScores.semantic =
            result.items.length * weights.semantic;
        })
      );
    }

    if (types.includes("procedural")) {
      searchPromises.push(
        this.proceduralMemory.search(query, {}, limit).then((result) => {
          results.procedural = result.items;
          results.relevanceScores.procedural =
            result.items.length * weights.procedural;
        })
      );
    }

    // Wait for all searches to complete
    await Promise.all(searchPromises);

    results.totalResults =
      results.working.length +
      results.episodic.length +
      results.semantic.length +
      results.procedural.length;
    results.executionTime = Date.now() - startTime;

    return results;
  }

  /**
   * Store memory based on context and type
   */
  async storeContextualMemory(
    content: string,
    context: MemoryContext,
    options: {
      type?: "auto" | "working" | "episodic" | "semantic" | "procedural";
      metadata?: Record<string, any>;
    } = {}
  ): Promise<{ type: string; id: string }> {
    const memoryType =
      options.type || this.determineMemoryType(content, context);

    switch (memoryType) {
      case "working":
        const workingId = await this.workingMemory.store(content, context, {
          priority: this.determinePriority(content, context),
          contextType: this.determineContextType(content, context),
        });
        return { type: "working", id: workingId };

      case "episodic":
        // For episodic memory, we need more context about the episode
        const episodeOptions = this.createEpisodeOptions(
          content,
          context,
          options.metadata
        );
        const episodicId = await this.episodicMemory.recordEpisode(
          content,
          context,
          episodeOptions
        );
        return { type: "episodic", id: episodicId };

      case "semantic":
        const knowledgeOptions = this.createKnowledgeOptions(
          content,
          context,
          options.metadata
        );
        const semanticId = await this.semanticMemory.storeKnowledge(
          content,
          context,
          knowledgeOptions
        );
        return { type: "semantic", id: semanticId };

      case "procedural":
        const procedureOptions = this.createProcedureOptions(
          content,
          context,
          options.metadata
        );
        const proceduralId = await this.proceduralMemory.storeProcedure(
          content,
          context,
          procedureOptions
        );
        return { type: "procedural", id: proceduralId };

      default:
        // Default to working memory for immediate context
        const defaultId = await this.workingMemory.store(content, context);
        return { type: "working", id: defaultId };
    }
  }

  /**
   * Get current session context from all memory types
   */
  async getSessionContext(sessionId: string): Promise<{
    working: WorkingMemoryItem[];
    recentEpisodes: EpisodicMemoryItem[];
    relevantKnowledge: SemanticMemoryItem[];
    applicableProcedures: ProceduralMemoryItem[];
  }> {
    const [working, episodes, knowledge, procedures] = await Promise.all([
      this.workingMemory.getSessionContext(sessionId, 5),
      this.episodicMemory.search(
        "",
        {
          timeRange: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        },
        3
      ),
      this.semanticMemory.search("", {}, 3),
      this.proceduralMemory.search("", { recentlyUsed: true }, 3),
    ]);

    return {
      working,
      recentEpisodes: episodes.items,
      relevantKnowledge: knowledge.items,
      applicableProcedures: procedures.items,
    };
  }

  /**
   * Learn from interaction (creates episodic memory and may update others)
   */
  async learnFromInteraction(
    userAction: string,
    systemResponse: string,
    outcome: "successful" | "failed" | "partial" | "abandoned",
    context: MemoryContext,
    userFeedback?: "positive" | "negative" | "neutral"
  ): Promise<string> {
    // Record the episode
    const episodeId = await this.episodicMemory.recordEpisode(
      `Interaction: ${userAction} -> ${systemResponse}`,
      context,
      {
        userAction,
        systemResponse,
        outcome,
        userFeedback,
        autoGenerateTakeaways: true,
        emotions: this.inferEmotion(outcome, userFeedback),
      }
    );

    // If successful, consider updating procedural memory
    if (outcome === "successful") {
      await this.updateProceduralFromSuccess(
        userAction,
        systemResponse,
        context
      );
    }

    return episodeId;
  }

  /**
   * Get comprehensive analytics across all memory types
   */
  getComprehensiveAnalytics(): MemoryTypeAnalytics {
    const workingStats = this.workingMemory.getStats();
    const episodicStats = this.episodicMemory.getStats();
    const semanticStats = this.semanticMemory.getStats();
    const proceduralStats = this.proceduralMemory.getStats();

    return {
      workingMemory: {
        currentLoad: workingStats.currentLoad,
        averageSessionLength: workingStats.averageSessionLength,
        priorityDistribution: workingStats.priorityDistribution,
        contextTypeUsage: workingStats.contextTypeUsage,
      },
      episodicMemory: {
        totalEpisodes: episodicStats.totalEpisodes,
        outcomeDistribution: episodicStats.outcomeDistribution,
        emotionalPatterns: episodicStats.emotionalPatterns,
        learningRate: episodicStats.learningRate,
      },
      semanticMemory: {
        knowledgeDomains: semanticStats.knowledgeDomains,
        conceptNetwork: semanticStats.conceptNetwork,
        staleKnowledge: semanticStats.staleKnowledge,
      },
      proceduralMemory: {
        totalProcedures: proceduralStats.totalProcedures,
        averageEffectiveness: proceduralStats.averageEffectiveness,
        mostUsedSkills: proceduralStats.mostUsedSkills,
        improvementOpportunities: proceduralStats.improvementOpportunities,
      },
    };
  }

  /**
   * Optimize memory system (cleanup, consolidation)
   */
  async optimizeMemorySystem(): Promise<{
    cleaned: number;
    consolidated: number;
    optimizations: string[];
  }> {
    const optimizations: string[] = [];
    let cleaned = 0;
    let consolidated = 0;

    // Get analytics for optimization decisions
    const analytics = this.getComprehensiveAnalytics();

    // Working memory optimization
    if (analytics.workingMemory.currentLoad > 0.8) {
      optimizations.push(
        "Working memory approaching capacity - consider increasing limits"
      );
    }

    // Episodic memory consolidation opportunities
    const episodicInsights = this.episodicMemory.getLearningInsights();
    if (episodicInsights.improvementOpportunities.length > 0) {
      consolidated += episodicInsights.improvementOpportunities.length;
      optimizations.push(
        `Found ${consolidated} consolidation opportunities in episodic memory`
      );
    }

    // Semantic memory validation
    const semanticValidation = await this.semanticMemory.validateKnowledge();
    if (semanticValidation.stale > 0) {
      optimizations.push(
        `${semanticValidation.stale} semantic memories need validation`
      );
    }

    // Procedural memory insights
    const proceduralInsights = this.proceduralMemory.getSkillInsights();
    if (proceduralInsights.underusedSkills.length > 0) {
      cleaned += proceduralInsights.underusedSkills.length;
      optimizations.push(
        `${proceduralInsights.underusedSkills.length} underused procedures identified`
      );
    }

    return { cleaned, consolidated, optimizations };
  }

  /**
   * Private helper methods
   */
  private determineMemoryType(
    content: string,
    context: MemoryContext
  ): "working" | "episodic" | "semantic" | "procedural" {
    // Simple heuristics to determine memory type
    if (
      content.includes("how to") ||
      content.includes("procedure") ||
      content.includes("step")
    ) {
      return "procedural";
    }

    if (
      content.includes("fact") ||
      content.includes("definition") ||
      content.includes("concept")
    ) {
      return "semantic";
    }

    if (
      content.includes("experience") ||
      content.includes("outcome") ||
      content.includes("learned")
    ) {
      return "episodic";
    }

    return "working"; // Default to working memory
  }

  private determinePriority(
    content: string,
    context: MemoryContext
  ): 1 | 2 | 3 | 4 | 5 {
    // Determine priority based on content and context
    if (
      context.priorities?.includes("urgent") ||
      content.includes("important")
    ) {
      return 1;
    }

    if (context.priorities?.includes("high") || content.includes("critical")) {
      return 2;
    }

    return 3; // Default priority
  }

  private determineContextType(
    content: string,
    context: MemoryContext
  ): WorkingMemoryItem["contextType"] {
    if (context.currentTask) {
      return "task_context";
    }

    if (content.startsWith("User:") || content.includes("query")) {
      return "user_query";
    }

    if (content.startsWith("System:") || content.includes("response")) {
      return "system_response";
    }

    return "temporary_note";
  }

  private createEpisodeOptions(
    content: string,
    context: MemoryContext,
    metadata?: Record<string, any>
  ): any {
    return {
      userAction: metadata?.userAction || "User interaction",
      systemResponse: metadata?.systemResponse || content,
      outcome: metadata?.outcome || "partial",
      userFeedback: metadata?.userFeedback,
      autoGenerateTakeaways: true,
    };
  }

  private createKnowledgeOptions(
    content: string,
    context: MemoryContext,
    metadata?: Record<string, any>
  ): any {
    return {
      category: metadata?.category || "fact",
      domain: metadata?.domain || "general",
      confidence: metadata?.confidence || 0.8,
      sources: metadata?.sources || [],
    };
  }

  private createProcedureOptions(
    content: string,
    context: MemoryContext,
    metadata?: Record<string, any>
  ): any {
    return {
      skillName: metadata?.skillName || "General Procedure",
      steps: metadata?.steps || [
        {
          action: content,
          conditions: [],
          expectedOutcome: "Task completion",
        },
      ],
      triggers: metadata?.triggers || ["task_request"],
      context: metadata?.context || ["general"],
    };
  }

  private inferEmotion(
    outcome: string,
    feedback?: string
  ): EpisodicMemoryItem["emotions"] {
    if (outcome === "successful" && feedback === "positive") {
      return "satisfaction";
    }

    if (outcome === "failed" && feedback === "negative") {
      return "frustration";
    }

    if (outcome === "successful" && !feedback) {
      return "discovery";
    }

    return "confusion";
  }

  private async updateProceduralFromSuccess(
    userAction: string,
    systemResponse: string,
    context: MemoryContext
  ): Promise<void> {
    // Find if there's an existing procedure for this type of action
    const existingProcedures = await this.proceduralMemory.search(
      userAction,
      {},
      1
    );

    if (existingProcedures.items.length > 0) {
      // Update effectiveness of existing procedure
      await this.proceduralMemory.useProcedure(
        existingProcedures.items[0].id,
        "successful"
      );
    } else {
      // Create new procedure based on successful interaction
      await this.proceduralMemory.storeProcedure(
        `Successful procedure for: ${userAction}`,
        context,
        {
          skillName: "Interaction Handling",
          steps: [
            {
              action: systemResponse,
              conditions: [userAction],
              expectedOutcome: "User satisfaction",
            },
          ],
          triggers: [userAction.slice(0, 20)],
          context: ["user_interaction"],
          effectiveness: 0.8,
        }
      );
    }
  }

  // Expose individual memory services for direct access
  get working() {
    return this.workingMemory;
  }
  get episodic() {
    return this.episodicMemory;
  }
  get semantic() {
    return this.semanticMemory;
  }
  get procedural() {
    return this.proceduralMemory;
  }
}
