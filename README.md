# BeruMemorix 🧠

> **Status: ✅ WORKING** - MCP Server đã hoạt động hoàn hảo!

A Model Context Protocol (MCP) memory management system designed for AI interactions in IDEs like Cursor.

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

3. **Verify MCP setup:**
```bash
npm run validate:mcp
```

4. **Add to Cursor MCP configuration:**
The configuration is already in your `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "BeruMemorix": {
      "command": "/Users/beru/.nvm/versions/node/v20.19.0/bin/npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/Users/beru/Documents/GitHub/BeruMemorix",
      "env": {
        "NODE_ENV": "development",
        "PATH": "/Users/beru/.nvm/versions/node/v20.19.0/bin:/usr/local/bin:/usr/bin:/bin"
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

# Validate complete MCP setup  
npm run validate:mcp

# Start development server
npm run dev
```

## 🔧 Available MCP Tools

BeruMemorix provides 5 memory management tools:

1. **`store_memory`** - Store a new memory with metadata
2. **`retrieve_memory`** - Retrieve a memory by ID  
3. **`search_memory`** - Search memories by content/metadata
4. **`get_memory_stats`** - Get memory usage statistics
5. **`delete_memory`** - Delete a memory by ID

## 💡 Usage in Cursor

Once configured, you can use BeruMemorix directly in Cursor:

- **"store memory"** - Save important information for later
- **"search memory"** - Find previously stored information  
- **"get memory stats"** - View memory usage statistics

Example:
```
User: "store memory: Remember that I prefer TypeScript over JavaScript for new projects"
AI: *Uses BeruMemorix to store this preference*

User: "What are my coding preferences?"  
AI: *Searches BeruMemorix and finds the stored preference*
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
- Configuration uses full npx path, should work automatically
- Verify with: `npx tsx --version`

**"Server not responding"**
- Check if server starts: `npm run mcp`
- Verify JSON-RPC communication works

## 📁 Project Structure

```
BeruMemorix/
├── src/
│   ├── mcp/
│   │   └── server.ts          # Main MCP server implementation
│   ├── types/
│   │   └── memory.ts          # Memory type definitions
│   └── utils/
│       └── logger.ts          # Logging utilities
├── scripts/
│   ├── test-mcp.ts           # MCP functionality tests
│   ├── validate-mcp.ts       # MCP setup validation
│   └── setup-dev.sh          # Development environment setup
└── package.json              # Dependencies and scripts
```

## 🛠 Development

```bash
# Start in development mode
npm run dev

# Run tests
npm test

# Type checking
npm run type-check

# Code formatting
npm run format:write

# Linting
npm run lint:fix
```

## 📊 Features

- ✅ **Memory Storage** - Store text with metadata
- ✅ **Smart Search** - Content and tag-based searching  
- ✅ **Memory Types** - Short-term, long-term, session, persistent
- ✅ **Statistics** - Usage tracking and analytics
- ✅ **MCP Integration** - Seamless IDE integration
- 🔄 **Vector Search** - Coming soon
- 🔄 **Database Persistence** - Coming soon

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