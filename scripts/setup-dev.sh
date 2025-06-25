#!/bin/bash

# BeruMemorix Development Setup Script
# This script sets up the development environment for TablePlus users

set -e

echo "🚀 Setting up BeruMemorix development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
        echo "💡 Please update .env with your specific configuration"
    else
        echo "❌ .env.example not found. Please create it first."
        exit 1
    fi
fi

# Start database services
echo "🐳 Starting database services with Docker Compose..."
cd docker && docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec beru_memorix_postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
until docker exec beru_memorix_redis redis-cli ping > /dev/null 2>&1; do
    echo "   Waiting for Redis..."
    sleep 2
done

echo "✅ Redis is ready!"

# Wait for Qdrant to be ready
echo "⏳ Waiting for Qdrant to be ready..."
until curl -f http://localhost:6333/ > /dev/null 2>&1; do
    echo "   Waiting for Qdrant..."
    sleep 2
done

echo "✅ Qdrant is ready!"

cd ..

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "�� TablePlus Connection Details:"
echo "   Type: PostgreSQL"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Username: postgres"
echo "   Password: your_secure_password"
echo "   Database: beru_memorix"
echo ""
echo "🔧 Next steps:"
echo "   1. Open TablePlus and create a new PostgreSQL connection"
echo "   2. Use the connection details above"
echo "   3. Run 'npm run dev' to start the MCP server"
echo "   4. Check the 'memories' table to see sample data"
echo ""
echo "📊 Service URLs:"
echo "   PostgreSQL: localhost:5432"
echo "   Redis: localhost:6379"
echo "   Qdrant: http://localhost:6333"
