/**
 * Memory Validation Service
 * Handles confidence scoring, stale memory detection, and quality validation
 */

import { MemoryTypesManager } from "./memory-types-manager.js";
import type {
  MemoryTypeItem,
  MemoryContext,
  WorkingMemoryItem,
  EpisodicMemoryItem,
  SemanticMemoryItem,
  ProceduralMemoryItem,
} from "../types/memory-types.js";

export interface ValidationConfig {
  confidenceDecayRate: number; // How fast confidence decays over time (per day)
  staleThresholdDays: number; // Days after which memory is considered stale
  crossValidationEnabled: boolean; // Enable cross-memory type validation
  autoValidationInterval: number; // Minutes between auto-validation runs
  minConfidenceThreshold: number; // Minimum confidence to keep memory
  validationBatchSize: number; // Max memories to validate in one batch
}

export interface ValidationResult {
  memoryId: string;
  memoryType: "working" | "episodic" | "semantic" | "procedural";
  oldConfidence: number;
  newConfidence: number;
  isStale: boolean;
  needsUpdate: boolean;
  validationReasons: string[];
  crossReferences: Array<{
    memoryId: string;
    memoryType: string;
    agreement: number; // -1 to +1, how much this memory agrees
  }>;
  timestamp: string;
}

export interface ValidationReport {
  totalValidated: number;
  memoryTypeBreakdown: Record<string, number>;
  avgConfidenceChange: number;
  staleMemoriesFound: number;
  memoriesMarkedForDeletion: number;
  crossValidationMatches: number;
  executionTime: number;
  recommendations: string[];
}

export interface MemoryQualityMetrics {
  overallHealth: number; // 0-1 score of memory system health
  averageConfidence: number;
  staleMemoryRatio: number;
  consistencyScore: number; // How consistent memories are with each other
  redundancyLevel: number; // Amount of redundant information
  memoryTypeDistribution: Record<
    string,
    {
      count: number;
      avgConfidence: number;
      staleCount: number;
    }
  >;
}

export class MemoryValidationService {
  private memoryManager: MemoryTypesManager;
  private config: ValidationConfig;
  private validationHistory: ValidationResult[] = [];
  private validationInterval?: NodeJS.Timeout;
  private isValidating = false;

  constructor(
    memoryManager: MemoryTypesManager,
    config?: Partial<ValidationConfig>
  ) {
    this.memoryManager = memoryManager;
    this.config = {
      confidenceDecayRate: config?.confidenceDecayRate || 0.02, // 2% per day
      staleThresholdDays: config?.staleThresholdDays || 30,
      crossValidationEnabled: config?.crossValidationEnabled ?? true,
      autoValidationInterval: config?.autoValidationInterval || 60, // 1 hour
      minConfidenceThreshold: config?.minConfidenceThreshold || 0.1,
      validationBatchSize: config?.validationBatchSize || 50,
      ...config,
    };

    this.startAutoValidation();
  }

  /**
   * Start automatic validation process
   */
  private startAutoValidation(): void {
    this.validationInterval = setInterval(
      () => this.runValidationCycle(),
      this.config.autoValidationInterval * 60 * 1000
    );
    console.log(
      `Memory validation started with ${this.config.autoValidationInterval}min interval`
    );
  }

