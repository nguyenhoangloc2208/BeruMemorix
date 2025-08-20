/**
 * Background Memory Processor - Handles background consolidation and optimization
 * Based on hot-path vs background processing architecture
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

export interface BackgroundProcessorConfig {
  consolidationInterval: number; // minutes between consolidation runs
  maxProcessingTime: number; // max time for single consolidation run (ms)
  similarityThreshold: number; // threshold for memory similarity (0-1)
  staleMemoryThreshold: number; // days before memory is considered stale
  enableRealTimeProcessing: boolean; // process memories immediately after creation
}

export interface ConsolidationResult {
  processed: number;
  merged: number;
  cleaned: number;
  optimized: number;
  errors: string[];
  executionTime: number;
}

export interface BackgroundTask {
  id: string;
  type: "consolidation" | "cleanup" | "optimization" | "validation";
  priority: "low" | "medium" | "high" | "critical";
  scheduledAt: string;
  executedAt?: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
}

export class BackgroundProcessor {
  private memoryManager: MemoryTypesManager;
  private config: BackgroundProcessorConfig;
  private tasks: Map<string, BackgroundTask> = new Map();
  private processingInterval?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    memoryManager: MemoryTypesManager,
    config?: Partial<BackgroundProcessorConfig>
  ) {
    this.memoryManager = memoryManager;
    this.config = {
      consolidationInterval: config?.consolidationInterval || 30, // 30 minutes
      maxProcessingTime: config?.maxProcessingTime || 10000, // 10 seconds
      similarityThreshold: config?.similarityThreshold || 0.8,
      staleMemoryThreshold: config?.staleMemoryThreshold || 7, // 7 days
      enableRealTimeProcessing: config?.enableRealTimeProcessing ?? true,
    };

    this.startBackgroundProcessing();
  }

  /**
   * Start background processing scheduler
   */
  private startBackgroundProcessing(): void {
    this.processingInterval = setInterval(
      () => this.runScheduledTasks(),
      this.config.consolidationInterval * 60 * 1000
    );

    console.log(
      `Background processor started with ${this.config.consolidationInterval}min interval`
    );
  }

  /**
   * Stop background processing
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    console.log("Background processor stopped");
  }

  /**
   * Schedule a background task
   */
  scheduleTask(
    type: BackgroundTask["type"],
    priority: BackgroundTask["priority"] = "medium",
    scheduledAt?: string
  ): string {
    const id = this.generateTaskId();
    const task: BackgroundTask = {
      id,
      type,
      priority,
      scheduledAt: scheduledAt || new Date().toISOString(),
      status: "pending",
    };

    this.tasks.set(id, task);

    // If high/critical priority, run immediately
    if (priority === "high" || priority === "critical") {
      this.runTask(task);
    }

    return id;
  }

  /**
   * Run all scheduled tasks
   */
  private async runScheduledTasks(): Promise<void> {
    if (this.isProcessing) {
      console.log("Background processing already running, skipping...");
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      const pendingTasks = Array.from(this.tasks.values())
        .filter(
          (task) =>
            task.status === "pending" &&
            new Date(task.scheduledAt) <= new Date()
        )
        .sort(
          (a, b) =>
            this.getPriorityWeight(b.priority) -
            this.getPriorityWeight(a.priority)
        );

      console.log(`Running ${pendingTasks.length} background tasks...`);

      for (const task of pendingTasks) {
        if (Date.now() - startTime > this.config.maxProcessingTime) {
          console.log(
            "Background processing time limit reached, deferring remaining tasks"
          );
          break;
        }

        await this.runTask(task);
      }

      // Schedule next consolidation task
      this.scheduleTask(
        "consolidation",
        "low",
        new Date(
          Date.now() + this.config.consolidationInterval * 60 * 1000
        ).toISOString()
      );
    } catch (error) {
      console.error("Background processing error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Run a specific task
   */
  private async runTask(task: BackgroundTask): Promise<void> {
    task.status = "running";
    task.executedAt = new Date().toISOString();

    try {
      console.log(`Executing ${task.type} task (${task.priority} priority)...`);

      switch (task.type) {
        case "consolidation":
          task.result = await this.runMemoryConsolidation();
          break;
        case "cleanup":
          task.result = await this.runMemoryCleanup();
          break;
        case "optimization":
          task.result = await this.runMemoryOptimization();
          break;
        case "validation":
          task.result = await this.runMemoryValidation();
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      task.status = "completed";
      console.log(`Task ${task.type} completed successfully`);
    } catch (error) {
      task.status = "failed";
      task.error = error.message;
      console.error(`Task ${task.type} failed:`, error);
    }

    this.tasks.set(task.id, task);
  }

  /**
   * Consolidate similar memories across all memory types
   */
  private async runMemoryConsolidation(): Promise<ConsolidationResult> {
    const startTime = Date.now();
    let processed = 0;
    let merged = 0;
    let cleaned = 0;
    let optimized = 0;
    const errors: string[] = [];

    try {
      // Get analytics for consolidation decisions
      const analytics = this.memoryManager.getComprehensiveAnalytics();

      // 1. Consolidate working memory sessions
      const workingResult = await this.consolidateWorkingMemory();
      processed += workingResult.processed;
      merged += workingResult.merged;

      // 2. Consolidate similar episodes into semantic knowledge
      const episodicResult = await this.consolidateEpisodicMemory();
      processed += episodicResult.processed;
      merged += episodicResult.merged;

      // 3. Optimize semantic memory relationships
      const semanticResult = await this.optimizeSemanticRelationships();
      processed += semanticResult.processed;
      optimized += semanticResult.optimized;

      // 4. Update procedural memory effectiveness
      const proceduralResult = await this.optimizeProceduralMemory();
      processed += proceduralResult.processed;
      optimized += proceduralResult.optimized;

      // 5. Cross-memory type learning
      const crossResult = await this.performCrossMemoryLearning();
      processed += crossResult.processed;
      merged += crossResult.merged;
    } catch (error) {
      errors.push(`Consolidation error: ${error.message}`);
    }

    return {
      processed,
      merged,
      cleaned,
      optimized,
      errors,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Consolidate working memory by merging similar items
   */
  private async consolidateWorkingMemory(): Promise<{
    processed: number;
    merged: number;
  }> {
    // Get all working memory items grouped by session
    const sessions = new Map<string, WorkingMemoryItem[]>();

    // This would need access to working memory internal data
    // For now, return placeholder
    return { processed: 0, merged: 0 };
  }

  /**
   * Consolidate episodic memories into semantic knowledge
   */
  private async consolidateEpisodicMemory(): Promise<{
    processed: number;
    merged: number;
  }> {
    // Find patterns in successful episodes
    const insights = this.memoryManager.episodic.getLearningInsights();

    // Convert frequent success patterns into semantic knowledge
    let processed = 0;
    let merged = 0;

    for (const pattern of insights.successPatterns) {
      try {
        // Create semantic knowledge from successful patterns
        await this.memoryManager.semantic.storeKnowledge(
          `Successful pattern: ${pattern}`,
          {
            sessionId: "consolidation",
            conversationId: "background_processing",
            timestamp: new Date().toISOString(),
            priorities: ["pattern_learning"],
          },
          {
            category: "rule",
            domain: "interaction_patterns",
            confidence: 0.7,
            sources: ["episodic_consolidation"],
          }
        );
        merged++;
      } catch (error) {
        console.warn(`Failed to consolidate pattern: ${pattern}`, error);
      }
      processed++;
    }

    return { processed, merged };
  }

  /**
   * Optimize semantic memory relationships
   */
  private async optimizeSemanticRelationships(): Promise<{
    processed: number;
    optimized: number;
  }> {
    // This would analyze and optimize concept relationships
    // Placeholder implementation
    return { processed: 0, optimized: 0 };
  }

  /**
   * Optimize procedural memory effectiveness
   */
  private async optimizeProceduralMemory(): Promise<{
    processed: number;
    optimized: number;
  }> {
    const insights = this.memoryManager.procedural.getSkillInsights();

    // Remove underused skills with very low effectiveness
    let processed = insights.underusedSkills.length;
    let optimized = 0;

    // This would need internal access to procedural memory
    // For now, just log the insights
    console.log(
      `Found ${processed} underused skills for potential optimization`
    );

    return { processed, optimized };
  }

  /**
   * Perform cross-memory type learning
   */
  private async performCrossMemoryLearning(): Promise<{
    processed: number;
    merged: number;
  }> {
    // Find correlations between different memory types
    // e.g., successful procedures from episodic memory
    // Convert to procedural knowledge

    return { processed: 0, merged: 0 };
  }

  /**
   * Clean up stale and redundant memories
   */
  private async runMemoryCleanup(): Promise<ConsolidationResult> {
    const startTime = Date.now();
    let cleaned = 0;
    const errors: string[] = [];

    try {
      // Clean up expired working memory (automatic in working memory service)

      // Validate and clean semantic memory
      const semanticValidation =
        await this.memoryManager.semantic.validateKnowledge();
      cleaned += semanticValidation.stale;
    } catch (error) {
      errors.push(`Cleanup error: ${error.message}`);
    }

    return {
      processed: 0,
      merged: 0,
      cleaned,
      optimized: 0,
      errors,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Run memory optimization
   */
  private async runMemoryOptimization(): Promise<ConsolidationResult> {
    const optimization = await this.memoryManager.optimizeMemorySystem();

    return {
      processed: 0,
      merged: 0,
      cleaned: optimization.cleaned,
      optimized: optimization.consolidated,
      errors: [],
      executionTime: 0,
    };
  }

  /**
   * Run memory validation
   */
  private async runMemoryValidation(): Promise<ConsolidationResult> {
    // Validate memories across all types
    const validation = await this.memoryManager.semantic.validateKnowledge();

    return {
      processed:
        validation.validated + validation.stale + validation.lowConfidence,
      merged: 0,
      cleaned: validation.stale,
      optimized: validation.validated,
      errors: [],
      executionTime: 0,
    };
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): BackgroundTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get all tasks with optional filtering
   */
  getAllTasks(
    status?: BackgroundTask["status"],
    type?: BackgroundTask["type"]
  ): BackgroundTask[] {
    let tasks = Array.from(this.tasks.values());

    if (status) {
      tasks = tasks.filter((task) => task.status === status);
    }

    if (type) {
      tasks = tasks.filter((task) => task.type === type);
    }

    return tasks.sort(
      (a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );
  }

  /**
   * Get background processing statistics
   */
  getProcessingStats(): {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    isProcessing: boolean;
    nextScheduledRun: string;
  } {
    const tasks = Array.from(this.tasks.values());

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === "completed").length,
      failedTasks: tasks.filter((t) => t.status === "failed").length,
      isProcessing: this.isProcessing,
      nextScheduledRun: new Date(
        Date.now() + this.config.consolidationInterval * 60 * 1000
      ).toISOString(),
    };
  }

  /**
   * Force run consolidation (for testing or manual triggers)
   */
  async forceConsolidation(): Promise<ConsolidationResult> {
    return await this.runMemoryConsolidation();
  }

  /**
   * Clear completed tasks older than specified days
   */
  cleanupTasks(olderThanDays: number = 7): number {
    const cutoffDate = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (task.status === "completed" || task.status === "failed") {
        const taskDate = new Date(task.scheduledAt).getTime();
        if (taskDate < cutoffDate) {
          this.tasks.delete(id);
          removed++;
        }
      }
    }

    return removed;
  }

  /**
   * Private helper methods
   */
  private generateTaskId(): string {
    return (
      "bg_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    );
  }

  private getPriorityWeight(priority: BackgroundTask["priority"]): number {
    switch (priority) {
      case "critical":
        return 4;
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
      default:
        return 1;
    }
  }
}
