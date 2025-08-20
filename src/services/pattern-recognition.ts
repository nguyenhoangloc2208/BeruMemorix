/**
 * Advanced Pattern Recognition System
 * Sophisticated pattern detection and analysis across memory types
 */

import type { MemoryTypeItem, MemoryContext } from "../types/memory-types.js";
import type { LearningPattern } from "./cross-memory-learning.js";

export interface RecognitionPattern {
  id: string;
  name: string;
  type: "sequence" | "frequency" | "anomaly" | "trend" | "cluster" | "cycle";
  description: string;
  template: any;
  confidence: number;
  complexity: "simple" | "moderate" | "complex" | "advanced";
  memoryTypes: string[];
  triggers: string[];
  outcomes: string[];
  lastDetected: string;
  detectionCount: number;
  accuracy: number; // Success rate of predictions based on this pattern
}

export interface PatternMatch {
  patternId: string;
  matchedMemories: Array<{
    memoryId: string;
    memoryType: string;
    relevance: number;
    position: number; // Position in sequence if applicable
  }>;
  confidence: number;
  strength: number; // How strong the match is
  completeness: number; // How complete the pattern match is (0-1)
  context: MemoryContext;
  detectedAt: string;
  predictedOutcomes: Array<{
    outcome: string;
    probability: number;
    timeframe: number; // Expected time in ms
  }>;
}

export interface PatternAnalysis {
  totalPatterns: number;
  activePatterns: number;
  patternTypes: Record<string, number>;
  avgConfidence: number;
  complexityDistribution: Record<string, number>;
  recentMatches: number;
  predictionAccuracy: number;
  trendingPatterns: RecognitionPattern[];
  anomalies: Array<{
    type: string;
    description: string;
    confidence: number;
    affectedMemories: string[];
  }>;
}

export class AdvancedPatternRecognition {
  private patterns: Map<string, RecognitionPattern> = new Map();
  private recentMatches: PatternMatch[] = [];
  private predictionHistory: Array<{
    patternId: string;
    prediction: string;
    actual: string;
    correct: boolean;
    timestamp: string;
  }> = [];

  // Recognition algorithms
  private recognitionAlgorithms = {
    sequence: this.detectSequencePatterns.bind(this),
    frequency: this.detectFrequencyPatterns.bind(this),
    anomaly: this.detectAnomalyPatterns.bind(this),
    trend: this.detectTrendPatterns.bind(this),
    cluster: this.detectClusterPatterns.bind(this),
    cycle: this.detectCyclicPatterns.bind(this),
  };

  // Configuration
  private config = {
    minPatternConfidence: 0.65,
    maxPatterns: 500,
    analysisWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
    predictionHorizon: 24 * 60 * 60 * 1000, // 24 hours
    anomalyThreshold: 0.8,
    trendSensitivity: 0.7,
  };

  constructor() {
    this.initializeBuiltInPatterns();
    console.log("🔍 Advanced pattern recognition system initialized");
  }

