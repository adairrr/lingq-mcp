# LingQ MCP Server

MCP server for LingQ API integration, enabling AI agents to manage language learning content.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Get your LingQ API key from: https://www.lingq.com/en/accounts/apikey/

3. Create `.env` file:
```bash
cp .env.example .env
# Edit .env and add your API key
```

4. Build the project:
```bash
pnpm run build
```

5. Test the server:
```bash
pnpm start
```

## Configuration for Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "lingq": {
      "command": "node",
      "args": ["/absolute/path/to/lingq-mcp-server/dist/index.js"],
      "env": {
        "LINGQ_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools

- `lingq_get_languages` - Get available languages
- `lingq_create_lesson` - Create lesson from text
- `lingq_search_cards` - Search vocabulary cards
- `lingq_get_card` - Get card details
- `lingq_update_card` - Update card properties
- `lingq_add_tags_to_card` - Add tags to card
- `lingq_review_card` - Mark card as reviewed
- `lingq_get_collections` - Get collections/courses
- `lingq_get_lessons` - Get lessons list

## Language Codes

Common codes: `ko` (Korean), `ja` (Japanese), `zh` (Chinese), `es` (Spanish), `fr` (French)

## Status Codes

- 0: New
- 1: Recognized
- 2: Familiar
- 3: Learned
- 4: Known
- 5: Ignored
