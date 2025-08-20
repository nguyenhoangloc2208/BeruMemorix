/**
 * User Feedback Integration System
 * Handles user feedback collection, confidence scoring, and memory improvement
 */

import { MemoryTypesManager } from "./memory-types-manager.js";
import type {
  MemoryContext,
  EpisodicMemoryItem,
  SemanticMemoryItem,
  ProceduralMemoryItem,
} from "../types/memory-types.js";

export interface UserFeedback {
  id: string;
  userId?: string;
  sessionId: string;
  interactionId: string; // Reference to specific memory or interaction
  feedbackType:
    | "positive"
    | "negative"
    | "correction"
    | "suggestion"
    | "rating";
  rating?: number; // 1-5 scale for rating feedback
  originalContent?: string; // What user is providing feedback on
  correctedContent?: string; // User's correction if applicable
  explanation?: string; // User's explanation of the feedback
  timestamp: string;
  processed: boolean;
  impact: {
    memoryTypes: Array<"working" | "episodic" | "semantic" | "procedural">;
    confidenceChange: number; // -1 to +1
    learningValue: number; // 0-1 how much we learned from this feedback
  };
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  positiveRatio: number;
  negativeRatio: number;
  correctionCount: number;
  averageRating: number;
  learningRate: number; // How much we're improving from feedback
  userSatisfactionTrend: Array<{
    date: string;
    satisfaction: number;
  }>;
  commonCorrections: Array<{
    type: string;
    frequency: number;
    examples: string[];
  }>;
}

export interface ConfidenceUpdate {
  memoryId: string;
  memoryType: "working" | "episodic" | "semantic" | "procedural";
  oldConfidence: number;
  newConfidence: number;
  reason: string;
  feedbackId: string;
}

export class UserFeedbackService {
  private memoryManager: MemoryTypesManager;
  private feedbackHistory: Map<string, UserFeedback> = new Map();
  private confidenceUpdates: ConfidenceUpdate[] = [];
  private processingQueue: UserFeedback[] = [];

  constructor(memoryManager: MemoryTypesManager) {
    this.memoryManager = memoryManager;
  }

  /**
   * Submit user feedback for an interaction or memory
   */
  async submitFeedback(
    interactionId: string,
    feedbackType: UserFeedback["feedbackType"],
    context: MemoryContext & { userId?: string },
    options: {
      rating?: number;
      originalContent?: string;
      correctedContent?: string;
      explanation?: string;
    } = {}
  ): Promise<string> {
    const feedbackId = this.generateFeedbackId();

    const feedback: UserFeedback = {
      id: feedbackId,
      userId: context.userId,
      sessionId: context.sessionId,
      interactionId,
      feedbackType,
      rating: options.rating,
      originalContent: options.originalContent,
      correctedContent: options.correctedContent,
      explanation: options.explanation,
      timestamp: new Date().toISOString(),
      processed: false,
      impact: {
        memoryTypes: [],
        confidenceChange: 0,
        learningValue: 0,
      },
    };

    // Store feedback
    this.feedbackHistory.set(feedbackId, feedback);

    // Add to processing queue
    this.processingQueue.push(feedback);

    // Process immediately for critical feedback
    if (
      feedbackType === "correction" ||
      (feedbackType === "rating" && options.rating && options.rating <= 2)
    ) {
      await this.processFeedback(feedback);
    }

    console.log(
      `Feedback submitted: ${feedbackType} for interaction ${interactionId}`
    );
    return feedbackId;
  }

  /**
   * Process feedback and update memories accordingly
   */
  async processFeedback(feedback: UserFeedback): Promise<void> {
    try {
      console.log(
        `Processing ${feedback.feedbackType} feedback: ${feedback.id}`
      );

      switch (feedback.feedbackType) {
        case "positive":
          await this.handlePositiveFeedback(feedback);
          break;
        case "negative":
          await this.handleNegativeFeedback(feedback);
          break;
        case "correction":
          await this.handleCorrectionFeedback(feedback);
          break;
        case "suggestion":
          await this.handleSuggestionFeedback(feedback);
          break;
        case "rating":
          await this.handleRatingFeedback(feedback);
          break;
      }

      // Mark as processed
      feedback.processed = true;
      this.feedbackHistory.set(feedback.id, feedback);

      // Remove from processing queue
      const queueIndex = this.processingQueue.findIndex(
        (f) => f.id === feedback.id
      );
      if (queueIndex !== -1) {
        this.processingQueue.splice(queueIndex, 1);
      }

      console.log(`Feedback processed successfully: ${feedback.id}`);
    } catch (error) {
      console.error(`Failed to process feedback ${feedback.id}:`, error);
    }
  }

