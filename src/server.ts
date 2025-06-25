#!/usr/bin/env node

import { appConfig } from '@/config';
import { BeruMemorixServer } from '@/mcp/server';
import { logger } from '@/utils/logger';

async function main(): Promise<void> {
  try {
    logger.info('Starting BeruMemorix MCP Server...', {
      version: '1.0.0',
      environment: appConfig.server.environment,
      port: appConfig.server.port,
    });

    const server = new BeruMemorixServer();
    await server.start();

    // Graceful shutdown handling
    const handleShutdown = (signal: string): void => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      process.exit(0);
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error in main', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  });
}

export { main };
