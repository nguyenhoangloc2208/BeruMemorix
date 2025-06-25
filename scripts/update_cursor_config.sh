#!/bin/bash

# Get absolute paths
NPX_PATH=$(which npx)
PROJECT_ROOT=$(pwd)
SERVER_PATH="$PROJECT_ROOT/src/mcp/server.ts"
NODE_VERSION=$(node --version)
NODE_PATH_DIR=$(dirname $(which node))
NODE_MODULES_PATH="$NODE_PATH_DIR/../lib/node_modules"

echo "🔧 Updating Cursor MCP configuration..."
echo "npx path: $NPX_PATH"
echo "Node.js version: $NODE_VERSION"
echo "Project root: $PROJECT_ROOT"
echo "Server path: $SERVER_PATH"

# Create global Cursor config directory if it doesn't exist
CURSOR_CONFIG_DIR="$HOME/.cursor"
mkdir -p "$CURSOR_CONFIG_DIR"

# Check if global mcp.json exists
GLOBAL_MCP_CONFIG="$CURSOR_CONFIG_DIR/mcp.json"

if [ ! -f "$GLOBAL_MCP_CONFIG" ]; then
    echo "Creating new global MCP configuration..."
    cat > "$GLOBAL_MCP_CONFIG" << EOF
{
  "mcpServers": {
    "BeruMemorix": {
      "type": "stdio",
      "command": "$NPX_PATH",
      "args": [
        "-y",
        "tsx",
        "$SERVER_PATH"
      ],
      "env": {
        "NODE_PATH": "$NODE_MODULES_PATH"
      }
    }
  }
}
EOF
else
    echo "⚠️  Global MCP config already exists at: $GLOBAL_MCP_CONFIG"
    echo "Please manually add BeruMemorix configuration:"
    echo ""
    echo "    \"BeruMemorix\": {"
    echo "      \"type\": \"stdio\","
    echo "      \"command\": \"$NPX_PATH\","
    echo "      \"args\": ["
    echo "        \"-y\","
    echo "        \"tsx\","
    echo "        \"$SERVER_PATH\""
    echo "      ],"
    echo "      \"env\": {"
    echo "        \"NODE_PATH\": \"$NODE_MODULES_PATH\""
    echo "      }"
    echo "    }"
    echo ""
fi

echo "✅ Cursor MCP configuration ready!"
echo "📁 Configuration location: $GLOBAL_MCP_CONFIG"
echo ""
echo "🔄 Next steps:"
echo "1. Restart Cursor completely (Cmd+Q then reopen)"
echo "2. BeruMemorix should appear green in MCP settings"
echo "3. Try using: 'store memory' or 'search memory'" 