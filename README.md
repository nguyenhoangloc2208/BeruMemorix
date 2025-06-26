# BeruMemorix 🧠

> **Status: ✅ PRODUCTION READY** - MCP Server với File-based Persistent Storage hoạt động hoàn hảo!

A Model Context Protocol (MCP) memory management system designed for AI interactions in IDEs like Cursor. Features persistent file-based storage that survives restarts.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- Cursor IDE with MCP support

### Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/BeruMemorix/BeruMemorix.git
cd BeruMemorix
```

2. **Install dependencies:**
```bash
npm install
```

3. **Test the system:**
```bash
# Test MCP server functionality
npm run test:mcp

# Test file-based storage
npm run test:storage

# Test optimized 5-tool system
npm run test:optimized

# Validate complete MCP setup  
npm run validate:mcp
```

4. **Add to Cursor MCP configuration:**
Use the automation script to configure Cursor:
```bash
./scripts/update_cursor_config.sh
```

Or manually add BeruMemorix to your global `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "BeruMemorix": {
      "type": "stdio",
      "command": "/Users/your-username/.nvm/versions/node/v20.19.0/bin/npx",
      "args": [
        "-y",
        "tsx", 
        "/full/path/to/BeruMemorix/src/mcp/server.ts"
      ],
      "env": {
        "NODE_PATH": "/Users/your-username/.nvm/versions/node/v20.19.0/lib/node_modules"
      }
    }
  }
}
```

5. **Restart Cursor completely** (not just reload window)

## 🧪 Testing

```bash
# Test MCP server functionality
npm run test:mcp

# Test file-based storage persistence
npm run test:storage

# Test optimized 5-tool system
npm run test:optimized

# Validate complete MCP setup  
npm run validate:mcp

# Start development server
npm run dev
```

## 🔧 Available MCP Tools

BeruMemorix provides **5 optimized memory management tools**:

1. **`store_memory`** - Store a new memory with metadata
2. **`retrieve_memory`** - Retrieve a memory by ID  
3. **`search_memory`** - **Unified search** with exact/fuzzy/auto modes + suggestions
4. **`get_memory_stats`** - Get memory usage statistics
5. **`delete_memory`** - Delete a memory by ID

### 🎯 Search Tool Features

The unified `search_memory` tool combines all search capabilities:

- **Exact Search** (fast, case-insensitive)
- **Fuzzy Search** (typo-tolerant with Levenshtein distance)
- **Auto Mode** (exact first, fuzzy fallback)
- **Smart Suggestions** (when no results found)
- **Advanced Filtering** (by category, tags, limits)
- **Backward Compatibility** (works with legacy search calls)

**Search Options:**
```typescript
{
  query: string,              // Search query (required)
  searchType?: "exact" | "fuzzy" | "auto",  // Search strategy
  fuzzyTolerance?: number,    // 0-1, fuzzy matching tolerance
  includeSuggestions?: boolean, // Generate suggestions if no results
  maxSuggestions?: number,    // Max suggestions to return
  category?: string,          // Filter by category
  tags?: string[],           // Filter by tags
  limit?: number             // Max results (default 10)
}
```

## 💾 Storage System

**File-based Persistent Storage:**
- Memories stored in `data/memories.json`
- Automatic backup on writes
- Survives application restarts
- Fast JSON-based operations
- No external dependencies required

## 💡 Usage in Cursor

Once configured, you can use BeruMemorix directly in Cursor:

- **"store memory: [content]"** - Save important information for later
- **"search memory about [topic]"** - Find previously stored information with smart fuzzy matching
- **"get memory stats"** - View memory usage statistics
- **"retrieve memory [id]"** - Get specific memory by ID

Example:
```
User: "store memory: Remember that I prefer TypeScript over JavaScript for new projects"
AI: *Uses BeruMemorix to store this preference*

