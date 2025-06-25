import { config } from 'dotenv';

// Load environment variables
config();

export interface DatabaseConfig {
  postgres: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string | undefined;
    db: number;
  };
  qdrant: {
    url: string;
    apiKey?: string | undefined;
  };
}

export interface ServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'production' | 'test';
  cors: {
    enabled: boolean;
    origins: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface MemoryConfig {
  defaultType: 'short_term' | 'long_term';
  retentionPeriods: {
    short_term: number; // milliseconds
    session: number;
  };
  embeddingDimensions: number;
  maxMemorySize: number; // bytes
  autoPromotionThreshold: number;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  memory: MemoryConfig;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'simple';
  };
}

const createConfig = (): AppConfig => ({
  server: {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
    environment: (process.env.NODE_ENV as AppConfig['server']['environment']) || 'development',
    cors: {
      enabled: process.env.CORS_ENABLED === 'true',
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    },
    rateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
  },
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'beru_memorix',
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      ssl: process.env.POSTGRES_SSL === 'true',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB) || 0,
    },
    qdrant: {
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY || undefined,
    },
  },
  memory: {
    defaultType: (process.env.DEFAULT_MEMORY_TYPE as MemoryConfig['defaultType']) || 'short_term',
    retentionPeriods: {
      short_term: Number(process.env.SHORT_TERM_RETENTION_MS) || 24 * 60 * 60 * 1000, // 24 hours
      session: Number(process.env.SESSION_RETENTION_MS) || 60 * 60 * 1000, // 1 hour
    },
    embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS) || 384,
    maxMemorySize: Number(process.env.MAX_MEMORY_SIZE) || 1024 * 1024, // 1MB
    autoPromotionThreshold: Number(process.env.AUTO_PROMOTION_THRESHOLD) || 5,
  },
  logging: {
    level: (process.env.LOG_LEVEL as AppConfig['logging']['level']) || 'info',
    format: (process.env.LOG_FORMAT as AppConfig['logging']['format']) || 'json',
  },
});

export const appConfig = createConfig();

export { createConfig };
