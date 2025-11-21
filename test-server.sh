#!/bin/bash

# Test script for LingQ MCP Server

echo "Testing LingQ MCP Server..."
echo ""

# Check if API key is set
if [ -z "$LINGQ_API_KEY" ]; then
    echo "Error: LINGQ_API_KEY environment variable not set"
    echo "Please set it with: export LINGQ_API_KEY=your_api_key"
    exit 1
fi

# Build the project
echo "Building project..."
pnpm run build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "Build successful!"
echo ""

# Test that the server starts
echo "Testing server startup..."
timeout 5 node dist/index.js 2>&1 | head -1

echo ""
echo "Server test complete!"
echo ""
echo "Next steps:"
echo "1. Add your API key to .env file"
echo "2. Configure Claude Desktop with the server"
echo "3. Restart Claude Desktop"
echo "4. Test by asking: 'Show me my available languages in LingQ'"
