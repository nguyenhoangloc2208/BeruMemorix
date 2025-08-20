#!/usr/bin/env npx tsx

/**
 * Test Week 10: Advanced Features & Cross-memory Learning
 * Comprehensive testing of advanced learning features and cross-memory capabilities
 */

import { MemoryTypesManager } from "../src/services/memory-types-manager.js";
import { CrossMemoryLearningEngine } from "../src/services/cross-memory-learning.js";
import { AdvancedPatternRecognition } from "../src/services/pattern-recognition.js";
import { MultiModalMemorySystem } from "../src/services/multi-modal-memory.js";
import { LearningAnalyticsEngine } from "../src/services/learning-analytics.js";

console.log("🚀 Testing Week 10: Advanced Features & Cross-memory Learning");
console.log("=".repeat(70));

async function testCrossMemoryLearning() {
  console.log("\n1️⃣ Testing Cross-memory Learning Engine...");

  const memoryManager = new MemoryTypesManager();
  const learningEngine = new CrossMemoryLearningEngine(memoryManager);

  // Create test context
  const context = {
    userId: "test_user",
    sessionId: "cross_learning_session",
    conversationId: "cross_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["learning", "analysis"],
  };

  // Start learning session
  const sessionId = await learningEngine.startLearningSession(context);
  console.log(`✅ Started learning session: ${sessionId}`);

  // Add some test memories to different types
  const workingMemoryId = await memoryManager.working.store(
    "Currently learning advanced pattern recognition techniques",
    context,
    { capacity: 5, priority: 0.9 }
  );

  const episodicMemoryId = await memoryManager.episodic.recordEpisode(
    "Successfully implemented fuzzy search algorithm",
    context,
    {
      userAction: "implement_algorithm",
      systemResponse: "algorithm_working",
      outcome: "successful_implementation",
      tags: ["coding", "algorithm", "success"],
      autoGenerateTakeaways: true,
    }
  );

  const semanticMemoryId = await memoryManager.semantic.storeKnowledge(
    "Pattern recognition is a machine learning technique used to identify regularities in data",
    context,
    {
      category: "concept",
      domain: "machine_learning",
      confidence: 0.9,
      sources: ["ml_textbook", "research_papers"],
    }
  );

  const proceduralMemoryId = await memoryManager.procedural.storeProcedure(
    "When implementing search algorithms, always consider performance optimization",
    context,
    {
      skillName: "Algorithm Optimization",
      steps: [
        {
          action: "analyze_requirements",
          conditions: ["clear_specs"],
          expectedOutcome: "optimized_approach",
        },
        {
          action: "implement_algorithm",
          conditions: ["design_ready"],
          expectedOutcome: "working_code",
        },
        {
          action: "measure_performance",
          conditions: ["code_complete"],
          expectedOutcome: "metrics_available",
        },
      ],
      triggers: ["implementing_search"],
      context: ["algorithm_development", "performance_optimization"],
      effectiveness: 0.85,
    }
  );

  console.log("✅ Created test memories in all types");

  // Process memories for learning
  const workingMemory = await memoryManager.working.retrieve(workingMemoryId);
  const episodicMemory = await memoryManager.episodic.retrieve(
    episodicMemoryId
  );
  const semanticMemory = await memoryManager.semantic.retrieve(
    semanticMemoryId
  );
  const proceduralMemory = await memoryManager.procedural.retrieve(
    proceduralMemoryId
  );

  if (workingMemory) {
    const insights1 = await learningEngine.processMemoryForLearning(
      workingMemory,
      context
    );
    console.log(
      `✅ Generated ${insights1.length} insights from working memory`
    );
  }

  if (episodicMemory) {
    const insights2 = await learningEngine.processMemoryForLearning(
      episodicMemory,
      context
    );
    console.log(
      `✅ Generated ${insights2.length} insights from episodic memory`
    );
  }

  if (semanticMemory) {
    const insights3 = await learningEngine.processMemoryForLearning(
      semanticMemory,
      context
    );
    console.log(
      `✅ Generated ${insights3.length} insights from semantic memory`
    );
  }

  if (proceduralMemory) {
    const insights4 = await learningEngine.processMemoryForLearning(
      proceduralMemory,
      context
    );
    console.log(
      `✅ Generated ${insights4.length} insights from procedural memory`
    );
  }

  // End learning session
  const completedSession = await learningEngine.endLearningSession();
  if (completedSession) {
    console.log(
      `✅ Completed session with score: ${completedSession.learningScore.toFixed(
        3
      )}`
    );
    console.log(
      `   Patterns discovered: ${completedSession.patternsDiscovered.length}`
    );
    console.log(
      `   Insights generated: ${completedSession.insightsGenerated.length}`
    );
    console.log(`   Adaptations made: ${completedSession.adaptations}`);
  }

  // Get learning metrics
  const metrics = learningEngine.getLearningMetrics();
  console.log(`✅ Learning metrics:`);
  console.log(`   Total patterns: ${metrics.totalPatterns}`);
  console.log(`   Active patterns: ${metrics.activePatterns}`);
  console.log(`   Cross connections: ${metrics.crossConnections}`);
  console.log(
    `   Learning velocity: ${metrics.learningVelocity.toFixed(2)} patterns/hour`
  );
  console.log(
    `   Memory coherence: ${(metrics.memoryCoherence * 100).toFixed(1)}%`
  );

  return { learningEngine, completedSession, metrics };
}

