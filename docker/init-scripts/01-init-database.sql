-- BeruMemorix Database Initialization Script
-- This script creates the necessary tables for the memory management system

-- Create enum for memory types
CREATE TYPE memory_type AS ENUM ('short_term', 'long_term', 'session', 'persistent');

-- Create main memories table
CREATE TABLE IF NOT EXISTS memories (
    id VARCHAR(255) PRIMARY KEY,
    type memory_type NOT NULL DEFAULT 'short_term',
    content TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    context TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    importance_score INTEGER DEFAULT 5 CHECK (importance_score >= 0 AND importance_score <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    retention_until TIMESTAMP WITH TIME ZONE,
    is_promoted BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_importance_score ON memories(importance_score);
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memories_last_accessed ON memories(last_accessed);
CREATE INDEX IF NOT EXISTS idx_memories_content_fts ON memories USING GIN(to_tsvector('english', content));

-- Create memory sessions table for session-based memories
CREATE TABLE IF NOT EXISTS memory_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'
);

-- Create memory analytics table
CREATE TABLE IF NOT EXISTS memory_analytics (
    id SERIAL PRIMARY KEY,
    memory_id VARCHAR(255) REFERENCES memories(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'accessed', 'updated', 'deleted', 'promoted'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Insert sample data for testing (optional)
INSERT INTO memories (id, type, content, source, context, tags, importance_score) VALUES
('sample_001', 'short_term', 'User prefers dark mode interface', 'user_preferences', 'UI settings discussion', ARRAY['ui', 'preferences', 'dark_mode'], 7),
('sample_002', 'long_term', 'Project uses TypeScript with strict mode enabled', 'code_analysis', 'Project configuration review', ARRAY['typescript', 'configuration', 'strict'], 9),
('sample_003', 'session', 'Working on memory management feature implementation', 'current_task', 'Development session', ARRAY['development', 'memory', 'feature'], 8);

-- Display setup completion message
SELECT 'BeruMemorix database initialized successfully!' as status;