  /**
   * Handle positive feedback - boost confidence
   */
  private async handlePositiveFeedback(feedback: UserFeedback): Promise<void> {
    // Find related memories and boost their confidence
    const relatedMemories = await this.findRelatedMemories(
      feedback.interactionId
    );

    for (const memory of relatedMemories) {
      const confidenceBoost = 0.1; // Positive feedback increases confidence by 10%
      await this.updateMemoryConfidence(
        memory,
        confidenceBoost,
        feedback.id,
        "positive_feedback"
      );
      feedback.impact.memoryTypes.push(memory.type);
    }

    feedback.impact.confidenceChange = 0.1;
    feedback.impact.learningValue = 0.3;

    // Record positive interaction in episodic memory
    await this.recordFeedbackEpisode(feedback, "successful");
  }

  /**
   * Handle negative feedback - reduce confidence and investigate
   */
  private async handleNegativeFeedback(feedback: UserFeedback): Promise<void> {
    const relatedMemories = await this.findRelatedMemories(
      feedback.interactionId
    );

    for (const memory of relatedMemories) {
      const confidenceReduction = -0.15; // Negative feedback reduces confidence by 15%
      await this.updateMemoryConfidence(
        memory,
        confidenceReduction,
        feedback.id,
        "negative_feedback"
      );
      feedback.impact.memoryTypes.push(memory.type);
    }

    feedback.impact.confidenceChange = -0.15;
    feedback.impact.learningValue = 0.4; // High learning value - we need to understand what went wrong

    // Record negative interaction in episodic memory for learning
    await this.recordFeedbackEpisode(feedback, "failed");

    // Schedule memory validation for affected memories
    // This would integrate with background processor
    console.log(
      `Scheduled validation for memories affected by negative feedback`
    );
  }

  /**
   * Handle correction feedback - learn from user corrections
   */
  private async handleCorrectionFeedback(
    feedback: UserFeedback
  ): Promise<void> {
    if (!feedback.correctedContent || !feedback.originalContent) {
      console.warn("Correction feedback missing content");
      return;
    }

    // Store the correction as new semantic knowledge
    await this.memoryManager.semantic.storeKnowledge(
      `Correction: "${feedback.originalContent}" should be "${feedback.correctedContent}"`,
      {
        sessionId: feedback.sessionId,
        conversationId: "user_correction",
        timestamp: feedback.timestamp,
        priorities: ["correction", "learning"],
      },
      {
        category: "rule",
        domain: "user_corrections",
        confidence: 0.9, // High confidence in user corrections
        sources: ["user_feedback"],
        examples: [feedback.originalContent, feedback.correctedContent],
      }
    );

    // Find and update related memories
    const relatedMemories = await this.findRelatedMemories(
      feedback.interactionId
    );
    for (const memory of relatedMemories) {
      await this.updateMemoryConfidence(
        memory,
        -0.2,
        feedback.id,
        "user_correction"
      );
      feedback.impact.memoryTypes.push(memory.type);
    }

    feedback.impact.confidenceChange = -0.2;
    feedback.impact.learningValue = 0.8; // Very high learning value

    // Record correction episode
    await this.recordFeedbackEpisode(feedback, "partial");

    console.log(
      `Learned from user correction: "${feedback.originalContent}" → "${feedback.correctedContent}"`
    );
  }

