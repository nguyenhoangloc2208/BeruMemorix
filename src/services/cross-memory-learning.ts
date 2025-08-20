/**
 * Enhanced Cross-memory Learning Engine
 * Advanced learning across different memory types with pattern recognition and adaptation
 */

import { MemoryTypesManager } from "./memory-types-manager.js";
import type {
  WorkingMemoryItem,
  EpisodicMemoryItem,
  SemanticMemoryItem,
  ProceduralMemoryItem,
  MemoryTypeItem,
  MemoryContext,
} from "../types/memory-types.js";

export interface LearningPattern {
  id: string;
  type: "behavioral" | "conceptual" | "temporal" | "causal" | "associative";
  pattern: any;
  confidence: number; // 0-1
  frequency: number;
  lastSeen: string;
  memoryTypes: Array<"working" | "episodic" | "semantic" | "procedural">;
  relationships: Array<{
    source: string;
    target: string;
    strength: number;
    type: "causal" | "temporal" | "similarity" | "containment";
  }>;
  adaptations: Array<{
    timestamp: string;
    change: string;
    reason: string;
    impact: number;
  }>;
}

export interface LearningInsight {
  id: string;
  type:
    | "knowledge_gap"
    | "contradiction"
    | "reinforcement"
    | "new_connection"
    | "pattern_evolution";
  description: string;
  evidence: Array<{
    memoryId: string;
    memoryType: string;
    relevance: number;
  }>;
  confidence: number;
  actionable: boolean;
  suggestedActions: string[];
  priority: "low" | "medium" | "high" | "critical";
}

export interface CrossLearningSession {
  id: string;
  startTime: string;
  endTime?: string;
  context: MemoryContext;
  patternsDiscovered: string[];
  insightsGenerated: string[];
  memoryUpdates: Array<{
    memoryId: string;
    type: string;
    update: string;
  }>;
  learningScore: number; // 0-1
  adaptations: number;
}

export interface LearningMetrics {
  totalPatterns: number;
  activePatterns: number;
  patternConfidence: number;
  crossConnections: number;
  learningVelocity: number; // patterns per hour
  adaptationRate: number; // changes per session
  knowledgeGrowth: number; // new insights per day
  memoryCoherence: number; // consistency across types
}

export class CrossMemoryLearningEngine {
  private memoryManager: MemoryTypesManager;
  private patterns: Map<string, LearningPattern> = new Map();
  private insights: Map<string, LearningInsight> = new Map();
  private sessions: CrossLearningSession[] = [];
  private currentSession?: CrossLearningSession;

  // Learning configuration
  private config = {
    minPatternConfidence: 0.6,
    maxPatterns: 1000,
    sessionTimeout: 3600000, // 1 hour
    adaptationThreshold: 0.7,
    insightGenerationInterval: 300000, // 5 minutes
    patternEvolutionRate: 0.1,
  };

  constructor(memoryManager: MemoryTypesManager) {
    this.memoryManager = memoryManager;
    this.initializeLearningEngine();
  }

  /**
   * Start a new cross-memory learning session
   */
  async startLearningSession(context: MemoryContext): Promise<string> {
    // End current session if exists
    if (this.currentSession) {
      await this.endLearningSession();
    }

    const sessionId = this.generateSessionId();
    this.currentSession = {
      id: sessionId,
      startTime: new Date().toISOString(),
      context,
      patternsDiscovered: [],
      insightsGenerated: [],
      memoryUpdates: [],
      learningScore: 0,
      adaptations: 0,
    };

    console.log(`🧠 Started cross-memory learning session: ${sessionId}`);
    return sessionId;
  }