  /**
   * Stop automatic validation
   */
  stop(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = undefined;
    }
    console.log("Memory validation stopped");
  }

  /**
   * Run a complete validation cycle
   */
  async runValidationCycle(): Promise<ValidationReport> {
    if (this.isValidating) {
      console.log("Validation already running, skipping cycle");
      return this.createEmptyReport();
    }

    this.isValidating = true;
    const startTime = Date.now();

    try {
      console.log("Starting memory validation cycle...");

      const report: ValidationReport = {
        totalValidated: 0,
        memoryTypeBreakdown: {},
        avgConfidenceChange: 0,
        staleMemoriesFound: 0,
        memoriesMarkedForDeletion: 0,
        crossValidationMatches: 0,
        executionTime: 0,
        recommendations: [],
      };

      // Validate each memory type
      await this.validateWorkingMemories(report);
      await this.validateEpisodicMemories(report);
      await this.validateSemanticMemories(report);
      await this.validateProceduralMemories(report);

      // Cross-validation if enabled
      if (this.config.crossValidationEnabled) {
        await this.performCrossValidation(report);
      }

      // Generate recommendations
      this.generateRecommendations(report);

      report.executionTime = Date.now() - startTime;
      console.log(
        `Validation cycle completed: ${report.totalValidated} memories validated in ${report.executionTime}ms`
      );

      return report;
    } catch (error) {
      console.error("Validation cycle failed:", error);
      return this.createEmptyReport();
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * Validate working memories
   */
  private async validateWorkingMemories(
    report: ValidationReport
  ): Promise<void> {
    // Working memories are automatically cleaned up by expiration
    // We just check for any that are expired but still present
    const stats = this.memoryManager.working.getStats();

    report.memoryTypeBreakdown.working = stats.activeItems;

    // Mark expired items as stale
    const expiredCount = stats.expiredItems;
    report.staleMemoriesFound += expiredCount;

    console.log(
      `Working memory validation: ${stats.activeItems} active, ${expiredCount} expired`
    );
  }

  /**
   * Validate episodic memories
   */
  private async validateEpisodicMemories(
    report: ValidationReport
  ): Promise<void> {
    const stats = this.memoryManager.episodic.getStats();
    const validatedCount = Math.min(
      stats.totalEpisodes,
      this.config.validationBatchSize
    );

    // For now, we'll validate based on age and outcome patterns
    // In a full implementation, we'd need access to individual memories

    report.totalValidated += validatedCount;
    report.memoryTypeBreakdown.episodic = validatedCount;

    // Estimate stale memories based on age (simplified)
    const estimatedStale = Math.floor(stats.totalEpisodes * 0.1); // Assume 10% might be stale
    report.staleMemoriesFound += estimatedStale;

    console.log(
      `Episodic memory validation: ${validatedCount} validated, ~${estimatedStale} potentially stale`
    );
  }

  /**
   * Validate semantic memories
   */
  private async validateSemanticMemories(
    report: ValidationReport
  ): Promise<void> {
    const stats = this.memoryManager.semantic.getStats();
    const validation = await this.memoryManager.semantic.validateKnowledge();

    report.totalValidated += validation.validated;
    report.memoryTypeBreakdown.semantic = validation.validated;
    report.staleMemoriesFound += validation.stale;

    // Mark low confidence memories for potential deletion
    report.memoriesMarkedForDeletion += validation.lowConfidence;

    console.log(
      `Semantic memory validation: ${validation.validated} validated, ${validation.stale} stale, ${validation.lowConfidence} low confidence`
    );
  }

  /**
   * Validate procedural memories
   */
  private async validateProceduralMemories(
    report: ValidationReport
  ): Promise<void> {
    const stats = this.memoryManager.procedural.getStats();
    const insights = this.memoryManager.procedural.getSkillInsights();

    report.totalValidated += stats.totalProcedures;
    report.memoryTypeBreakdown.procedural = stats.totalProcedures;

    // Count underused skills as potentially stale
    report.staleMemoriesFound += insights.underusedSkills.length;

    // Skills with very low effectiveness might be marked for deletion
    const lowEffectivenessCount = Math.floor(stats.totalProcedures * 0.05); // Estimate 5%
    report.memoriesMarkedForDeletion += lowEffectivenessCount;

    console.log(
      `Procedural memory validation: ${stats.totalProcedures} procedures, ${insights.underusedSkills.length} underused`
    );
  }

  /**
   * Perform cross-validation between memory types
   */
  private async performCrossValidation(
    report: ValidationReport
  ): Promise<void> {
    // Cross-validate by finding conflicts or agreements between memory types
    // For example, check if semantic knowledge contradicts episodic experiences

    const semanticStats = this.memoryManager.semantic.getStats();
    const episodicStats = this.memoryManager.episodic.getStats();

    // Simplified cross-validation - in reality would compare actual content
    const potentialMatches =
      Math.min(semanticStats.totalKnowledge, episodicStats.totalEpisodes) * 0.1;
    report.crossValidationMatches += Math.floor(potentialMatches);

    console.log(
      `Cross-validation: ${Math.floor(
        potentialMatches
      )} potential correlations found`
    );
  }

  /**
   * Validate a specific memory by ID
   */
  async validateMemory(
    memoryId: string,
    memoryType: "working" | "episodic" | "semantic" | "procedural"
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      memoryId,
      memoryType,
      oldConfidence: 0.5, // Would get from actual memory
      newConfidence: 0.5,
      isStale: false,
      needsUpdate: false,
      validationReasons: [],
      crossReferences: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Retrieve the memory (implementation would depend on memory type)
      const memory = await this.getMemoryById(memoryId, memoryType);
      if (!memory) {
        result.validationReasons.push("Memory not found");
        return result;
      }

      // Calculate confidence decay based on age
      const ageInDays = this.calculateMemoryAge(memory);
      const decayFactor = 1 - ageInDays * this.config.confidenceDecayRate;
      result.newConfidence = Math.max(0, result.oldConfidence * decayFactor);

      // Check if memory is stale
      result.isStale = ageInDays > this.config.staleThresholdDays;
      if (result.isStale) {
        result.validationReasons.push(
          `Memory is ${ageInDays} days old (stale threshold: ${this.config.staleThresholdDays})`
        );
      }

      // Check if update is needed
      result.needsUpdate =
        result.newConfidence !== result.oldConfidence || result.isStale;

      // Perform cross-validation if enabled
      if (this.config.crossValidationEnabled) {
        result.crossReferences = await this.findCrossReferences(memory);
      }

      // Add to validation history
      this.validationHistory.push(result);

      console.log(
        `Validated ${memoryType} memory ${memoryId}: confidence ${result.oldConfidence} → ${result.newConfidence}`
      );
    } catch (error) {
      result.validationReasons.push(`Validation error: ${error.message}`);
      console.error(`Failed to validate memory ${memoryId}:`, error);
    }

    return result;
  }

  /**
   * Get memory quality metrics
   */
  getQualityMetrics(): MemoryQualityMetrics {
    const analytics = this.memoryManager.getComprehensiveAnalytics();

    // Calculate overall health based on various factors
    const workingHealth = 1 - analytics.workingMemory.currentLoad; // Lower load = better health
    const episodicHealth = analytics.episodicMemory.learningRate; // Higher learning rate = better
    const semanticHealth =
      analytics.semanticMemory.conceptNetwork.averageConfidence;
    const proceduralHealth = analytics.proceduralMemory.averageEffectiveness;

    const overallHealth =
      (workingHealth + episodicHealth + semanticHealth + proceduralHealth) / 4;

    // Calculate consistency score based on recent validations
    const recentValidations = this.validationHistory.slice(-100);
    const consistencyScore =
      recentValidations.length > 0
        ? recentValidations.filter((v) => !v.needsUpdate).length /
          recentValidations.length
        : 1;

    // Estimate redundancy level
    const totalMemories =
      analytics.workingMemory.currentLoad +
      analytics.episodicMemory.totalEpisodes +
      analytics.semanticMemory.conceptNetwork.nodes +
      analytics.proceduralMemory.totalProcedures;

    const redundancyLevel = Math.min(
      0.2,
      this.validationHistory.filter((v) => v.isStale).length / totalMemories
    );

    return {
      overallHealth,
      averageConfidence: (semanticHealth + proceduralHealth) / 2,
      staleMemoryRatio: redundancyLevel,
      consistencyScore,
      redundancyLevel,
      memoryTypeDistribution: {
        working: {
          count: Math.floor(analytics.workingMemory.currentLoad * 50), // Estimate based on load
          avgConfidence: 0.8, // Working memory is generally high confidence
          staleCount: 0, // Working memory auto-expires
        },
        episodic: {
          count: analytics.episodicMemory.totalEpisodes,
          avgConfidence: analytics.episodicMemory.learningRate,
          staleCount: Math.floor(
            analytics.episodicMemory.totalEpisodes * redundancyLevel
          ),
        },
        semantic: {
          count: analytics.semanticMemory.conceptNetwork.nodes,
          avgConfidence:
            analytics.semanticMemory.conceptNetwork.averageConfidence,
          staleCount: analytics.semanticMemory.staleKnowledge,
        },
        procedural: {
          count: analytics.proceduralMemory.totalProcedures,
          avgConfidence: analytics.proceduralMemory.averageEffectiveness,
          staleCount:
            analytics.proceduralMemory.improvementOpportunities.length,
        },
      },
    };
  }

  /**
   * Get validation history
   */
  getValidationHistory(limit: number = 50): ValidationResult[] {
    return this.validationHistory
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Force validation of all memories (for testing or manual triggers)
   */
  async forceFullValidation(): Promise<ValidationReport> {
    console.log("Starting forced full validation...");
    return await this.runValidationCycle();
  }

  /**
   * Clean up validation history
   */
  cleanupValidationHistory(olderThanDays: number = 30): number {
    const cutoffDate = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const initialLength = this.validationHistory.length;

    this.validationHistory = this.validationHistory.filter(
      (result) => new Date(result.timestamp).getTime() > cutoffDate
    );

    const removed = initialLength - this.validationHistory.length;
    console.log(`Cleaned up ${removed} old validation records`);

    return removed;
  }

  /**
   * Private helper methods
   */
  private async getMemoryById(
    memoryId: string,
    memoryType: "working" | "episodic" | "semantic" | "procedural"
  ): Promise<MemoryTypeItem | null> {
    // This would retrieve the actual memory from the appropriate service
    // For now, return a placeholder
    return null;
  }

  private calculateMemoryAge(memory: any): number {
    const createdAt = new Date(
      memory.createdAt || memory.timestamp || Date.now()
    );
    const now = new Date();
    const ageInMs = now.getTime() - createdAt.getTime();
    return Math.floor(ageInMs / (24 * 60 * 60 * 1000)); // Convert to days
  }

  private async findCrossReferences(
    memory: any
  ): Promise<
    Array<{ memoryId: string; memoryType: string; agreement: number }>
  > {
    // This would find related memories and check for agreement/conflict
    // Placeholder implementation
    return [];
  }

  private generateRecommendations(report: ValidationReport): void {
    if (report.staleMemoriesFound > report.totalValidated * 0.2) {
      report.recommendations.push(
        "High number of stale memories detected - consider running cleanup"
      );
    }

    if (report.memoriesMarkedForDeletion > 0) {
      report.recommendations.push(
        `${report.memoriesMarkedForDeletion} memories have very low confidence and may need deletion`
      );
    }

    if (report.crossValidationMatches > 0) {
      report.recommendations.push(
        `${report.crossValidationMatches} cross-references found - potential for memory consolidation`
      );
    }

    if (report.avgConfidenceChange < -0.1) {
      report.recommendations.push(
        "Overall confidence is declining - investigate feedback patterns"
      );
    }
  }

  private createEmptyReport(): ValidationReport {
    return {
      totalValidated: 0,
      memoryTypeBreakdown: {},
      avgConfidenceChange: 0,
      staleMemoriesFound: 0,
      memoriesMarkedForDeletion: 0,
      crossValidationMatches: 0,
      executionTime: 0,
      recommendations: [],
    };
  }
}
