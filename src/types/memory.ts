export type MemoryType = 'short_term' | 'long_term' | 'session' | 'persistent';

export interface MemoryMetadata {
  timestamp: Date;
  source: string;
  context: string;
  tags: string[];
  importance_score: number;
  access_count: number;
  last_accessed?: Date;
}

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[];
  expires_at?: Date;
}

export interface CreateMemoryRequest {
  content: string;
  type?: MemoryType;
  source: string;
  context?: string;
  tags?: string[];
  importance_score?: number;
}

export interface SearchMemoryRequest {
  query: string;
  type?: MemoryType;
  limit?: number;
  threshold?: number;
  include_metadata?: boolean;
}

export interface MemorySearchResult {
  memory: Memory;
  similarity_score: number;
  rank: number;
}

export interface MemoryStats {
  total_memories: number;
  by_type: Record<MemoryType, number>;
  storage_used: number;
  avg_importance_score: number;
  most_recent_access: Date;
}

export class MemoryValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    public readonly reason: string
  ) {
    super(`Invalid ${field}: ${String(value)} - ${reason}`);
    this.name = 'MemoryValidationError';
  }
}