  /**
   * Handle suggestion feedback - potential improvements
   */
  private async handleSuggestionFeedback(
    feedback: UserFeedback
  ): Promise<void> {
    if (!feedback.explanation) {
      console.warn("Suggestion feedback missing explanation");
      return;
    }

    // Store suggestion as potential procedural improvement
    await this.memoryManager.procedural.storeProcedure(
      `User suggestion: ${feedback.explanation}`,
      {
        sessionId: feedback.sessionId,
        conversationId: "user_suggestion",
        timestamp: feedback.timestamp,
        priorities: ["improvement", "user_input"],
      },
      {
        skillName: "User Suggestions",
        steps: [
          {
            action: feedback.explanation,
            conditions: ["user_suggested_improvement"],
            expectedOutcome: "Better user experience",
          },
        ],
        triggers: ["improvement_opportunity"],
        context: ["user_feedback"],
        effectiveness: 0.6, // Medium effectiveness until validated
      }
    );

    feedback.impact.memoryTypes.push("procedural");
    feedback.impact.confidenceChange = 0;
    feedback.impact.learningValue = 0.5;

    console.log(`Recorded user suggestion: ${feedback.explanation}`);
  }

  /**
   * Handle rating feedback - adjust confidence based on rating
   */
  private async handleRatingFeedback(feedback: UserFeedback): Promise<void> {
    if (!feedback.rating) return;

    const normalizedRating = (feedback.rating - 3) / 2; // Convert 1-5 to -1 to +1
    const confidenceChange = normalizedRating * 0.1; // Max ±10% confidence change

    const relatedMemories = await this.findRelatedMemories(
      feedback.interactionId
    );
    for (const memory of relatedMemories) {
      await this.updateMemoryConfidence(
        memory,
        confidenceChange,
        feedback.id,
        "rating_feedback"
      );
      feedback.impact.memoryTypes.push(memory.type);
    }

    feedback.impact.confidenceChange = confidenceChange;
    feedback.impact.learningValue = Math.abs(normalizedRating) * 0.4;

    // Record rating episode
    const outcome =
      feedback.rating >= 4
        ? "successful"
        : feedback.rating <= 2
        ? "failed"
        : "partial";
    await this.recordFeedbackEpisode(feedback, outcome);
  }

  /**
   * Find memories related to an interaction
   */
  private async findRelatedMemories(
    interactionId: string
  ): Promise<
    Array<{
      id: string;
      type: "working" | "episodic" | "semantic" | "procedural";
    }>
  > {
    // This would search across memory types for related content
    // For now, return a placeholder that could be the interaction itself
    return [
      {
        id: interactionId,
        type: "episodic" as const,
      },
    ];
  }

  /**
   * Update memory confidence based on feedback
   */
  private async updateMemoryConfidence(
    memory: {
      id: string;
      type: "working" | "episodic" | "semantic" | "procedural";
    },
    confidenceChange: number,
    feedbackId: string,
    reason: string
  ): Promise<void> {
    // This would update the specific memory's confidence
    // Implementation depends on memory type

    const update: ConfidenceUpdate = {
      memoryId: memory.id,
      memoryType: memory.type,
      oldConfidence: 0.5, // Would get actual confidence from memory
      newConfidence: Math.max(0, Math.min(1, 0.5 + confidenceChange)),
      reason,
      feedbackId,
    };

    this.confidenceUpdates.push(update);
    console.log(
      `Updated ${memory.type} memory ${memory.id} confidence: ${update.oldConfidence} → ${update.newConfidence} (${reason})`
    );
  }

  /**
   * Record feedback as an episodic memory for learning
   */
  private async recordFeedbackEpisode(
    feedback: UserFeedback,
    outcome: "successful" | "failed" | "partial"
  ): Promise<void> {
    await this.memoryManager.learnFromInteraction(
      `User provided ${feedback.feedbackType} feedback`,
      `System processed feedback and updated memories`,
      outcome,
      {
        sessionId: feedback.sessionId,
        conversationId: "feedback_learning",
        timestamp: feedback.timestamp,
        priorities: ["learning", "feedback"],
      },
      feedback.feedbackType === "positive"
        ? "positive"
        : feedback.feedbackType === "negative"
        ? "negative"
        : "neutral"
    );
  }

  /**
   * Process all pending feedback
   */
  async processPendingFeedback(): Promise<number> {
    const pendingCount = this.processingQueue.length;

    for (const feedback of [...this.processingQueue]) {
      await this.processFeedback(feedback);
    }

    return pendingCount;
  }