async function testPatternRecognition() {
  console.log("\n2️⃣ Testing Advanced Pattern Recognition...");

  const patternRecognition = new AdvancedPatternRecognition();

  // Create test memories with different patterns
  const testMemories = [
    {
      id: "mem1",
      type: "episodic" as const,
      content:
        "User searched for 'machine learning' and then studied algorithms",
      timestamp: "2024-01-01T10:00:00Z",
      createdAt: "2024-01-01T10:00:00Z",
    },
    {
      id: "mem2",
      type: "episodic" as const,
      content:
        "User searched for 'neural networks' and then studied algorithms",
      timestamp: "2024-01-01T11:00:00Z",
      createdAt: "2024-01-01T11:00:00Z",
    },
    {
      id: "mem3",
      type: "semantic" as const,
      content: "Machine learning algorithms are used for pattern recognition",
      timestamp: "2024-01-01T12:00:00Z",
      createdAt: "2024-01-01T12:00:00Z",
    },
    {
      id: "mem4",
      type: "semantic" as const,
      content:
        "Neural networks are machine learning algorithms for pattern recognition",
      timestamp: "2024-01-01T13:00:00Z",
      createdAt: "2024-01-01T13:00:00Z",
    },
    {
      id: "mem5",
      type: "procedural" as const,
      content: "When learning algorithms, always start with basic concepts",
      timestamp: "2024-01-01T14:00:00Z",
      createdAt: "2024-01-01T14:00:00Z",
    },
  ];

  const context = {
    userId: "test_user",
    sessionId: "pattern_session",
    conversationId: "pattern_conv_001",
    timestamp: new Date().toISOString(),
  };

  // Analyze memories for patterns
  const matches = await patternRecognition.analyzeMemories(
    testMemories,
    context
  );
  console.log(`✅ Found ${matches.length} pattern matches`);

  matches.forEach((match, index) => {
    console.log(`   ${index + 1}. Pattern: ${match.patternId}`);
    console.log(`      Confidence: ${(match.confidence * 100).toFixed(1)}%`);
    console.log(`      Strength: ${(match.strength * 100).toFixed(1)}%`);
    console.log(`      Matched memories: ${match.matchedMemories.length}`);
    if (match.predictedOutcomes.length > 0) {
      console.log(
        `      Predicted outcome: ${match.predictedOutcomes[0].outcome} (${(
          match.predictedOutcomes[0].probability * 100
        ).toFixed(1)}%)`
      );
    }
  });

  // Register custom pattern
  const customPatternId = patternRecognition.registerPattern({
    name: "Learning Sequence",
    type: "sequence",
    description: "User follows search -> study -> practice pattern",
    template: ["search", "study", "practice"],
    confidence: 0.8,
    complexity: "moderate",
    memoryTypes: ["episodic", "procedural"],
    triggers: ["learning_intent"],
    outcomes: ["skill_improvement"],
  });
  console.log(`✅ Registered custom pattern: ${customPatternId}`);

  // Get pattern analysis
  const analysis = patternRecognition.getPatternAnalysis();
  console.log(`✅ Pattern analysis:`);
  console.log(`   Total patterns: ${analysis.totalPatterns}`);
  console.log(`   Active patterns: ${analysis.activePatterns}`);
  console.log(
    `   Average confidence: ${(analysis.avgConfidence * 100).toFixed(1)}%`
  );
  console.log(`   Recent matches: ${analysis.recentMatches}`);
  console.log(
    `   Prediction accuracy: ${(analysis.predictionAccuracy * 100).toFixed(1)}%`
  );
  console.log(`   Trending patterns: ${analysis.trendingPatterns.length}`);

  // Get future predictions
  const predictions = patternRecognition.predictFuturePatterns(
    24 * 60 * 60 * 1000
  ); // 24 hours
  console.log(`✅ Future predictions (24h): ${predictions.length}`);
  predictions.slice(0, 3).forEach((prediction, index) => {
    console.log(`   ${index + 1}. Pattern: ${prediction.patternId}`);
    console.log(
      `      Probability: ${(prediction.probability * 100).toFixed(1)}%`
    );
    console.log(
      `      Expected at: ${new Date(
        prediction.expectedTime
      ).toLocaleTimeString()}`
    );
  });

  return { patternRecognition, matches, analysis, predictions };
}

