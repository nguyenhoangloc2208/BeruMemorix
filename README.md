# BeruMemorix - MCP Memory Management System

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)

BeruMemorix là một MCP (Model Context Protocol) server để quản lý bộ nhớ AI trong các IDE, với hỗ trợ đầy đủ cho TablePlus để quản lý cơ sở dữ liệu.

## ✨ Tính năng

- 🧠 **Quản lý bộ nhớ thông minh**: Short-term, long-term, session, và persistent memories
- 📊 **Analytics tích hợp**: Theo dõi việc sử dụng và hiệu suất bộ nhớ
- 🔍 **Tìm kiếm semantic**: Sử dụng Qdrant vector database
- 💎 **TablePlus Ready**: Cấu hình tối ưu cho TablePlus users
- 🐳 **Docker Support**: Setup development dễ dàng
- 🔒 **Type Safe**: Full TypeScript với strict mode
- ⚡ **Performance**: Redis caching và PostgreSQL indexing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop
- TablePlus (tùy chọn)

### 1. Installation

```bash
git clone https://github.com/BeruMemorix/BeruMemorix.git
cd BeruMemorix
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Setup development environment (starts databases)
npm run setup:dev
```

### 3. TablePlus Connection

Mở TablePlus và tạo connection mới:

```
Type: PostgreSQL
Host: localhost
Port: 5432
Username: postgres
Password: your_secure_password
Database: beru_memorix
```

### 4. Start MCP Server

```bash
# Test server functionality
npm run test

# Start MCP server
npm run mcp
```

## 🏗️ Architecture

```
BeruMemorix/
├── src/
│   ├── mcp/           # MCP Server implementation
│   ├── types/         # TypeScript type definitions
│   ├── config/        # Configuration management
│   ├── utils/         # Utility functions
│   └── server.ts      # Main server entry point
├── docker/            # Docker configuration
│   ├── docker-compose.yml
│   └── init-scripts/  # Database initialization
├── scripts/           # Development scripts
└── tests/             # Test suites
```

## 🗄️ Database Schema

### Memories Table
```sql
CREATE TABLE memories (
    id VARCHAR(255) PRIMARY KEY,
    type memory_type NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    context TEXT,
    tags TEXT[],
    importance_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER,
    metadata JSONB
);
```

### Viewing Data in TablePlus

1. Connect to your PostgreSQL database
2. Navigate to `memories` table
3. Use SQL queries to filter and analyze data:

```sql
-- Most important memories
SELECT * FROM memories ORDER BY importance_score DESC LIMIT 10;

-- Recent memories
SELECT * FROM memories ORDER BY created_at DESC LIMIT 20;

-- Search by tags
SELECT * FROM memories WHERE 'typescript' = ANY(tags);

-- Memory stats by type
SELECT type, COUNT(*), AVG(importance_score) 
FROM memories GROUP BY type;
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev           # Start with hot reload
npm run build         # Build for production
npm run start         # Start production server

# Testing
npm run test          # Run tests
npm run test:coverage # Run with coverage
npm run test:ui       # Open test UI

# Code Quality
npm run lint          # Lint code
npm run format        # Format code
npm run check         # Run all checks

# Database
npm run setup:dev     # Setup development environment
npm run mcp           # Start MCP server
```

### Project Structure

```typescript
// MCP Tools Available
export interface MCPTools {
  store_memory: (request: CreateMemoryRequest) => Promise<Memory>;
  retrieve_memory: (id: string) => Promise<Memory>;
  search_memory: (query: SearchMemoryRequest) => Promise<MemorySearchResult[]>;
  get_memory_stats: () => Promise<MemoryStats>;
  delete_memory: (id: string) => Promise<void>;
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | Database name | `beru_memorix` |
| `REDIS_HOST` | Redis host | `localhost` |
| `QDRANT_URL` | Qdrant URL | `http://localhost:6333` |

### Database Services

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Stop all services
docker-compose -f docker/docker-compose.yml down

# View logs
docker-compose -f docker/docker-compose.yml logs -f
```

## 📊 Monitoring & Analytics

### TablePlus Queries

```sql
-- Performance analysis
SELECT 
  type,
  COUNT(*) as total_memories,
  AVG(access_count) as avg_access,
  AVG(importance_score) as avg_importance
FROM memories 
GROUP BY type;

-- Recent activity
SELECT 
  id,
  content,
  last_accessed,
  access_count
FROM memories 
ORDER BY last_accessed DESC 
LIMIT 10;
```

### Service Health Check

```bash
# Check PostgreSQL
docker exec beru_memorix_postgres pg_isready -U postgres

# Check Redis
docker exec beru_memorix_redis redis-cli ping

# Check Qdrant
curl http://localhost:6333/health
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [TablePlus](https://tableplus.com/) - Database management tool
- [TypeScript](https://www.typescriptlang.org/) - Language and tooling
- [Biome](https://biomejs.dev/) - Code quality tools

---

**Made with ❤️ for TablePlus users and AI developers**