  /**
   * Process new memory and extract cross-learning insights
   */
  async processMemoryForLearning(
    memory: MemoryTypeItem,
    context: MemoryContext
  ): Promise<LearningInsight[]> {
    if (!this.currentSession) {
      await this.startLearningSession(context);
    }

    const insights: LearningInsight[] = [];

    // 1. Analyze cross-type relationships
    const crossRelationships = await this.analyzeCrossTypeRelationships(memory);

    // 2. Detect behavioral patterns
    const behavioralPatterns = await this.detectBehavioralPatterns(
      memory,
      context
    );

    // 3. Find conceptual connections
    const conceptualConnections = await this.findConceptualConnections(memory);

    // 4. Identify temporal sequences
    const temporalSequences = await this.identifyTemporalSequences(memory);

    // 5. Generate learning insights
    insights.push(
      ...(await this.generateLearningInsights([
        ...crossRelationships,
        ...behavioralPatterns,
        ...conceptualConnections,
        ...temporalSequences,
      ]))
    );

    // 6. Update patterns and adapt
    await this.updatePatternsFromInsights(insights);

    // 7. Record in current session
    if (this.currentSession) {
      this.currentSession.insightsGenerated.push(...insights.map((i) => i.id));
      this.currentSession.learningScore = this.calculateSessionLearningScore();
    }

    return insights;
  }

  /**
   * Analyze relationships across different memory types
   */
  private async analyzeCrossTypeRelationships(
    memory: MemoryTypeItem
  ): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Get memories from all types using search with empty query
    const workingResult = await this.memoryManager.working.search("", {});
    const episodicResult = await this.memoryManager.episodic.search("", {});
    const semanticResult = await this.memoryManager.semantic.search("", {});
    const proceduralResult = await this.memoryManager.procedural.search("", {});

    // Find cross-type connections based on content similarity
    const allMemories = [
      ...workingResult.items.map((m) => ({
        ...m,
        sourceType: "working" as const,
      })),
      ...episodicResult.items.map((m) => ({
        ...m,
        sourceType: "episodic" as const,
      })),
      ...semanticResult.items.map((m) => ({
        ...m,
        sourceType: "semantic" as const,
      })),
      ...proceduralResult.items.map((m) => ({
        ...m,
        sourceType: "procedural" as const,
      })),
    ];

    for (const otherMemory of allMemories) {
      if (otherMemory.id === memory.id) continue;

      const similarity = this.calculateSemanticSimilarity(
        memory.content,
        otherMemory.content
      );

      if (similarity > 0.7) {
        const patternId = this.generatePatternId();
        patterns.push({
          id: patternId,
          type: "associative",
          pattern: {
            sourceMemory: memory.id,
            sourceType: memory.type,
            targetMemory: otherMemory.id,
            targetType: otherMemory.sourceType,
            similarity,
            connectionType: this.determineConnectionType(memory, otherMemory),
          },
          confidence: similarity,
          frequency: 1,
          lastSeen: new Date().toISOString(),
          memoryTypes: [memory.type, otherMemory.sourceType],
          relationships: [
            {
              source: memory.id,
              target: otherMemory.id,
              strength: similarity,
              type: "similarity",
            },
          ],
          adaptations: [],
        });
      }
    }

