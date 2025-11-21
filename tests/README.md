# Integration Tests

Integration tests for the LingQ MCP Server deployment.

## Overview

These tests verify that the Railway-deployed MCP server is working correctly with HTTP Streamable transport and Bearer token authentication.

## Running Tests

### Test Railway Deployment

```bash
pnpm test:railway
```

This tests the production Railway deployment at `https://lingq-mcp-production.up.railway.app/mcp`.

### Test Custom Server

```bash
MCP_SERVER_URL=https://your-server.com/mcp MCP_AUTH_TOKEN=your_token pnpm test:integration
```

## Environment Variables

- `MCP_SERVER_URL` - URL of the MCP server to test (default: Railway production)
- `MCP_AUTH_TOKEN` - Bearer token for authentication (falls back to `AUTH_TOKEN` from .env)

## What's Tested

1. **Connection** - Establishes SSE connection with authentication
2. **List Tools** - Verifies all expected MCP tools are available
3. **Tool Execution** - Calls a simple tool to verify end-to-end functionality

## Expected Output

```
🧪 LingQ MCP Server Integration Tests
Server: https://lingq-mcp-production.up.railway.app/mcp
Auth: Bearer af057409...
---

📡 Connecting to server...
✅ Connected

🔧 Testing tool listing...
✅ Tools listed

🚀 Testing tool execution...
✅ Tool executed

============================================================
TEST RESULTS
============================================================
✅ Connection                                      250ms
✅ List Tools (found 13)                           120ms
✅ Tool Call (lingq_get_languages)                 340ms
============================================================
Total: 3 | Passed: 3 | Failed: 0
============================================================
```

## Troubleshooting

### 401 Unauthorized
- Verify `AUTH_TOKEN` in `.env` matches Railway deployment
- Check Bearer token format in test configuration

### Connection Timeout
- Verify Railway server is running: `curl https://lingq-mcp-production.up.railway.app/health`
- Check firewall/network settings

### Cannot POST /mcp
- Server missing POST endpoint handler
- Rebuild and redeploy server

## Adding New Tests

To add new test cases:

1. Add a new method to `MCPIntegrationTest` class
2. Call it from `runAll()` method
3. Follow the pattern of recording results with timing

Example:

```typescript
async testNewFeature(): Promise<void> {
  const start = Date.now();
  try {
    if (!this.client) throw new Error('Client not connected');

    // Your test logic here

    this.results.push({
      name: 'New Feature Test',
      passed: true,
      duration: Date.now() - start
    });
  } catch (error: any) {
    this.results.push({
      name: 'New Feature Test',
      passed: false,
      duration: Date.now() - start,
      error: error.message
    });
    throw error;
  }
}
```
