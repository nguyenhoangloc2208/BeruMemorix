#!/bin/bash

# Get absolute paths
NODE_PATH=$(which node)
PROJECT_ROOT=$(pwd)
TSX_PATH="$PROJECT_ROOT/node_modules/.bin/tsx"
SERVER_PATH="$PROJECT_ROOT/src/mcp/server.ts"

echo "🔧 Updating Cursor MCP configuration..."
echo "Node.js path: $NODE_PATH"
echo "Project root: $PROJECT_ROOT"
echo "Server path: $SERVER_PATH"

# Create .cursor directory if it doesn't exist
mkdir -p .cursor

# Create mcp.json with absolute paths
cat > .cursor/mcp.json << EOF
{
  "mcpServers": {
    "BeruMemorix Memory Server": {
      "command": "$NODE_PATH",
      "args": ["$TSX_PATH", "$SERVER_PATH"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
EOF

echo "✅ Cursor MCP configuration updated!"
echo "📁 Configuration saved to: $PROJECT_ROOT/.cursor/mcp.json"
echo ""
echo "🔄 Next steps:"
echo "1. Restart Cursor completely"
echo "2. Open this project in Cursor"
echo "3. Try using memory commands like 'store memory' or 'search memory'" 