    return patterns;
  }

  /**
   * Detect behavioral patterns from episodic and procedural memories
   */
  private async detectBehavioralPatterns(
    memory: MemoryTypeItem,
    context: MemoryContext
  ): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    if (memory.type === "episodic" || memory.type === "procedural") {
      // Analyze user behavior patterns
      const episodicResult = await this.memoryManager.episodic.search("", {});
      const recentEpisodes = episodicResult.items.slice(0, 10); // Get first 10 episodes
      const proceduralResult = await this.memoryManager.procedural.search(
        "",
        {}
      );
      const procedures = proceduralResult.items;

      // Look for recurring action sequences
      const actionSequences = this.extractActionSequences(
        recentEpisodes,
        procedures
      );

      for (const sequence of actionSequences) {
        if (sequence.frequency > 2) {
          // Repeated at least 3 times
          const patternId = this.generatePatternId();
          patterns.push({
            id: patternId,
            type: "behavioral",
            pattern: {
              sequence: sequence.actions,
              context: sequence.context,
              outcomes: sequence.outcomes,
              efficiency: sequence.efficiency,
            },
            confidence: Math.min(sequence.frequency / 10, 0.95),
            frequency: sequence.frequency,
            lastSeen: new Date().toISOString(),
            memoryTypes: ["episodic", "procedural"],
            relationships: sequence.relationships,
            adaptations: [],
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Find conceptual connections in semantic memories
   */
  private async findConceptualConnections(
    memory: MemoryTypeItem
  ): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    if (memory.type === "semantic") {
      const semanticResult = await this.memoryManager.semantic.search("", {});
      const semanticMemories = semanticResult.items;
      const conceptMap = this.buildConceptMap(semanticMemories);

      // Find conceptual clusters and hierarchies
      const clusters = this.identifyConceptClusters(conceptMap);

      for (const cluster of clusters) {
        if (cluster.concepts.length >= 3) {
          const patternId = this.generatePatternId();
          patterns.push({
            id: patternId,
            type: "conceptual",
            pattern: {
              centerConcept: cluster.center,
              relatedConcepts: cluster.concepts,
              hierarchy: cluster.hierarchy,
              strength: cluster.coherence,
            },
            confidence: cluster.coherence,
            frequency: cluster.concepts.length,
            lastSeen: new Date().toISOString(),
            memoryTypes: ["semantic"],
            relationships: cluster.relationships,
            adaptations: [],
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Identify temporal sequences across memory types
   */
  private async identifyTemporalSequences(
    memory: MemoryTypeItem
  ): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Get memories from all types sorted by time
    const allMemories = await this.getAllMemoriesChronologically();

    // Look for temporal patterns around the current memory
    const memoryIndex = allMemories.findIndex((m) => m.id === memory.id);
    if (memoryIndex >= 0) {
      const contextWindow = 5; // Look at 5 memories before and after
      const startIndex = Math.max(0, memoryIndex - contextWindow);
      const endIndex = Math.min(
        allMemories.length - 1,
        memoryIndex + contextWindow
      );

      const contextMemories = allMemories.slice(startIndex, endIndex + 1);
      const sequence = this.analyzeTemporalSequence(contextMemories);

      if (sequence.strength > 0.6) {
        const patternId = this.generatePatternId();
        patterns.push({
          id: patternId,
          type: "temporal",
          pattern: {
            sequence: sequence.events,
            duration: sequence.duration,
            triggers: sequence.triggers,
            outcomes: sequence.outcomes,
          },
          confidence: sequence.strength,
          frequency: 1,
          lastSeen: new Date().toISOString(),
          memoryTypes: sequence.memoryTypes,
          relationships: sequence.relationships,
          adaptations: [],
        });
      }
    }

    return patterns;
  }

  /**
   * Generate learning insights from discovered patterns
   */
  private async generateLearningInsights(
    patterns: LearningPattern[]
  ): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    for (const pattern of patterns) {
      // Store pattern if confident enough
      if (pattern.confidence >= this.config.minPatternConfidence) {
        this.patterns.set(pattern.id, pattern);

        if (this.currentSession) {
          this.currentSession.patternsDiscovered.push(pattern.id);
        }
      }

      // Generate insights based on pattern type
      switch (pattern.type) {
        case "associative":
          insights.push(...this.generateAssociativeInsights(pattern));
          break;
        case "behavioral":
          insights.push(...this.generateBehavioralInsights(pattern));
          break;
        case "conceptual":
          insights.push(...this.generateConceptualInsights(pattern));
          break;
        case "temporal":
          insights.push(...this.generateTemporalInsights(pattern));
          break;
      }
    }

    // Store insights
    for (const insight of insights) {
      this.insights.set(insight.id, insight);
    }

    return insights;
  }

  /**
   * Generate insights from associative patterns
   */
  private generateAssociativeInsights(
    pattern: LearningPattern
  ): LearningInsight[] {
    const insights: LearningInsight[] = [];

    if (pattern.confidence > 0.8) {
      insights.push({
        id: this.generateInsightId(),
        type: "new_connection",
        description: `Strong association discovered between ${pattern.pattern.sourceType} and ${pattern.pattern.targetType} memories`,
        evidence: [
          {
            memoryId: pattern.pattern.sourceMemory,
            memoryType: pattern.pattern.sourceType,
            relevance: 0.9,
          },
          {
            memoryId: pattern.pattern.targetMemory,
            memoryType: pattern.pattern.targetType,
            relevance: 0.9,
          },
        ],
        confidence: pattern.confidence,
        actionable: true,
        suggestedActions: [
          "Consider consolidating related information",
          "Create cross-references between memory types",
          "Update memory tags to reflect connection",
        ],
        priority: "medium",
      });
    }

    return insights;
  }

  /**
   * Generate insights from behavioral patterns
   */
  private generateBehavioralInsights(
    pattern: LearningPattern
  ): LearningInsight[] {
    const insights: LearningInsight[] = [];

    if (pattern.frequency > 3) {
      insights.push({
        id: this.generateInsightId(),
        type: "reinforcement",
        description: `Recurring behavioral pattern detected: ${pattern.pattern.sequence?.join(
          " → "
        )}`,
        evidence: pattern.relationships.map((rel) => ({
          memoryId: rel.source,
          memoryType: "episodic",
          relevance: rel.strength,
        })),
        confidence: pattern.confidence,
        actionable: true,
        suggestedActions: [
          "Create procedural memory for this pattern",
          "Optimize the behavioral sequence",
          "Document best practices",
        ],
        priority: "high",
      });
    }

    return insights;
  }

  /**
   * Generate insights from conceptual patterns
   */
  private generateConceptualInsights(
    pattern: LearningPattern
  ): LearningInsight[] {
    const insights: LearningInsight[] = [];

    insights.push({
      id: this.generateInsightId(),
      type: "knowledge_gap",
      description: `Conceptual cluster identified around '${pattern.pattern.centerConcept}'`,
      evidence: pattern.relationships.map((rel) => ({
        memoryId: rel.source,
        memoryType: "semantic",
        relevance: rel.strength,
      })),
      confidence: pattern.confidence,
      actionable: true,
      suggestedActions: [
        "Strengthen weak conceptual links",
        "Add missing conceptual bridges",
        "Create comprehensive knowledge summary",
      ],
      priority: "medium",
    });

    return insights;
  }

  /**
   * Generate insights from temporal patterns
   */
  private generateTemporalInsights(
    pattern: LearningPattern
  ): LearningInsight[] {
    const insights: LearningInsight[] = [];

    insights.push({
      id: this.generateInsightId(),
      type: "pattern_evolution",
      description: `Temporal sequence pattern in ${pattern.pattern.duration}ms timeframe`,
      evidence: pattern.relationships.map((rel) => ({
        memoryId: rel.source,
        memoryType: "mixed",
        relevance: rel.strength,
      })),
      confidence: pattern.confidence,
      actionable: true,
      suggestedActions: [
        "Track pattern evolution over time",
        "Identify optimal timing for actions",
        "Create predictive models",
      ],
      priority: "low",
    });

    return insights;
  }

  /**
   * Update existing patterns based on new insights
   */
  private async updatePatternsFromInsights(
    insights: LearningInsight[]
  ): Promise<void> {
    for (const insight of insights) {
      // Find related patterns
      const relatedPatterns = this.findRelatedPatterns(insight);

      for (const pattern of relatedPatterns) {
        // Adapt pattern based on insight
        const adaptation = this.generatePatternAdaptation(pattern, insight);

        if (adaptation) {
          pattern.adaptations.push(adaptation);
          pattern.confidence = Math.min(
            pattern.confidence + adaptation.impact,
            1.0
          );
          pattern.lastSeen = new Date().toISOString();

          if (this.currentSession) {
            this.currentSession.adaptations++;
          }
        }
      }
    }
  }

  /**
   * End current learning session and save results
   */
  async endLearningSession(): Promise<CrossLearningSession | null> {
    if (!this.currentSession) return null;

    this.currentSession.endTime = new Date().toISOString();
    this.currentSession.learningScore = this.calculateSessionLearningScore();

    // Save session
    this.sessions.push(this.currentSession);

    console.log(
      `🎓 Ended learning session ${
        this.currentSession.id
      } with score ${this.currentSession.learningScore.toFixed(2)}`
    );

    const completedSession = this.currentSession;
    this.currentSession = undefined;

    return completedSession;
  }

  /**
   * Get learning metrics and analytics
   */
  getLearningMetrics(): LearningMetrics {
    const activePatterns = Array.from(this.patterns.values()).filter(
      (p) =>
        new Date(p.lastSeen).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Active in last 7 days
    );

    const avgConfidence =
      activePatterns.length > 0
        ? activePatterns.reduce((sum, p) => sum + p.confidence, 0) /
          activePatterns.length
        : 0;

    const crossConnections = Array.from(this.patterns.values()).reduce(
      (sum, p) => sum + p.relationships.length,
      0
    );

    const recentSessions = this.sessions.filter(
      (s) => new Date(s.startTime).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const learningVelocity =
      recentSessions.length > 0
        ? recentSessions.reduce(
            (sum, s) => sum + s.patternsDiscovered.length,
            0
          ) / 24
        : 0;

    return {
      totalPatterns: this.patterns.size,
      activePatterns: activePatterns.length,
      patternConfidence: avgConfidence,
      crossConnections,
      learningVelocity,
      adaptationRate:
        recentSessions.reduce((sum, s) => sum + s.adaptations, 0) /
        Math.max(recentSessions.length, 1),
      knowledgeGrowth: this.insights.size / Math.max(this.sessions.length, 1),
      memoryCoherence: this.calculateMemoryCoherence(),
    };
  }

  /**
   * Get discovered patterns by type
   */
  getPatternsByType(type: LearningPattern["type"]): LearningPattern[] {
    return Array.from(this.patterns.values()).filter((p) => p.type === type);
  }

  /**
   * Get insights by priority
   */
  getInsightsByPriority(
    priority: LearningInsight["priority"]
  ): LearningInsight[] {
    return Array.from(this.insights.values()).filter(
      (i) => i.priority === priority
    );
  }

  /**
   * Get learning session history
   */
  getSessionHistory(limit: number = 10): CrossLearningSession[] {
    return this.sessions
      .sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
      .slice(0, limit);
  }

  // Helper methods
  private initializeLearningEngine(): void {
    console.log("🧠 Cross-memory learning engine initialized");

    // Start periodic insight generation
    setInterval(() => {
      this.performPeriodicLearning();
    }, this.config.insightGenerationInterval);
  }

  private async performPeriodicLearning(): Promise<void> {
    if (!this.currentSession) return;

    // Evolve existing patterns
    this.evolvePatterns();

    // Clean up old patterns
    this.cleanupPatterns();
  }

  private evolvePatterns(): void {
    for (const pattern of this.patterns.values()) {
      // Decay confidence over time
      const daysSinceLastSeen =
        (Date.now() - new Date(pattern.lastSeen).getTime()) /
        (24 * 60 * 60 * 1000);
      const decayRate = Math.min(
        daysSinceLastSeen * this.config.patternEvolutionRate,
        0.5
      );
      pattern.confidence = Math.max(pattern.confidence - decayRate, 0.1);
    }
  }

  private cleanupPatterns(): void {
    // Remove patterns with very low confidence
    for (const [id, pattern] of this.patterns.entries()) {
      if (pattern.confidence < 0.2) {
        this.patterns.delete(id);
      }
    }

    // Limit total patterns
    if (this.patterns.size > this.config.maxPatterns) {
      const sortedPatterns = Array.from(this.patterns.entries()).sort(
        ([, a], [, b]) => a.confidence - b.confidence
      );

      const toRemove = this.patterns.size - this.config.maxPatterns;
      for (let i = 0; i < toRemove; i++) {
        this.patterns.delete(sortedPatterns[i][0]);
      }
    }
  }

  private calculateSemanticSimilarity(
    content1: string,
    content2: string
  ): number {
    // Simple word-based similarity (in production would use embeddings)
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private determineConnectionType(
    memory1: MemoryTypeItem,
    memory2: any
  ): string {
    // Determine type of connection based on memory types and content
    if (memory1.type === "episodic" && memory2.sourceType === "procedural")
      return "action_knowledge";
    if (memory1.type === "semantic" && memory2.sourceType === "episodic")
      return "concept_experience";
    if (memory1.type === "working" && memory2.sourceType === "semantic")
      return "active_knowledge";
    return "general_similarity";
  }

  private extractActionSequences(
    episodes: EpisodicMemoryItem[],
    procedures: ProceduralMemoryItem[]
  ): any[] {
    // Extract and analyze action sequences from episodes and procedures
    return []; // Placeholder implementation
  }

  private buildConceptMap(semanticMemories: SemanticMemoryItem[]): any {
    // Build a concept map from semantic memories
    return {}; // Placeholder implementation
  }

  private identifyConceptClusters(conceptMap: any): any[] {
    // Identify clusters of related concepts
    return []; // Placeholder implementation
  }

  private async getAllMemoriesChronologically(): Promise<any[]> {
    // Get all memories sorted by creation time
    const all = [];
    // Implementation would gather from all memory types and sort by timestamp
    return all;
  }

  private analyzeTemporalSequence(memories: any[]): any {
    // Analyze temporal patterns in memory sequence
    return {
      strength: 0,
      events: [],
      duration: 0,
      triggers: [],
      outcomes: [],
      memoryTypes: [],
      relationships: [],
    };
  }

  private findRelatedPatterns(insight: LearningInsight): LearningPattern[] {
    // Find patterns related to an insight
    return Array.from(this.patterns.values()).filter((pattern) =>
      insight.evidence.some((evidence) =>
        pattern.relationships.some(
          (rel) =>
            rel.source === evidence.memoryId || rel.target === evidence.memoryId
        )
      )
    );
  }

  private generatePatternAdaptation(
    pattern: LearningPattern,
    insight: LearningInsight
  ): any {
    // Generate adaptation for pattern based on insight
    if (insight.confidence > 0.8) {
      return {
        timestamp: new Date().toISOString(),
        change: `Adapted based on ${insight.type} insight`,
        reason: insight.description,
        impact: 0.1,
      };
    }
    return null;
  }

  private calculateSessionLearningScore(): number {
    if (!this.currentSession) return 0;

    const patternsScore = this.currentSession.patternsDiscovered.length * 0.3;
    const insightsScore = this.currentSession.insightsGenerated.length * 0.4;
    const adaptationsScore = this.currentSession.adaptations * 0.3;

    return Math.min(patternsScore + insightsScore + adaptationsScore, 1.0);
  }

  private calculateMemoryCoherence(): number {
    // Calculate how coherent memories are across types
    const crossConnections = Array.from(this.patterns.values()).filter(
      (p) => p.memoryTypes.length > 1
    ).length;

    const totalPatterns = this.patterns.size;
    return totalPatterns > 0 ? crossConnections / totalPatterns : 0;
  }

  private generateSessionId(): string {
    return (
      "learn_" +
      Math.random().toString(36).substr(2, 9) +
      Date.now().toString(36)
    );
  }

  private generatePatternId(): string {
    return "pattern_" + Math.random().toString(36).substr(2, 9);
  }

  private generateInsightId(): string {
    return "insight_" + Math.random().toString(36).substr(2, 9);
  }
}
