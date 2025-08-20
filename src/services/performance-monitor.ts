/**
 * Performance Monitoring System
 * Tracks real-time memory system health, performance metrics, and provides insights
 */

import { MemoryTypesManager } from "./memory-types-manager.js";
import { BackgroundProcessor } from "./background-processor.js";
import { UserFeedbackService } from "./user-feedback.ts";
import { MemoryValidationService } from "./memory-validation.js";

export interface PerformanceMetrics {
  timestamp: string;

  // System Health
  overallHealth: number; // 0-1 overall system health score
  memoryLoad: {
    working: number;
    episodic: number;
    semantic: number;
    procedural: number;
  };

  // Performance Stats
  responseTime: {
    search: number; // Average search response time (ms)
    store: number; // Average store operation time (ms)
    retrieval: number; // Average retrieval time (ms)
  };

  // Usage Analytics
  operations: {
    searchCount: number;
    storeCount: number;
    retrievalCount: number;
    feedbackCount: number;
  };

  // Resource Usage
  resources: {
    memoryUsage: number; // MB
    cpuUsage: number; // %
    ioOperations: number;
  };

  // Quality Metrics
  quality: {
    averageConfidence: number;
    staleRatio: number;
    userSatisfaction: number;
  };
}

export interface PerformanceAlert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  type: "performance" | "health" | "resource" | "quality";
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface PerformanceTrend {
  timeRange: string;
  metrics: {
    healthTrend: Array<{ timestamp: string; value: number }>;
    responseTrend: Array<{ timestamp: string; search: number; store: number }>;
    usageTrend: Array<{ timestamp: string; operations: number }>;
    qualityTrend: Array<{
      timestamp: string;
      confidence: number;
      satisfaction: number;
    }>;
  };
  insights: string[];
}

export interface MonitoringConfig {
  samplingInterval: number; // Seconds between metric collection
  historyRetention: number; // Days to keep historical data
  alertThresholds: {
    healthScore: number; // Minimum health score before alert
    responseTime: number; // Max response time (ms) before alert
    memoryUsage: number; // Max memory usage (MB) before alert
    staleRatio: number; // Max stale memory ratio before alert
  };
  enableRealTimeAlerts: boolean;
  enableTrendAnalysis: boolean;
}

export class PerformanceMonitoringService {
  private memoryManager: MemoryTypesManager;
  private backgroundProcessor?: BackgroundProcessor;
  private feedbackService?: UserFeedbackService;
  private validationService?: MemoryValidationService;

  private config: MonitoringConfig;
  private metricsHistory: PerformanceMetrics[] = [];
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private operationTimes: Map<string, number[]> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(
    memoryManager: MemoryTypesManager,
    config?: Partial<MonitoringConfig>
  ) {
    this.memoryManager = memoryManager;
    this.config = {
      samplingInterval: config?.samplingInterval || 30, // 30 seconds
      historyRetention: config?.historyRetention || 7, // 7 days
      alertThresholds: {
        healthScore: config?.alertThresholds?.healthScore || 0.7,
        responseTime: config?.alertThresholds?.responseTime || 1000, // 1 second
        memoryUsage: config?.alertThresholds?.memoryUsage || 500, // 500 MB
        staleRatio: config?.alertThresholds?.staleRatio || 0.3, // 30%
        ...config?.alertThresholds,
      },
      enableRealTimeAlerts: config?.enableRealTimeAlerts ?? true,
      enableTrendAnalysis: config?.enableTrendAnalysis ?? true,
      ...config,
    };

    this.initializeOperationTracking();
    this.startMonitoring();
  }

  /**
   * Inject optional services for comprehensive monitoring
   */
  setServices(
    backgroundProcessor?: BackgroundProcessor,
    feedbackService?: UserFeedbackService,
    validationService?: MemoryValidationService
  ): void {
    this.backgroundProcessor = backgroundProcessor;
    this.feedbackService = feedbackService;
    this.validationService = validationService;
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(
      () => this.collectMetrics(),
      this.config.samplingInterval * 1000
    );

    console.log(
      `Performance monitoring started with ${this.config.samplingInterval}s interval`
    );
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log("Performance monitoring stopped");
  }

