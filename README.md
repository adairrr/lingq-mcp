# LingQ MCP Server

A Model Context Protocol (MCP) server for LingQ API integration, enabling AI agents and automation workflows to manage language learning content.

**Primary Use Cases:**
- **n8n workflows**: Automated Korean text import and content management
- **Claude Code**: AI-powered language learning assistant with direct LingQ access
- **API automation**: Programmatic lesson creation and vocabulary management

## Features

- **Dual Transport Modes**: stdio for local development, HTTP/SSE for remote n8n integration
- **13 MCP Tools**: Complete LingQ API coverage including lessons, vocabulary, and collections
- **Optimized for AI**: Minimal mode reduces token usage by 70-90%
- **Meta Search Functions**: Server-side pagination for efficient lesson/collection searches
- **Production Ready**: Railway deployment with Bearer token auth, CORS, rate limiting
- **TypeScript**: Full type safety with ES modules

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- LingQ API key from https://www.lingq.com/en/accounts/apikey/

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lingq-mcp.git
cd lingq-mcp

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
# Edit .env and add your LINGQ_API_KEY
```

### Local Development

```bash
# Build the project
pnpm run build

# Test the server
TRANSPORT_MODE=stdio node dist/index.js
```

## Configuration

### Railway Deployment (n8n Integration)

The server runs in **HTTP mode** (default) for remote access via n8n.

#### 1. Deploy to Railway

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/lingq-mcp.git
git push -u origin main
```

- Go to https://railway.app
- Create "New Project" → "Deploy from GitHub repo"
- Select your repository
- Railway auto-detects Node.js

#### 2. Configure Environment Variables

In Railway dashboard → Variables:

```bash
LINGQ_API_KEY=your_lingq_api_key
AUTH_TOKEN=your_secure_random_token  # Generate with: openssl rand -hex 32
NODE_ENV=production
```

#### 3. Use with n8n

In n8n, add an "MCP Tool" node:
- **URL**: `https://your-app.railway.app/mcp`
- **Authentication**: Bearer Token
- **Token**: Your `AUTH_TOKEN` value
- **Tool**: Select any of the 13 available MCP tools

**Health Check**: `https://your-app.railway.app/health` (no auth required)

## Environment Variables

### Required (All Modes)
- `LINGQ_API_KEY` - Your LingQ API key

### Required (HTTP Mode Only)
- `AUTH_TOKEN` - Bearer token for server authentication

### Optional
- `TRANSPORT_MODE` - `stdio` (local) or `http` (remote, default)
- `PORT` - Server port (default: 3000, Railway sets automatically)
- `NODE_ENV` - Set to `production` in Railway
- `ALLOWED_ORIGINS` - Comma-separated CORS origins (default: all)

## Available MCP Tools

### Core Operations
- `lingq_get_languages` - List available languages
- `lingq_create_lesson` - Import text content into LingQ
- `lingq_get_card` - Get vocabulary card details by ID
- `lingq_update_card` - Update card status/tags/notes
- `lingq_add_tags_to_card` - Add tags for organization
- `lingq_review_card` - Mark card as reviewed (SRS)

### List/Search Operations
- `lingq_search_cards` - Search vocabulary with filters (supports minimal mode)
- `lingq_get_collections` - List collections/courses (supports minimal mode)
- `lingq_get_lessons` - List lessons with pagination (supports minimal mode)

### Meta Search Functions (Optimized for n8n)
- `lingq_find_lesson_by_title` - Server-side title search (96% token savings)
- `lingq_find_collection_by_title` - Server-side collection search
- `lingq_check_lesson_exists` - Fast boolean existence check
- `lingq_get_recent_lessons` - Get N most recent lessons (minimal data)

### Minimal Mode

All list/search operations default to `minimal: true`, reducing token usage by 70-90%:

```typescript
// Default: minimal mode (only essential fields)
lingq_get_lessons({ languageCode: "ko" })
// Returns: { id, title, collectionId, pubDate, status }

// Full mode (all 45+ fields)
lingq_get_lessons({ languageCode: "ko", minimal: false })
```

## Example n8n Workflows

### Simple Import
```
HTTP Request → MCP Tool (lingq_create_lesson) → Success Notification
```

### Smart Import with Duplicate Detection
```
1. HTTP Request (fetch article)
2. Extract Title & Text
3. MCP Tool (lingq_find_lesson_by_title)
   └─ If found: Skip
   └─ If not found: Continue
4. MCP Tool (lingq_find_collection_by_title)
5. MCP Tool (lingq_create_lesson) with collectionId
6. Success Notification
```

### Bulk Import
```
1. Read CSV/JSON (articles)
2. Loop each item
3. MCP Tool (lingq_check_lesson_exists)
4. If not exists: MCP Tool (lingq_create_lesson)
5. Update tracking sheet
```

## Language & Status Codes

### Language Codes (ISO 639-1)
- `ko` - Korean
- `ja` - Japanese
- `zh` - Chinese
- `es` - Spanish
- `fr` - French
- `de` - German

### Vocabulary Status Codes
- `0` - New (never seen)
- `1` - Recognized (seen, not familiar)
- `2` - Familiar (somewhat known)
- `3` - Learned (well known)
- `4` - Known (mastered)
- `5` - Ignored (not tracking)

## Architecture

**Module Structure:**
```
src/
├── types.ts         - TypeScript interfaces
├── lingq-client.ts  - LingQ API client (v2 & v3)
├── auth.ts          - Bearer token middleware
└── index.ts         - Express server + MCP handler
```

**Transport Modes:**
- **stdio**: Local stdin/stdout for development (no auth)
- **http**: HTTP/SSE for remote access (Bearer token required)

**Security (HTTP Mode):**
- Helmet security headers
- CORS with configurable origins
- Rate limiting (100 req/15min per IP)
- Bearer token authentication

## Tech Stack

- TypeScript with ES Modules
- Node.js runtime
- MCP SDK v1.22.0
- Express.js (HTTP server)
- Axios (HTTP client)
- LingQ API v2 & v3

## Development

```bash
# Build
pnpm run build

# Watch mode
pnpm run watch

# Build and run
pnpm run dev
```

## Troubleshooting

### Server not starting
- Verify `LINGQ_API_KEY` is set
- Check logs for TypeScript errors
- Run `pnpm run build` to recompile

### 401 Unauthorized (Railway)
- Verify `AUTH_TOKEN` matches n8n config
- Check header format: `Authorization: Bearer TOKEN`

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [LingQ API Forum](https://forum.lingq.com/c/lingq-developer-forum/43)
- [LingQ API Key](https://www.lingq.com/en/accounts/apikey/)
- [Railway Deployment](https://railway.app)

## License

MIT

---

**Last Updated**: 2025-11-20
**MCP SDK**: v1.22.0
**LingQ API**: v2 & v3