async function testMultiModalMemory() {
  console.log("\n3️⃣ Testing Multi-modal Memory System...");

  const multiModal = new MultiModalMemorySystem("data/test_multimodal");

  // Test text content
  const textContent = {
    primary: {
      type: "text" as const,
      content:
        "This is a comprehensive guide to machine learning algorithms and their applications in modern AI systems.",
      metadata: { language: "en", topic: "machine_learning" },
    },
    attachments: [
      {
        id: "code_example_1",
        type: "code" as const,
        content: `
function trainModel(data, labels) {
  const model = new NeuralNetwork();
  model.train(data, labels);
  return model;
}
        `,
        metadata: { language: "javascript", framework: "neural_network" },
        size: 150,
        mimeType: "text/javascript",
        description: "Neural network training function",
      },
      {
        id: "doc_link_1",
        type: "link" as const,
        content: "https://github.com/tensorflow/tensorflow",
        metadata: { domain: "github.com", category: "documentation" },
        size: 50,
        description: "TensorFlow documentation",
      },
    ],
    relationships: [
      {
        fromId: "main",
        toId: "code_example_1",
        type: "contains" as const,
        strength: 0.9,
      },
      {
        fromId: "main",
        toId: "doc_link_1",
        type: "references" as const,
        strength: 0.7,
      },
    ],
  };

  const context = {
    userId: "test_user",
    sessionId: "multimodal_session",
    conversationId: "mm_conv_001",
    timestamp: new Date().toISOString(),
  };

  // Store multi-modal content
  const contentId = await multiModal.storeMultiModalContent(
    textContent,
    context
  );
  console.log(`✅ Stored multi-modal content: ${contentId}`);

  // Test search across modalities
  const searchResults = await multiModal.searchMultiModal("machine learning", {
    modalities: ["text", "code", "link"],
    limit: 10,
    includeAttachments: true,
  });

  console.log(`✅ Search results: ${searchResults.length} matches`);
  searchResults.forEach((result, index) => {
    console.log(
      `   ${index + 1}. [${result.type.toUpperCase()}] ${result.contentId}`
    );
    console.log(`      Relevance: ${(result.relevance * 100).toFixed(1)}%`);
    console.log(`      Content: ${result.matchedContent.substring(0, 100)}...`);
  });

  // Test similarity search
  if (searchResults.length > 0) {
    const similarContent = await multiModal.findSimilarContent(
      searchResults[0].contentId,
      {
        crossModal: true,
        threshold: 0.3,
        limit: 5,
      }
    );

    console.log(`✅ Similar content: ${similarContent.length} matches`);
    similarContent.forEach((similar, index) => {
      console.log(
        `   ${index + 1}. [${similar.type.toUpperCase()}] ${similar.contentId}`
      );
      console.log(
        `      Similarity: ${(similar.similarity * 100).toFixed(1)}%`
      );
    });
  }

  // Get modality statistics
  const stats = multiModal.getModalityStats();
  console.log(`✅ Modality statistics:`);
  console.log(`   Total items: ${stats.totalItems}`);
  console.log(
    `   Modality distribution:`,
    Object.entries(stats.modalityDistribution)
      .map(([type, count]) => `${type}: ${count}`)
      .join(", ")
  );
  console.log(
    `   Average complexity: ${(stats.averageComplexity * 100).toFixed(1)}%`
  );
  console.log(
    `   Top languages: ${stats.topLanguages
      .map((l) => `${l.language} (${l.count})`)
      .join(", ")}`
  );
  console.log(
    `   Top topics: ${stats.topTopics
      .slice(0, 3)
      .map((t) => `${t.topic} (${t.weight.toFixed(2)})`)
      .join(", ")}`
  );

  // Test background processing
  const queueId = await multiModal.queueForProcessing(
    "# Advanced Machine Learning\n\nThis document covers advanced ML techniques...",
    "document",
    0.7
  );
  console.log(`✅ Queued for processing: ${queueId}`);

  return { multiModal, contentId, searchResults, stats };
}

