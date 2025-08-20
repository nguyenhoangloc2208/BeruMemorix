/**
 * Memory Types System - Based on Cognitive Science Research
 * Implements 4 types of memory: Working, Episodic, Semantic, Procedural
 */

// Base Memory Item (extends existing)
export interface BaseMemoryItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  lastAccessed: string;
}

// Working Memory - Current conversation and immediate context
export interface WorkingMemoryItem extends BaseMemoryItem {
  type: "working";
  sessionId: string;
  conversationId: string;
  priority: 1 | 2 | 3 | 4 | 5; // 1=highest, 5=lowest
  contextType:
    | "user_query"
    | "system_response"
    | "task_context"
    | "temporary_note";
  expiresAt: string; // Working memory has limited lifespan
  relatedMemoryIds: string[]; // References to other memory types
}

// Episodic Memory - Historical experiences and their takeaways
export interface EpisodicMemoryItem extends BaseMemoryItem {
  type: "episodic";
  episodeId: string;
  timestamp: string; // When the event happened
  context: {
    userAction: string;
    systemResponse: string;
    outcome: "successful" | "failed" | "partial" | "abandoned";
    userFeedback?: "positive" | "negative" | "neutral";
  };
  takeaways: string[]; // What was learned from this episode
  emotions?: "satisfaction" | "frustration" | "confusion" | "discovery";
  tags: string[];
  relatedEpisodes: string[];
}

// Semantic Memory - Knowledge context and factual grounding
export interface SemanticMemoryItem extends BaseMemoryItem {
  type: "semantic";
  category: "fact" | "concept" | "definition" | "relationship" | "rule";
  domain: string; // Subject domain (e.g., 'programming', 'science', 'business')
  confidence: number; // 0-1 confidence in this knowledge
  sources: string[]; // Where this knowledge came from
  relationships: {
    parentConcepts: string[];
    childConcepts: string[];
    relatedConcepts: string[];
  };
  examples: string[];
  lastValidated: string;
}

// Procedural Memory - Rules and skills for interaction
export interface ProceduralMemoryItem extends BaseMemoryItem {
  type: "procedural";
  skillName: string;
  procedure: {
    steps: Array<{
      action: string;
      conditions: string[];
      expectedOutcome: string;
    }>;
    triggers: string[]; // When to use this procedure
    context: string[]; // Situations where this applies
  };
  effectiveness: number; // 0-1 how well this procedure works
  usageCount: number;
  lastUsed: string;
  variations: string[]; // Alternative approaches
  prerequisites: string[]; // What's needed before using this
}

// Union type for all memory types
export type MemoryTypeItem =
  | WorkingMemoryItem
  | EpisodicMemoryItem
  | SemanticMemoryItem
  | ProceduralMemoryItem;

// Memory Type System Configuration
export interface MemoryTypesConfig {
  workingMemory: {
    maxItems: number;
    sessionTTL: number; // Time to live in minutes
    priorities: {
      highPriorityTTL: number;
      lowPriorityTTL: number;
    };
  };
  episodicMemory: {
    maxEpisodes: number;
    consolidationThreshold: number; // After how many similar episodes to create semantic memory
    emotionalWeighting: boolean;
  };
  semanticMemory: {
    confidenceThreshold: number; // Minimum confidence to store
    relationshipDepth: number; // Max depth for concept relationships
    validationInterval: number; // Days between validation checks
  };
  proceduralMemory: {
    effectivenessThreshold: number; // Minimum effectiveness to keep
    usageDecayFactor: number; // How usage count affects retention
    maxVariations: number;
  };
}

// Memory Context for cross-type operations
export interface MemoryContext {
  userId?: string;
  sessionId: string;
  conversationId: string;
  timestamp: string;
  currentTask?: string;
  emotionalState?: string;
  priorities: string[];
}

// Search interfaces for different memory types
export interface WorkingMemorySearch {
  sessionId?: string;
  conversationId?: string;
  priority?: number;
  contextType?: WorkingMemoryItem["contextType"];
  notExpired?: boolean;
}

export interface EpisodicMemorySearch {
  episodeId?: string;
  timeRange?: { start: string; end: string };
  outcome?: EpisodicMemoryItem["context"]["outcome"];
  emotions?: EpisodicMemoryItem["emotions"];
  tags?: string[];
  similarity?: boolean; // Use vector similarity
}

export interface SemanticMemorySearch {
  category?: SemanticMemoryItem["category"];
  domain?: string;
  confidence?: { min: number; max: number };
  relatedTo?: string; // Find concepts related to this
  examples?: boolean; // Include examples in results
}

export interface ProceduralMemorySearch {
  skillName?: string;
  triggers?: string[];
  effectiveness?: { min: number; max: number };
  context?: string[];
  recentlyUsed?: boolean;
}

// Memory operation results
export interface MemoryTypeSearchResult<T extends MemoryTypeItem> {
  items: T[];
  count: number;
  searchType: string;
  executionTime: number;
  context: MemoryContext;
}

// Memory insights and analytics
export interface MemoryTypeAnalytics {
  workingMemory: {
    currentLoad: number;
    averageSessionLength: number;
    priorityDistribution: Record<number, number>;
    contextTypeUsage: Record<string, number>;
  };
  episodicMemory: {
    totalEpisodes: number;
    outcomeDistribution: Record<string, number>;
    emotionalPatterns: Record<string, number>;
    learningRate: number; // How often takeaways are generated
  };
  semanticMemory: {
    knowledgeDomains: Record<string, number>;
    conceptNetwork: {
      nodes: number;
      connections: number;
      averageConfidence: number;
    };
    staleKnowledge: number; // Items needing validation
  };
  proceduralMemory: {
    totalProcedures: number;
    averageEffectiveness: number;
    mostUsedSkills: Array<{ skill: string; usage: number }>;
    improvementOpportunities: string[];
  };
}