  /**
   * Get feedback analytics
   */
  getFeedbackAnalytics(): FeedbackAnalytics {
    const allFeedback = Array.from(this.feedbackHistory.values());
    const processedFeedback = allFeedback.filter((f) => f.processed);

    const positiveCount = processedFeedback.filter(
      (f) => f.feedbackType === "positive"
    ).length;
    const negativeCount = processedFeedback.filter(
      (f) => f.feedbackType === "negative"
    ).length;
    const correctionCount = processedFeedback.filter(
      (f) => f.feedbackType === "correction"
    ).length;

    const ratings = processedFeedback
      .filter((f) => f.rating)
      .map((f) => f.rating!);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;

    const learningRate =
      processedFeedback.length > 0
        ? processedFeedback.reduce(
            (sum, f) => sum + f.impact.learningValue,
            0
          ) / processedFeedback.length
        : 0;

    // Generate satisfaction trend (last 7 days)
    const userSatisfactionTrend =
      this.generateSatisfactionTrend(processedFeedback);

    // Analyze common corrections
    const commonCorrections = this.analyzeCommonCorrections(processedFeedback);

    return {
      totalFeedback: processedFeedback.length,
      positiveRatio:
        processedFeedback.length > 0
          ? positiveCount / processedFeedback.length
          : 0,
      negativeRatio:
        processedFeedback.length > 0
          ? negativeCount / processedFeedback.length
          : 0,
      correctionCount,
      averageRating,
      learningRate,
      userSatisfactionTrend,
      commonCorrections,
    };
  }

  /**
   * Generate satisfaction trend over time
   */
  private generateSatisfactionTrend(
    feedback: UserFeedback[]
  ): Array<{ date: string; satisfaction: number }> {
    const trend: Array<{ date: string; satisfaction: number }> = [];
    const days = 7;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayFeedback = feedback.filter((f) =>
        f.timestamp.startsWith(dateStr)
      );

      let satisfaction = 0.5; // Neutral default
      if (dayFeedback.length > 0) {
        const scores = dayFeedback.map((f) => {
          if (f.feedbackType === "positive") return 1;
          if (f.feedbackType === "negative") return 0;
          if (f.rating) return (f.rating - 1) / 4; // Convert 1-5 to 0-1
          return 0.5;
        });
        satisfaction = scores.reduce((a, b) => a + b, 0) / scores.length;
      }

      trend.push({ date: dateStr, satisfaction });
    }

    return trend;
  }

  /**
   * Analyze common correction patterns
   */
  private analyzeCommonCorrections(
    feedback: UserFeedback[]
  ): Array<{ type: string; frequency: number; examples: string[] }> {
    const corrections = feedback.filter(
      (f) => f.feedbackType === "correction" && f.correctedContent
    );
    const patterns: Record<string, { frequency: number; examples: string[] }> =
      {};

    corrections.forEach((correction) => {
      // Simple pattern detection based on content type
      let pattern = "general";

      if (
        correction.originalContent?.includes("fact") ||
        correction.originalContent?.includes("definition")
      ) {
        pattern = "factual_errors";
      } else if (
        correction.originalContent?.includes("how to") ||
        correction.originalContent?.includes("step")
      ) {
        pattern = "procedural_errors";
      } else if (
        correction.originalContent?.includes("remember") ||
        correction.originalContent?.includes("recall")
      ) {
        pattern = "memory_errors";
      }

      if (!patterns[pattern]) {
        patterns[pattern] = { frequency: 0, examples: [] };
      }

      patterns[pattern].frequency++;
      if (patterns[pattern].examples.length < 3) {
        patterns[pattern].examples.push(correction.correctedContent!);
      }
    });

    return Object.entries(patterns).map(([type, data]) => ({
      type,
      frequency: data.frequency,
      examples: data.examples,
    }));
  }

  /**
   * Get recent feedback
   */
  getRecentFeedback(limit: number = 10): UserFeedback[] {
    return Array.from(this.feedbackHistory.values())
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get confidence updates
   */
  getConfidenceUpdates(limit: number = 20): ConfidenceUpdate[] {
    return this.confidenceUpdates
      .sort((a, b) => b.feedbackId.localeCompare(a.feedbackId))
      .slice(0, limit);
  }

  /**
   * Get feedback by ID
   */
  getFeedback(feedbackId: string): UserFeedback | null {
    return this.feedbackHistory.get(feedbackId) || null;
  }

  /**
   * Private helper methods
   */
  private generateFeedbackId(): string {
    return (
      "fb_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    );
  }
}