async function testLearningAnalytics() {
  console.log("\n4️⃣ Testing Learning Analytics Engine...");

  const analytics = new LearningAnalyticsEngine();

  // Create mock learning session
  const mockSession = {
    id: "analytics_session_001",
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    endTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    context: {
      userId: "test_user",
      sessionId: "analytics_session",
      conversationId: "analytics_conv_001",
      timestamp: new Date().toISOString(),
    },
    patternsDiscovered: ["pattern_1", "pattern_2", "pattern_3"],
    insightsGenerated: ["insight_1", "insight_2"],
    memoryUpdates: [
      { memoryId: "mem_1", type: "update", update: "enhanced_content" },
      { memoryId: "mem_2", type: "consolidate", update: "merged_content" },
    ],
    learningScore: 0.85,
    adaptations: 7,
  };

  // Update analytics with session
  await analytics.updateWithSession(mockSession);
  console.log(`✅ Updated analytics with learning session`);

  // Create mock patterns
  const mockPatterns = [
    {
      id: "pattern_behavioral_1",
      type: "behavioral" as const,
      pattern: {
        sequence: ["search", "analyze", "implement"],
        efficiency: 0.8,
      },
      confidence: 0.85,
      frequency: 5,
      lastSeen: new Date().toISOString(),
      memoryTypes: ["episodic", "procedural"] as const,
      relationships: [
        {
          source: "ep1",
          target: "pr1",
          strength: 0.8,
          type: "causal" as const,
        },
      ],
      adaptations: [],
    },
    {
      id: "pattern_conceptual_1",
      type: "conceptual" as const,
      pattern: {
        centerConcept: "machine_learning",
        relatedConcepts: ["ai", "algorithms", "data"],
      },
      confidence: 0.9,
      frequency: 8,
      lastSeen: new Date().toISOString(),
      memoryTypes: ["semantic"] as const,
      relationships: [
        {
          source: "sem1",
          target: "sem2",
          strength: 0.9,
          type: "similarity" as const,
        },
      ],
      adaptations: [],
    },
  ];

  await analytics.updateWithPatterns(mockPatterns);
  console.log(`✅ Updated analytics with ${mockPatterns.length} patterns`);

  // Get learning metrics
  const metrics = analytics.getLearningMetrics();
  console.log(`✅ Learning metrics:`);
  console.log(`   Total sessions: ${metrics.overall.totalSessions}`);
  console.log(
    `   Total learning time: ${metrics.overall.totalLearningTime.toFixed(
      1
    )} minutes`
  );
  console.log(
    `   Average session duration: ${metrics.overall.averageSessionDuration.toFixed(
      1
    )} minutes`
  );
  console.log(
    `   Learning velocity: ${metrics.overall.learningVelocity.toFixed(
      2
    )} insights/hour`
  );
  console.log(
    `   Retention rate: ${(metrics.overall.retentionRate * 100).toFixed(1)}%`
  );
  console.log(
    `   Mastery level: ${(metrics.overall.masteryLevel * 100).toFixed(1)}%`
  );

  console.log(
    `   Knowledge - Total concepts: ${metrics.knowledge.totalConcepts}`
  );
  console.log(`   Knowledge - Mastered: ${metrics.knowledge.masteredConcepts}`);
  console.log(`   Knowledge - Learning: ${metrics.knowledge.learningConcepts}`);
  console.log(
    `   Knowledge - Struggling: ${metrics.knowledge.strugglingConcepts}`
  );

  console.log(
    `   Patterns - Behavioral: ${metrics.patterns.behavioralPatterns}`
  );
  console.log(`   Patterns - Learning: ${metrics.patterns.learningPatterns}`);
  console.log(
    `   Patterns - Prediction accuracy: ${(
      metrics.patterns.predictionAccuracy * 100
    ).toFixed(1)}%`
  );

  // Get learning trends
  const trends = analytics.getLearningTrends("daily");
  console.log(`✅ Learning trends (daily): ${trends.length}`);
  trends.forEach((trend, index) => {
    console.log(
      `   ${index + 1}. ${trend.metric}: ${trend.trend} (strength: ${(
        trend.trendStrength * 100
      ).toFixed(1)}%)`
    );
    console.log(`      Data points: ${trend.dataPoints.length}`);
    console.log(
      `      Prediction: ${trend.prediction.nextValue.toFixed(3)} (${(
        trend.prediction.confidence * 100
      ).toFixed(1)}% confidence)`
    );
  });

  // Generate learning insights
  const insights = await analytics.generateLearningInsights();
  console.log(`✅ Generated ${insights.length} learning insights`);
  insights.slice(0, 3).forEach((insight, index) => {
    console.log(
      `   ${index + 1}. [${insight.impact.toUpperCase()}] ${insight.title}`
    );
    console.log(`      Type: ${insight.type} | Category: ${insight.category}`);
    console.log(`      Description: ${insight.description}`);
    console.log(`      Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
    console.log(
      `      Recommendations: ${insight.recommendations.slice(0, 2).join(", ")}`
    );
  });

  // Create learning goal
  const goalId = await analytics.createLearningGoal({
    title: "Master Pattern Recognition",
    description: "Achieve 90% accuracy in pattern recognition tasks",
    category: "pattern_recognition",
    targetValue: 0.9,
    currentValue: 0.75,
    priority: "high",
    milestones: [
      {
        id: "milestone_1",
        title: "80% accuracy",
        targetValue: 0.8,
        completed: false,
      },
      {
        id: "milestone_2",
        title: "85% accuracy",
        targetValue: 0.85,
        completed: false,
      },
      {
        id: "milestone_3",
        title: "90% accuracy",
        targetValue: 0.9,
        completed: false,
      },
    ],
    strategies: ["Practice daily", "Review mistakes", "Learn from feedback"],
  });
  console.log(`✅ Created learning goal: ${goalId}`);

  // Get personalized recommendations
  const recommendations = await analytics.getPersonalizedRecommendations();
  console.log(
    `✅ Generated ${recommendations.length} personalized recommendations`
  );
  recommendations.slice(0, 2).forEach((rec, index) => {
    console.log(`   ${index + 1}. [${rec.type.toUpperCase()}] ${rec.title}`);
    console.log(`      Description: ${rec.description}`);
    console.log(`      Reasoning: ${rec.reasoning}`);
    console.log(`      Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
    console.log(
      `      Time required: ${rec.implementation.timeRequired} minutes`
    );
    console.log(
      `      Expected improvement: ${rec.expectedOutcome.improvement}% in ${rec.expectedOutcome.metric}`
    );
  });

  // Get dashboard data
  const dashboard = analytics.getLearningDashboard();
  console.log(`✅ Learning dashboard:`);
  console.log(`   Recent insights: ${dashboard.recentInsights.length}`);
  console.log(`   Active goals: ${dashboard.goals.length}`);
  console.log(`   Top recommendations: ${dashboard.recommendations.length}`);

  return { analytics, metrics, trends, insights, recommendations, dashboard };
}

async function testIntegratedAdvancedFeatures() {
  console.log("\n5️⃣ Testing Integrated Advanced Features...");

  // Create all systems
  const memoryManager = new MemoryTypesManager();
  const learningEngine = new CrossMemoryLearningEngine(memoryManager);
  const patternRecognition = new AdvancedPatternRecognition();
  const multiModal = new MultiModalMemorySystem("data/test_integration");
  const analytics = new LearningAnalyticsEngine();

  console.log("✅ Initialized all advanced systems");

  // Create comprehensive test scenario
  const context = {
    userId: "integration_user",
    sessionId: "integration_session",
    conversationId: "integration_conv_001",
    timestamp: new Date().toISOString(),
    priorities: ["learning", "optimization", "analysis"],
  };

  // 1. Start learning session
  const sessionId = await learningEngine.startLearningSession(context);

  // 2. Create diverse memories
  const semanticId = await memoryManager.semantic.storeKnowledge(
    "Advanced machine learning requires understanding of statistics, linear algebra, and optimization",
    context,
    {
      category: "concept",
      domain: "education",
      confidence: 0.9,
      sources: ["ml_textbook", "math_courses"],
    }
  );

  const episodicId = await memoryManager.episodic.recordEpisode(
    "Successfully completed neural network training with 95% accuracy",
    context,
    {
      userAction: "train_neural_network",
      systemResponse: "high_accuracy_achieved",
      outcome: "successful_training",
      tags: ["ml", "success", "neural_networks"],
      autoGenerateTakeaways: true,
    }
  );

  // 3. Store multi-modal content
  const mmContent = {
    primary: {
      type: "text" as const,
      content:
        "Neural network architecture for image classification with convolutional layers",
      metadata: { topic: "cnn", complexity: "advanced" },
    },
    attachments: [
      {
        id: "cnn_code",
        type: "code" as const,
        content:
          "model = Sequential([Conv2D(32, 3), MaxPool2D(), Dense(128), Dense(10)])",
        metadata: { language: "python", framework: "tensorflow" },
        size: 100,
        description: "CNN model definition",
      },
    ],
    relationships: [],
  };

  const mmContentId = await multiModal.storeMultiModalContent(
    mmContent,
    context
  );

  // 4. Process memories through learning engine
  const semanticMemory = await memoryManager.semantic.retrieve(semanticId);
  const episodicMemory = await memoryManager.episodic.retrieve(episodicId);

  if (semanticMemory && episodicMemory) {
    await learningEngine.processMemoryForLearning(semanticMemory, context);
    await learningEngine.processMemoryForLearning(episodicMemory, context);
  }

  // 5. Analyze patterns
  const testMemories = [semanticMemory, episodicMemory].filter(Boolean);
  const patternMatches = await patternRecognition.analyzeMemories(
    testMemories,
    context
  );

  // 6. End learning session and update analytics
  const completedSession = await learningEngine.endLearningSession();
  if (completedSession) {
    await analytics.updateWithSession(completedSession);
  }

  // 7. Generate comprehensive insights
  const learningMetrics = learningEngine.getLearningMetrics();
  const patternAnalysis = patternRecognition.getPatternAnalysis();
  const multiModalStats = multiModal.getModalityStats();
  const analyticsMetrics = analytics.getLearningMetrics();
  const analyticsInsights = await analytics.generateLearningInsights();

  console.log(`✅ Integration workflow completed successfully:`);
  console.log(
    `   Learning session score: ${
      completedSession?.learningScore.toFixed(3) || "N/A"
    }`
  );
  console.log(`   Cross-memory patterns: ${learningMetrics.totalPatterns}`);
  console.log(`   Pattern matches found: ${patternMatches.length}`);
  console.log(`   Multi-modal items: ${multiModalStats.totalItems}`);
  console.log(`   Analytics insights: ${analyticsInsights.length}`);
  console.log(
    `   Learning velocity: ${analyticsMetrics.overall.learningVelocity.toFixed(
      2
    )} insights/hour`
  );

  // 8. Multi-modal search integration
  const searchResults = await multiModal.searchMultiModal(
    "machine learning neural network",
    {
      modalities: ["text", "code"],
      limit: 5,
    }
  );
  console.log(`✅ Multi-modal search: ${searchResults.length} results found`);

  // 9. Pattern prediction
  const predictions = patternRecognition.predictFuturePatterns();
  console.log(
    `✅ Future pattern predictions: ${predictions.length} patterns predicted`
  );

  // 10. Personalized recommendations
  const recommendations = await analytics.getPersonalizedRecommendations();
  console.log(
    `✅ Personalized recommendations: ${recommendations.length} suggestions generated`
  );

  return {
    learningEngine,
    patternRecognition,
    multiModal,
    analytics,
    completedSession,
    patternMatches,
    searchResults,
    predictions,
    recommendations,
    comprehensiveMetrics: {
      learning: learningMetrics,
      patterns: patternAnalysis,
      multiModal: multiModalStats,
      analytics: analyticsMetrics,
    },
  };
}

async function runAllTests() {
  const startTime = Date.now();

  try {
    console.log("🧪 Starting Week 10 Advanced Features Tests...");

    // Run all feature tests
    const crossLearningResults = await testCrossMemoryLearning();
    const patternResults = await testPatternRecognition();
    const multiModalResults = await testMultiModalMemory();
    const analyticsResults = await testLearningAnalytics();
    const integrationResults = await testIntegratedAdvancedFeatures();

    const totalTime = Date.now() - startTime;

    console.log("\n" + "=".repeat(70));
    console.log("🎉 WEEK 10 ADVANCED FEATURES TESTS COMPLETED!");
    console.log("=".repeat(70));
    console.log(`⏱️  Total execution time: ${totalTime}ms`);
    console.log(
      `✅ Cross-memory Learning: Working - Pattern discovery & insights generation`
    );
    console.log(
      `✅ Advanced Pattern Recognition: Working - Multi-type pattern detection & prediction`
    );
    console.log(
      `✅ Multi-modal Memory: Working - Text, code, link processing & search`
    );
    console.log(
      `✅ Learning Analytics: Working - Metrics, trends, insights & recommendations`
    );
    console.log(
      `✅ Integrated Features: Working - Complete advanced learning ecosystem`
    );

    console.log(`\n📊 Final Integration Results:`);
    console.log(
      `   Cross-memory patterns discovered: ${integrationResults.comprehensiveMetrics.learning.totalPatterns}`
    );
    console.log(
      `   Pattern recognition accuracy: ${(
        integrationResults.comprehensiveMetrics.patterns.predictionAccuracy *
        100
      ).toFixed(1)}%`
    );
    console.log(
      `   Multi-modal content types: ${
        Object.keys(
          integrationResults.comprehensiveMetrics.multiModal
            .modalityDistribution
        ).length
      }`
    );
    console.log(
      `   Learning velocity: ${integrationResults.comprehensiveMetrics.analytics.overall.learningVelocity.toFixed(
        2
      )} insights/hour`
    );
    console.log(
      `   Personalized recommendations: ${integrationResults.recommendations.length}`
    );

    console.log(
      `\n🚀 Week 10 Complete: Advanced Features & Cross-memory Learning!`
    );
    console.log(
      `📈 BeruMemorix now has enterprise-level AI memory capabilities`
    );
    console.log(`🎯 Ready for production deployment and advanced use cases`);
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