  /**
   * Collect current performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    if (this.isMonitoring) return this.getLatestMetrics();

    this.isMonitoring = true;
    const timestamp = new Date().toISOString();

    try {
      // Get memory analytics
      const analytics = this.memoryManager.getComprehensiveAnalytics();

      // Calculate health score
      const overallHealth = this.calculateOverallHealth(analytics);

      // Get memory loads
      const memoryLoad = {
        working: analytics.workingMemory.currentLoad,
        episodic: analytics.episodicMemory.totalEpisodes / 1000, // Normalize to 0-1
        semantic: analytics.semanticMemory.conceptNetwork.nodes / 1000, // Normalize to 0-1
        procedural: analytics.proceduralMemory.totalProcedures / 100, // Normalize to 0-1
      };

      // Calculate response times
      const responseTime = this.calculateAverageResponseTimes();

      // Get operation counts
      const operations = this.getOperationCounts();

      // Estimate resource usage
      const resources = await this.estimateResourceUsage();

      // Calculate quality metrics
      const quality = this.calculateQualityMetrics(analytics);

      const metrics: PerformanceMetrics = {
        timestamp,
        overallHealth,
        memoryLoad,
        responseTime,
        operations,
        resources,
        quality,
      };

      // Store metrics
      this.metricsHistory.push(metrics);
      this.cleanupOldMetrics();

      // Check for alerts
      if (this.config.enableRealTimeAlerts) {
        await this.checkAlerts(metrics);
      }

      console.log(
        `Metrics collected: Health ${(overallHealth * 100).toFixed(
          1
        )}%, Response ${responseTime.search}ms`
      );

      return metrics;
    } catch (error) {
      console.error("Failed to collect metrics:", error);
      return this.createEmptyMetrics(timestamp);
    } finally {
      this.isMonitoring = false;
    }
  }

  /**
   * Record operation timing
   */
  recordOperation(
    operation: "search" | "store" | "retrieval",
    duration: number
  ): void {
    if (!this.operationTimes.has(operation)) {
      this.operationTimes.set(operation, []);
    }

    const times = this.operationTimes.get(operation)!;
    times.push(duration);

    // Keep only last 100 operations for averaging
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * Get current system health
   */
  getCurrentHealth(): number {
    const latest = this.getLatestMetrics();
    return latest.overallHealth;
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(): PerformanceMetrics {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : this.createEmptyMetrics(new Date().toISOString());
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 100): PerformanceMetrics[] {
    return this.metricsHistory
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Generate performance trend analysis
   */
  generateTrendAnalysis(hours: number = 24): PerformanceTrend {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    const recentMetrics = this.metricsHistory.filter(
      (m) => new Date(m.timestamp).getTime() > cutoffTime
    );

    const timeRange = `${hours}h`;
    const insights: string[] = [];

    // Health trend
    const healthTrend = recentMetrics.map((m) => ({
      timestamp: m.timestamp,
      value: m.overallHealth,
    }));

    // Response time trend
    const responseTrend = recentMetrics.map((m) => ({
      timestamp: m.timestamp,
      search: m.responseTime.search,
      store: m.responseTime.store,
    }));

    // Usage trend
    const usageTrend = recentMetrics.map((m) => ({
      timestamp: m.timestamp,
      operations:
        m.operations.searchCount +
        m.operations.storeCount +
        m.operations.retrievalCount,
    }));

    // Quality trend
    const qualityTrend = recentMetrics.map((m) => ({
      timestamp: m.timestamp,
      confidence: m.quality.averageConfidence,
      satisfaction: m.quality.userSatisfaction,
    }));

    // Generate insights
    if (recentMetrics.length > 1) {
      const latest = recentMetrics[recentMetrics.length - 1];
      const oldest = recentMetrics[0];

      // Health trend analysis
      const healthChange = latest.overallHealth - oldest.overallHealth;
      if (healthChange > 0.1) {
        insights.push(
          `System health improved by ${(healthChange * 100).toFixed(
            1
          )}% over ${timeRange}`
        );
      } else if (healthChange < -0.1) {
        insights.push(
          `System health declined by ${(Math.abs(healthChange) * 100).toFixed(
            1
          )}% over ${timeRange}`
        );
      }

      // Performance trend analysis
      const responseChange =
        latest.responseTime.search - oldest.responseTime.search;
      if (responseChange > 100) {
        insights.push(
          `Search response time increased by ${responseChange.toFixed(0)}ms`
        );
      } else if (responseChange < -100) {
        insights.push(
          `Search response time improved by ${Math.abs(responseChange).toFixed(
            0
          )}ms`
        );
      }

      // Usage pattern analysis
      const avgUsage =
        usageTrend.reduce((sum, point) => sum + point.operations, 0) /
        usageTrend.length;
      if (avgUsage > 100) {
        insights.push(
          `High system usage detected: ${avgUsage.toFixed(
            0
          )} operations per sampling period`
        );
      }
    }

    return {
      timeRange,
      metrics: {
        healthTrend,
        responseTrend,
        usageTrend,
        qualityTrend,
      },
      insights,
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter((alert) => !alert.resolved)
      .sort((a, b) => {
        // Sort by severity, then by timestamp
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff =
          severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.activeAlerts.set(alertId, alert);
      console.log(`Alert resolved: ${alert.message}`);
      return true;
    }
    return false;
  }

  /**
   * Get system performance summary
   */
  getPerformanceSummary(): {
    health: string;
    status: "excellent" | "good" | "fair" | "poor" | "critical";
    alerts: number;
    trends: string[];
    recommendations: string[];
  } {
    const latest = this.getLatestMetrics();
    const activeAlerts = this.getActiveAlerts();
    const trends = this.generateTrendAnalysis(1); // Last hour

    let status: "excellent" | "good" | "fair" | "poor" | "critical";
    if (latest.overallHealth >= 0.9) status = "excellent";
    else if (latest.overallHealth >= 0.8) status = "good";
    else if (latest.overallHealth >= 0.6) status = "fair";
    else if (latest.overallHealth >= 0.4) status = "poor";
    else status = "critical";

    const recommendations: string[] = [];

    if (latest.responseTime.search > 500) {
      recommendations.push(
        "Consider optimizing search algorithms for better performance"
      );
    }

    if (latest.quality.staleRatio > 0.2) {
      recommendations.push("High stale memory ratio - run memory cleanup");
    }

    if (activeAlerts.length > 5) {
      recommendations.push(
        "Multiple alerts active - investigate system issues"
      );
    }

    return {
      health: `${(latest.overallHealth * 100).toFixed(1)}%`,
      status,
      alerts: activeAlerts.length,
      trends: trends.insights,
      recommendations,
    };
  }

  /**
   * Force metrics collection (for testing)
   */
  async forceMetricsCollection(): Promise<PerformanceMetrics> {
    return await this.collectMetrics();
  }

  /**
   * Private helper methods
   */
  private initializeOperationTracking(): void {
    this.operationTimes.set("search", []);
    this.operationTimes.set("store", []);
    this.operationTimes.set("retrieval", []);
  }

  private calculateOverallHealth(analytics: any): number {
    // Weighted average of different health factors
    const workingHealth = 1 - analytics.workingMemory.currentLoad; // Lower load = better
    const episodicHealth = Math.min(
      1,
      analytics.episodicMemory.learningRate * 2
    ); // Learning rate up to 0.5 = 1.0 health
    const semanticHealth =
      analytics.semanticMemory.conceptNetwork.averageConfidence;
    const proceduralHealth = analytics.proceduralMemory.averageEffectiveness;

    return (
      workingHealth * 0.2 +
      episodicHealth * 0.3 +
      semanticHealth * 0.3 +
      proceduralHealth * 0.2
    );
  }

  private calculateAverageResponseTimes(): {
    search: number;
    store: number;
    retrieval: number;
  } {
    const search = this.getAverageTime("search");
    const store = this.getAverageTime("store");
    const retrieval = this.getAverageTime("retrieval");

    return { search, store, retrieval };
  }

  private getAverageTime(operation: string): number {
    const times = this.operationTimes.get(operation) || [];
    return times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  private getOperationCounts(): {
    searchCount: number;
    storeCount: number;
    retrievalCount: number;
    feedbackCount: number;
  } {
    // In a full implementation, these would be tracked from actual operations
    // For now, estimate based on operation times arrays
    return {
      searchCount: this.operationTimes.get("search")?.length || 0,
      storeCount: this.operationTimes.get("store")?.length || 0,
      retrievalCount: this.operationTimes.get("retrieval")?.length || 0,
      feedbackCount: this.feedbackService?.getRecentFeedback(10).length || 0,
    };
  }

  private async estimateResourceUsage(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    ioOperations: number;
  }> {
    // Estimate resource usage based on memory content and operations
    const analytics = this.memoryManager.getComprehensiveAnalytics();

    // Rough estimation of memory usage in MB
    const memoryUsage =
      analytics.workingMemory.currentLoad * 10 +
      analytics.episodicMemory.totalEpisodes * 0.1 +
      analytics.semanticMemory.conceptNetwork.nodes * 0.05 +
      analytics.proceduralMemory.totalProcedures * 0.2;

    // Estimate CPU usage based on recent operations
    const recentOperations = this.getOperationCounts();
    const totalOps =
      recentOperations.searchCount +
      recentOperations.storeCount +
      recentOperations.retrievalCount;
    const cpuUsage = Math.min(100, totalOps * 2); // Rough estimate

    return {
      memoryUsage,
      cpuUsage,
      ioOperations: totalOps,
    };
  }

  private calculateQualityMetrics(analytics: any): {
    averageConfidence: number;
    staleRatio: number;
    userSatisfaction: number;
  } {
    const averageConfidence =
      (analytics.semanticMemory.conceptNetwork.averageConfidence +
        analytics.proceduralMemory.averageEffectiveness) /
      2;

    const totalMemories =
      analytics.episodicMemory.totalEpisodes +
      analytics.semanticMemory.conceptNetwork.nodes +
      analytics.proceduralMemory.totalProcedures;

    const staleRatio =
      totalMemories > 0
        ? analytics.semanticMemory.staleKnowledge / totalMemories
        : 0;

    // Get user satisfaction from feedback service
    const feedbackAnalytics = this.feedbackService?.getFeedbackAnalytics();
    const userSatisfaction = feedbackAnalytics
      ? (feedbackAnalytics.positiveRatio +
          feedbackAnalytics.averageRating / 5) /
        2
      : 0.5;

    return {
      averageConfidence,
      staleRatio,
      userSatisfaction,
    };
  }

  private async checkAlerts(metrics: PerformanceMetrics): Promise<void> {
    // Health score alert
    if (metrics.overallHealth < this.config.alertThresholds.healthScore) {
      this.createAlert(
        "critical",
        "health",
        `System health below threshold: ${(metrics.overallHealth * 100).toFixed(
          1
        )}%`,
        "overallHealth",
        metrics.overallHealth,
        this.config.alertThresholds.healthScore
      );
    }

    // Response time alert
    if (
      metrics.responseTime.search > this.config.alertThresholds.responseTime
    ) {
      this.createAlert(
        "high",
        "performance",
        `Search response time excessive: ${metrics.responseTime.search}ms`,
        "searchResponseTime",
        metrics.responseTime.search,
        this.config.alertThresholds.responseTime
      );
    }

    // Memory usage alert
    if (
      metrics.resources.memoryUsage > this.config.alertThresholds.memoryUsage
    ) {
      this.createAlert(
        "medium",
        "resource",
        `Memory usage high: ${metrics.resources.memoryUsage.toFixed(1)}MB`,
        "memoryUsage",
        metrics.resources.memoryUsage,
        this.config.alertThresholds.memoryUsage
      );
    }

    // Stale memory alert
    if (metrics.quality.staleRatio > this.config.alertThresholds.staleRatio) {
      this.createAlert(
        "medium",
        "quality",
        `High stale memory ratio: ${(metrics.quality.staleRatio * 100).toFixed(
          1
        )}%`,
        "staleRatio",
        metrics.quality.staleRatio,
        this.config.alertThresholds.staleRatio
      );
    }
  }

  private createAlert(
    severity: PerformanceAlert["severity"],
    type: PerformanceAlert["type"],
    message: string,
    metric: string,
    currentValue: number,
    threshold: number
  ): void {
    const alertId = this.generateAlertId();
    const alert: PerformanceAlert = {
      id: alertId,
      severity,
      type,
      message,
      metric,
      currentValue,
      threshold,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.activeAlerts.set(alertId, alert);
    console.log(`🚨 Alert created [${severity.toUpperCase()}]: ${message}`);
  }

  private cleanupOldMetrics(): void {
    const cutoffTime =
      Date.now() - this.config.historyRetention * 24 * 60 * 60 * 1000;
    this.metricsHistory = this.metricsHistory.filter(
      (metrics) => new Date(metrics.timestamp).getTime() > cutoffTime
    );
  }

  private createEmptyMetrics(timestamp: string): PerformanceMetrics {
    return {
      timestamp,
      overallHealth: 0,
      memoryLoad: { working: 0, episodic: 0, semantic: 0, procedural: 0 },
      responseTime: { search: 0, store: 0, retrieval: 0 },
      operations: {
        searchCount: 0,
        storeCount: 0,
        retrievalCount: 0,
        feedbackCount: 0,
      },
      resources: { memoryUsage: 0, cpuUsage: 0, ioOperations: 0 },
      quality: { averageConfidence: 0, staleRatio: 0, userSatisfaction: 0 },
    };
  }

  private generateAlertId(): string {
    return (
      "alert_" +
      Math.random().toString(36).substr(2, 9) +
      Date.now().toString(36)
    );
  }
}