  /**
   * Analyze memories and detect patterns
   */
  async analyzeMemories(
    memories: MemoryTypeItem[],
    context: MemoryContext
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Run all recognition algorithms
    for (const [type, algorithm] of Object.entries(
      this.recognitionAlgorithms
    )) {
      try {
        const typeMatches = await algorithm(memories, context);
        matches.push(...typeMatches);
      } catch (error) {
        console.warn(`Pattern recognition error for type ${type}:`, error);
      }
    }

    // Store recent matches
    this.recentMatches.push(...matches);
    this.cleanupOldMatches();

    // Update pattern statistics
    this.updatePatternStatistics(matches);

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Register a custom pattern
   */
  registerPattern(
    pattern: Omit<
      RecognitionPattern,
      "id" | "lastDetected" | "detectionCount" | "accuracy"
    >
  ): string {
    const id = this.generatePatternId();

    this.patterns.set(id, {
      ...pattern,
      id,
      lastDetected: new Date().toISOString(),
      detectionCount: 0,
      accuracy: 0.5, // Start with neutral accuracy
    });

    console.log(`📝 Registered new pattern: ${pattern.name}`);
    return id;
  }

  /**
   * Detect sequence patterns (e.g., A → B → C)
   */
  private async detectSequencePatterns(
    memories: MemoryTypeItem[],
    context: MemoryContext
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Sort memories by timestamp
    const sortedMemories = memories.sort(
      (a, b) =>
        new Date(a.createdAt || a.timestamp || 0).getTime() -
        new Date(b.createdAt || b.timestamp || 0).getTime()
    );

    // Look for common sequences
    const sequences = this.extractSequences(sortedMemories, 3, 5); // 3-5 step sequences

    for (const sequence of sequences) {
      if (sequence.frequency > 1) {
        // Appeared more than once
        const confidence = Math.min(sequence.frequency / 10, 0.95);

        if (confidence >= this.config.minPatternConfidence) {
          matches.push({
            patternId: this.findOrCreateSequencePattern(sequence),
            matchedMemories: sequence.memories.map((mem, idx) => ({
              memoryId: mem.id,
              memoryType: mem.type,
              relevance: 0.9,
              position: idx,
            })),
            confidence,
            strength: sequence.strength,
            completeness: 1.0,
            context,
            detectedAt: new Date().toISOString(),
            predictedOutcomes: this.predictSequenceOutcomes(sequence),
          });
        }
      }
    }

    return matches;
  }

  /**
   * Detect frequency patterns (e.g., recurring themes)
   */
  private async detectFrequencyPatterns(
    memories: MemoryTypeItem[],
    context: MemoryContext
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Analyze word/phrase frequencies
    const termFrequencies = this.analyzeTermFrequencies(memories);
    const topTerms = Object.entries(termFrequencies)
      .filter(([term, freq]) => freq >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    for (const [term, frequency] of topTerms) {
      const relatedMemories = memories.filter((mem) =>
        mem.content.toLowerCase().includes(term.toLowerCase())
      );

      if (relatedMemories.length >= 3) {
        const confidence = Math.min(frequency / 20, 0.9);

        matches.push({
          patternId: this.findOrCreateFrequencyPattern(term, frequency),
          matchedMemories: relatedMemories.map((mem) => ({
            memoryId: mem.id,
            memoryType: mem.type,
            relevance: this.calculateTermRelevance(mem.content, term),
            position: 0,
          })),
          confidence,
          strength: frequency / memories.length,
          completeness: relatedMemories.length / memories.length,
          context,
          detectedAt: new Date().toISOString(),
          predictedOutcomes: [
            {
              outcome: `Continued usage of "${term}"`,
              probability: confidence,
              timeframe: 7 * 24 * 60 * 60 * 1000, // 7 days
            },
          ],
        });
      }
    }

    return matches;
  }

  /**
   * Detect anomaly patterns (unusual behaviors)
   */
  private async detectAnomalyPatterns(
    memories: MemoryTypeItem[],
    context: MemoryContext
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Analyze for statistical anomalies
    const anomalies = this.findStatisticalAnomalies(memories);

    for (const anomaly of anomalies) {
      if (anomaly.score > this.config.anomalyThreshold) {
        matches.push({
          patternId: this.findOrCreateAnomalyPattern(anomaly.type),
          matchedMemories: anomaly.memories.map((mem) => ({
            memoryId: mem.id,
            memoryType: mem.type,
            relevance: anomaly.score,
            position: 0,
          })),
          confidence: anomaly.score,
          strength: anomaly.deviation,
          completeness: 1.0,
          context,
          detectedAt: new Date().toISOString(),
          predictedOutcomes: [
            {
              outcome: `Anomaly resolution or escalation`,
              probability: 0.7,
              timeframe: 2 * 24 * 60 * 60 * 1000, // 2 days
            },
          ],
        });
      }
    }

    return matches;
  }

  /**
   * Detect trend patterns (increasing/decreasing patterns)
   */
  private async detectTrendPatterns(
    memories: MemoryTypeItem[],
    context: MemoryContext
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Analyze trends over time
    const trends = this.analyzeTrends(memories);

    for (const trend of trends) {
      if (Math.abs(trend.slope) > this.config.trendSensitivity) {
        const confidence = Math.min(Math.abs(trend.correlation), 0.95);

        matches.push({
          patternId: this.findOrCreateTrendPattern(
            trend.metric,
            trend.direction
          ),
          matchedMemories: trend.dataPoints.map((point) => ({
            memoryId: point.memoryId,
            memoryType: point.memoryType,
            relevance: point.value / trend.maxValue,
            position: point.timeIndex,
          })),
          confidence,
          strength: Math.abs(trend.slope),
          completeness: trend.dataPoints.length / memories.length,
          context,
          detectedAt: new Date().toISOString(),
          predictedOutcomes: this.predictTrendOutcomes(trend),
        });
      }
    }

    return matches;
  }

  /**
   * Detect cluster patterns (groups of related memories)
   */
  private async detectClusterPatterns(
    memories: MemoryTypeItem[],
    context: MemoryContext
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Perform clustering analysis
    const clusters = this.performClustering(memories);

    for (const cluster of clusters) {
      if (cluster.memories.length >= 3 && cluster.coherence > 0.6) {
        matches.push({
          patternId: this.findOrCreateClusterPattern(cluster.theme),
          matchedMemories: cluster.memories.map((mem) => ({
            memoryId: mem.id,
            memoryType: mem.type,
            relevance: mem.clusterScore,
            position: 0,
          })),
          confidence: cluster.coherence,
          strength: cluster.density,
          completeness: cluster.memories.length / memories.length,
          context,
          detectedAt: new Date().toISOString(),
          predictedOutcomes: [
            {
              outcome: `Cluster theme "${cluster.theme}" will continue to grow`,
              probability: cluster.coherence,
              timeframe: 14 * 24 * 60 * 60 * 1000, // 14 days
            },
          ],
        });
      }
    }

    return matches;
  }

  /**
   * Detect cyclic patterns (repeating cycles)
   */
  private async detectCyclicPatterns(
    memories: MemoryTypeItem[],
    context: MemoryContext
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Analyze for cyclical behaviors
    const cycles = this.detectCycles(memories);

    for (const cycle of cycles) {
      if (cycle.strength > 0.7 && cycle.periods.length >= 2) {
        matches.push({
          patternId: this.findOrCreateCyclicPattern(
            cycle.period,
            cycle.pattern
          ),
          matchedMemories: cycle.instances.flat().map((mem) => ({
            memoryId: mem.id,
            memoryType: mem.type,
            relevance: mem.cycleRelevance,
            position: mem.cyclePosition,
          })),
          confidence: cycle.strength,
          strength: cycle.regularity,
          completeness: cycle.completeness,
          context,
          detectedAt: new Date().toISOString(),
          predictedOutcomes: this.predictCyclicOutcomes(cycle),
        });
      }
    }

    return matches;
  }

  /**
   * Get pattern analysis and statistics
   */
  getPatternAnalysis(): PatternAnalysis {
    const patterns = Array.from(this.patterns.values());
    const recentMatches = this.recentMatches.filter(
      (match) =>
        new Date(match.detectedAt).getTime() >
        Date.now() - this.config.analysisWindow
    );

    const patternTypes = patterns.reduce((acc, pattern) => {
      acc[pattern.type] = (acc[pattern.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const complexityDistribution = patterns.reduce((acc, pattern) => {
      acc[pattern.complexity] = (acc[pattern.complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgConfidence =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
        : 0;

    const predictionAccuracy = this.calculatePredictionAccuracy();

    // Find trending patterns (most frequently detected recently)
    const trendingPatterns = patterns
      .filter(
        (p) =>
          new Date(p.lastDetected).getTime() >
          Date.now() - 7 * 24 * 60 * 60 * 1000
      )
      .sort((a, b) => b.detectionCount - a.detectionCount)
      .slice(0, 5);

    return {
      totalPatterns: patterns.length,
      activePatterns: patterns.filter((p) => p.detectionCount > 0).length,
      patternTypes,
      avgConfidence,
      complexityDistribution,
      recentMatches: recentMatches.length,
      predictionAccuracy,
      trendingPatterns,
      anomalies: this.detectSystemAnomalies(),
    };
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type: RecognitionPattern["type"]): RecognitionPattern[] {
    return Array.from(this.patterns.values()).filter((p) => p.type === type);
  }

  /**
   * Get recent pattern matches
   */
  getRecentMatches(limit: number = 10): PatternMatch[] {
    return this.recentMatches
      .sort(
        (a, b) =>
          new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Predict future patterns based on current trends
   */
  predictFuturePatterns(timeframe: number = 24 * 60 * 60 * 1000): Array<{
    patternId: string;
    probability: number;
    expectedTime: string;
    confidence: number;
  }> {
    const predictions = [];

    for (const pattern of this.patterns.values()) {
      if (pattern.detectionCount > 0) {
        const probability = this.calculatePatternProbability(
          pattern,
          timeframe
        );

        if (probability > 0.3) {
          predictions.push({
            patternId: pattern.id,
            probability,
            expectedTime: new Date(
              Date.now() + timeframe * probability
            ).toISOString(),
            confidence: pattern.accuracy,
          });
        }
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  // Helper methods
  private initializeBuiltInPatterns(): void {
    const builtInPatterns = [
      {
        name: "Learning Session",
        type: "sequence" as const,
        description:
          "User follows a learning sequence: search → study → practice → reflect",
        template: ["search", "study", "practice", "reflect"],
        confidence: 0.8,
        complexity: "moderate" as const,
        memoryTypes: ["episodic", "procedural"],
        triggers: ["new_topic", "skill_development"],
        outcomes: ["knowledge_gain", "skill_improvement"],
      },
      {
        name: "Problem Solving",
        type: "sequence" as const,
        description:
          "Problem solving pattern: identify → analyze → solution → verify",
        template: [
          "problem_identification",
          "analysis",
          "solution_attempt",
          "verification",
        ],
        confidence: 0.75,
        complexity: "complex" as const,
        memoryTypes: ["working", "episodic", "procedural"],
        triggers: ["problem_encountered", "challenge"],
        outcomes: ["solution_found", "learning"],
      },
      {
        name: "High Frequency Term",
        type: "frequency" as const,
        description: "Terms or concepts that appear frequently in memory",
        template: { minFrequency: 5, timeWindow: 7 * 24 * 60 * 60 * 1000 },
        confidence: 0.7,
        complexity: "simple" as const,
        memoryTypes: ["semantic", "working"],
        triggers: ["repeated_usage"],
        outcomes: ["concept_importance"],
      },
    ];

    for (const pattern of builtInPatterns) {
      this.registerPattern(pattern);
    }
  }

  private extractSequences(
    memories: MemoryTypeItem[],
    minLength: number,
    maxLength: number
  ): any[] {
    // Extract common sequences from memories
    const sequences = [];
    // Implementation would analyze memory sequences and find common patterns
    return sequences;
  }

  private analyzeTermFrequencies(
    memories: MemoryTypeItem[]
  ): Record<string, number> {
    const frequencies: Record<string, number> = {};

    for (const memory of memories) {
      const words = memory.content
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3); // Only significant words

      for (const word of words) {
        frequencies[word] = (frequencies[word] || 0) + 1;
      }
    }

    return frequencies;
  }

  private findStatisticalAnomalies(memories: MemoryTypeItem[]): any[] {
    // Find memories that are statistically anomalous
    const anomalies = [];

    // Analyze content length anomalies
    const lengths = memories.map((m) => m.content.length);
    const avgLength =
      lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const stdDev = Math.sqrt(
      lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
        lengths.length
    );

    for (const memory of memories) {
      const deviation = Math.abs(memory.content.length - avgLength) / stdDev;
      if (deviation > 2) {
        // 2 standard deviations
        anomalies.push({
          type: "content_length",
          score: Math.min(deviation / 3, 1),
          deviation,
          memories: [memory],
        });
      }
    }

    return anomalies;
  }

  private analyzeTrends(memories: MemoryTypeItem[]): any[] {
    // Analyze trends in memory data
    const trends = [];

    // Analyze memory creation trend over time
    const timeData = memories
      .map((m) => ({
        time: new Date(m.createdAt || m.timestamp || 0).getTime(),
        memoryId: m.id,
        memoryType: m.type,
      }))
      .sort((a, b) => a.time - b.time);

    if (timeData.length > 3) {
      const trend = this.calculateLinearTrend(timeData);
      if (trend) {
        trends.push(trend);
      }
    }

    return trends;
  }

  private performClustering(memories: MemoryTypeItem[]): any[] {
    // Perform clustering analysis on memories
    const clusters = [];

    // Simple content-based clustering
    const topics = this.extractTopics(memories);
    for (const topic of topics) {
      if (topic.memories.length >= 3) {
        clusters.push({
          theme: topic.name,
          memories: topic.memories.map((m) => ({
            ...m,
            clusterScore: topic.score,
          })),
          coherence: topic.coherence,
          density: topic.memories.length / memories.length,
        });
      }
    }

    return clusters;
  }

  private detectCycles(memories: MemoryTypeItem[]): any[] {
    // Detect cyclical patterns in memories
    const cycles = [];

    // Analyze daily/weekly/monthly patterns
    const timeAnalysis = this.analyzeCyclicalTime(memories);
    for (const cycle of timeAnalysis) {
      if (cycle.strength > 0.6) {
        cycles.push(cycle);
      }
    }

    return cycles;
  }

  private updatePatternStatistics(matches: PatternMatch[]): void {
    for (const match of matches) {
      const pattern = this.patterns.get(match.patternId);
      if (pattern) {
        pattern.detectionCount++;
        pattern.lastDetected = match.detectedAt;
        // Update accuracy based on prediction success (would be implemented with feedback)
      }
    }
  }

  private cleanupOldMatches(): void {
    const cutoff = Date.now() - this.config.analysisWindow;
    this.recentMatches = this.recentMatches.filter(
      (match) => new Date(match.detectedAt).getTime() > cutoff
    );
  }

  private calculatePredictionAccuracy(): number {
    if (this.predictionHistory.length === 0) return 0.5;

    const correct = this.predictionHistory.filter((p) => p.correct).length;
    return correct / this.predictionHistory.length;
  }

  private detectSystemAnomalies(): any[] {
    // Detect anomalies in the pattern recognition system itself
    return [];
  }

  private calculatePatternProbability(
    pattern: RecognitionPattern,
    timeframe: number
  ): number {
    // Calculate probability of pattern occurring in given timeframe
    const baseProb =
      pattern.detectionCount / Math.max(this.recentMatches.length, 1);
    return Math.min(baseProb * pattern.confidence, 0.95);
  }

  // Placeholder helper methods
  private findOrCreateSequencePattern(sequence: any): string {
    return this.generatePatternId();
  }

  private findOrCreateFrequencyPattern(
    term: string,
    frequency: number
  ): string {
    return this.generatePatternId();
  }

  private findOrCreateAnomalyPattern(type: string): string {
    return this.generatePatternId();
  }

  private findOrCreateTrendPattern(metric: string, direction: string): string {
    return this.generatePatternId();
  }

  private findOrCreateClusterPattern(theme: string): string {
    return this.generatePatternId();
  }

  private findOrCreateCyclicPattern(period: number, pattern: any): string {
    return this.generatePatternId();
  }

  private predictSequenceOutcomes(sequence: any): any[] {
    return [];
  }

  private predictTrendOutcomes(trend: any): any[] {
    return [];
  }

  private predictCyclicOutcomes(cycle: any): any[] {
    return [];
  }

  private calculateTermRelevance(content: string, term: string): number {
    const termCount = (
      content.toLowerCase().match(new RegExp(term.toLowerCase(), "g")) || []
    ).length;
    const totalWords = content.split(/\s+/).length;
    return termCount / totalWords;
  }

  private calculateLinearTrend(data: any[]): any {
    // Calculate linear regression trend
    return null; // Placeholder
  }

  private extractTopics(memories: MemoryTypeItem[]): any[] {
    // Extract topics from memories using simple keyword analysis
    return [];
  }

  private analyzeCyclicalTime(memories: MemoryTypeItem[]): any[] {
    // Analyze cyclical time patterns
    return [];
  }

  private generatePatternId(): string {
    return (
      "pattern_" +
      Math.random().toString(36).substr(2, 9) +
      Date.now().toString(36)
    );
  }
}