User: "search memory about TypeScrpt preferences"  # Note the typo
AI: *Finds the stored preference using fuzzy search*
```

## 🐛 Troubleshooting

If BeruMemorix doesn't appear in Cursor:

1. **Restart Cursor completely** (most common fix)
2. Check other MCP servers are working
3. Verify Node.js version (18+ required): `node --version`
4. Check developer console: `Help > Toggle Developer Tools`
5. Review Cursor MCP logs in `~/.cursor/logs/`
6. Re-run validation: `npm run validate:mcp`

### Common Issues

**"BeruMemorix not found"** 
- Run `npm run validate:mcp` to check configuration
- Ensure working directory paths are correct

**"Command not found: tsx"**
- Script now uses absolute npx path, should work automatically
- Verify Node.js setup: `npx tsx --version`

**"Server not responding"**
- Check if server starts: `npm run mcp`
- Verify JSON-RPC communication works

**"Data not persisting"**
- Check `data/` directory exists and is writable
- Run `npm run test:storage` to verify file operations

## 📁 Project Structure

```
BeruMemorix/
├── src/
│   ├── mcp/
│   │   └── server.ts          # Main MCP server (5 optimized tools)
│   ├── services/
│   │   ├── memory-storage.ts  # File-based storage service
│   │   ├── enhanced-search.ts # Advanced search with fuzzy matching
│   │   └── fuzzy-search.ts    # Levenshtein distance algorithm
│   ├── types/
│   │   └── memory.ts          # Memory type definitions
│   └── utils/
│       └── logger.ts          # Logging utilities
├── data/
│   └── memories.json          # Persistent memory storage
├── scripts/
│   ├── test-mcp.ts           # MCP functionality tests
│   ├── test-file-storage.ts  # Storage system tests
│   ├── test-optimized-tools.ts # 5-tool system tests
│   ├── validate-mcp.ts       # MCP setup validation
│   └── update_cursor_config.sh # Cursor configuration script
└── package.json              # Dependencies and scripts
```

## 🛠 Development

```bash
# Start in development mode
npm run dev

# Run tests
npm test

# Test storage system
npm run test:storage

# Test optimized tools
npm run test:optimized

# Type checking
npm run type-check

# Code formatting
npm run format:write

# Linting
npm run lint:fix
```

## 📊 Features

- ✅ **5 Optimized Tools** - Reduced from 7 to 5 high-quality tools
- ✅ **Unified Search** - Exact, fuzzy, auto modes in one tool
- ✅ **Smart Suggestions** - Auto-complete when no results found
- ✅ **Fuzzy Matching** - Levenshtein distance for typo tolerance
- ✅ **File-based Storage** - Persistent JSON storage
- ✅ **Memory Management** - Store, retrieve, search, delete
- ✅ **Advanced Filtering** - Content, tag, and category-based searching  
- ✅ **Memory Metadata** - Categories, tags, timestamps
- ✅ **Statistics** - Usage tracking and analytics
- ✅ **MCP Integration** - Seamless IDE integration
- ✅ **Restart Persistence** - Data survives application restarts
- ✅ **Backward Compatibility** - Legacy search calls still work
- 🔄 **Vector Search** - Coming soon
- 🔄 **Database Integration** - PostgreSQL option available

## 🏗️ Architecture

**Tool Optimization:**
- **Before**: 7 tools with 3 overlapping search functions
- **After**: 5 tools with 1 unified search tool containing all features
- **Result**: Better UX, less confusion, no feature loss

**Storage Options:**
1. **Current: File-based JSON** - Fast, simple, persistent
2. **Available: PostgreSQL** - Full database with Docker setup
3. **Future: Vector Database** - Semantic search capabilities

**MCP Implementation:**
- Standard JSON-RPC protocol
- 5 core tools for memory management
- Advanced search with fuzzy matching
- Error handling and validation
- Logging and debugging support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the AI development community**

*BeruMemorix - Your AI's persistent memory companion* 🧠✨