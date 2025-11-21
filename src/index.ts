#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { LingQClient } from './lingq-client.js';
import { authenticateToken } from './auth.js';

// Get environment variables
const API_KEY = process.env.LINGQ_API_KEY;
const TRANSPORT_MODE = process.env.TRANSPORT_MODE || 'http';
const PORT = parseInt(process.env.PORT || '3000', 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || '*';

if (!API_KEY) {
  console.error('Error: LINGQ_API_KEY environment variable is required');
  console.error('Get your API key from: https://www.lingq.com/en/accounts/apikey/');
  process.exit(1);
}

// Validate transport mode
if (TRANSPORT_MODE !== 'stdio' && TRANSPORT_MODE !== 'http') {
  console.error(`Error: TRANSPORT_MODE must be 'stdio' or 'http', got '${TRANSPORT_MODE}'`);
  process.exit(1);
}

// Initialize LingQ client
const lingqClient = new LingQClient({
  apiKey: API_KEY
});

// Define available tools
const tools: Tool[] = [
  {
    name: 'lingq_get_languages',
    description: 'Get a list of available languages for the user in LingQ',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'lingq_create_lesson',
    description: 'Create a new lesson/import content into LingQ from text. Use this to import articles, stories, or any text content for language learning.',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'ISO 639-1 language code (e.g., "ko" for Korean, "ja" for Japanese, "es" for Spanish)'
        },
        title: {
          type: 'string',
          description: 'Title of the lesson'
        },
        text: {
          type: 'string',
          description: 'The text content of the lesson'
        },
        collectionId: {
          type: 'number',
          description: 'Optional: ID of the collection/course to add this lesson to'
        },
        shareStatus: {
          type: 'string',
          enum: ['private', 'shared'],
          description: 'Whether the lesson is private or shared (default: private)'
        },
        originalUrl: {
          type: 'string',
          description: 'Optional: Source URL if importing from web'
        }
      },
      required: ['languageCode', 'title', 'text']
    }
  },
  {
    name: 'lingq_search_cards',
    description: 'Search vocabulary cards (LingQs) with various filters. Use this to find specific vocabulary, check learning status, or get cards to review.',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code (e.g., "ko" for Korean)'
        },
        search: {
          type: 'string',
          description: 'Search term to find in vocabulary'
        },
        searchCriteria: {
          type: 'string',
          enum: ['startsWith', 'contains'],
          description: 'How to match the search term'
        },
        status: {
          type: 'array',
          items: { type: 'number' },
          description: 'Filter by status: 0=New, 1=Recognized, 2=Familiar, 3=Learned, 4=Known, 5=Ignored'
        },
        sort: {
          type: 'string',
          enum: ['date', 'term', 'status'],
          description: 'Sort order for results'
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (default: 1)'
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 15, max: 100)'
        },
        minimal: {
          type: 'boolean',
          description: 'Return minimal data (pk, term, status, tags only) for efficiency (default: true)'
        }
      },
      required: ['languageCode']
    }
  },
  {
    name: 'lingq_get_card',
    description: 'Get detailed information about a specific vocabulary card by ID',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code'
        },
        cardId: {
          type: 'number',
          description: 'The ID of the card to retrieve'
        }
      },
      required: ['languageCode', 'cardId']
    }
  },
  {
    name: 'lingq_update_card',
    description: 'Update a vocabulary card (status, tags, notes). Use this to change learning status or add notes.',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code'
        },
        cardId: {
          type: 'number',
          description: 'The ID of the card to update'
        },
        status: {
          type: 'number',
          description: 'New status: 0=New, 1=Recognized, 2=Familiar, 3=Learned, 4=Known, 5=Ignored'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tags to set on the card (replaces existing tags)'
        },
        notes: {
          type: 'string',
          description: 'Notes/comments for the card'
        }
      },
      required: ['languageCode', 'cardId']
    }
  },
  {
    name: 'lingq_add_tags_to_card',
    description: 'Add tags to a vocabulary card for organization and categorization',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code'
        },
        cardId: {
          type: 'number',
          description: 'The ID of the card'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tags to add'
        }
      },
      required: ['languageCode', 'cardId', 'tags']
    }
  },
  {
    name: 'lingq_review_card',
    description: 'Mark a card as reviewed (updates SRS due date). Use this to track vocabulary review progress.',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code'
        },
        cardId: {
          type: 'number',
          description: 'The ID of the card to review'
        }
      },
      required: ['languageCode', 'cardId']
    }
  },
  {
    name: 'lingq_get_collections',
    description: 'Get list of collections/courses for a language. Use this to find collection IDs for organizing lessons.',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code'
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (default: 1)'
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 15)'
        },
        minimal: {
          type: 'boolean',
          description: 'Return minimal data (pk, title, lessonsCount only) for efficiency (default: true)'
        }
      },
      required: ['languageCode']
    }
  },
  {
    name: 'lingq_get_lessons',
    description: 'Get list of lessons for a language, optionally filtered by collection',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code'
        },
        collectionId: {
          type: 'number',
          description: 'Optional: Filter by collection ID'
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (default: 1)'
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 25)'
        },
        minimal: {
          type: 'boolean',
          description: 'Return minimal data (id, title, collectionId only) for efficiency (default: true)'
        }
      },
      required: ['languageCode']
    }
  },
  {
    name: 'lingq_find_lesson_by_title',
    description: 'Search for a lesson by title with server-side pagination. Returns minimal data. Ideal for checking if a lesson exists before creating.',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code (e.g., "ko" for Korean)'
        },
        title: {
          type: 'string',
          description: 'Lesson title to search for'
        },
        maxPages: {
          type: 'number',
          description: 'Maximum pages to search (default: 20, searches ~1000 lessons)'
        },
        fuzzyMatch: {
          type: 'boolean',
          description: 'Enable fuzzy matching (ignores punctuation, case) (default: false)'
        },
        collectionId: {
          type: 'number',
          description: 'Optional: Narrow search to specific collection'
        }
      },
      required: ['languageCode', 'title']
    }
  },
  {
    name: 'lingq_find_collection_by_title',
    description: 'Search for a collection by title with server-side pagination. Returns minimal data.',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code'
        },
        title: {
          type: 'string',
          description: 'Collection title to search for'
        },
        maxPages: {
          type: 'number',
          description: 'Maximum pages to search (default: 20)'
        },
        fuzzyMatch: {
          type: 'boolean',
          description: 'Enable fuzzy matching (default: false)'
        }
      },
      required: ['languageCode', 'title']
    }
  },
  {
    name: 'lingq_check_lesson_exists',
    description: 'Quick boolean check if a lesson with given title exists. Efficient for n8n workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code'
        },
        title: {
          type: 'string',
          description: 'Lesson title to check'
        },
        maxPages: {
          type: 'number',
          description: 'Maximum pages to search (default: 20)'
        },
        fuzzyMatch: {
          type: 'boolean',
          description: 'Enable fuzzy matching (default: false)'
        },
        collectionId: {
          type: 'number',
          description: 'Optional: Narrow search to specific collection'
        }
      },
      required: ['languageCode', 'title']
    }
  },
  {
    name: 'lingq_get_recent_lessons',
    description: 'Get the most recent N lessons with minimal data. Fast and efficient.',
    inputSchema: {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'Language code'
        },
        limit: {
          type: 'number',
          description: 'Number of recent lessons to retrieve (default: 20, max: 100)'
        }
      },
      required: ['languageCode']
    }
  }
];

// Helper function to set up MCP server request handlers
function setupMCPHandlers(server: Server) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const typedArgs = args as any;

    try {
      switch (name) {
        case 'lingq_get_languages': {
          const languages = await lingqClient.getLanguages();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(languages, null, 2)
              }
            ]
          };
        }

        case 'lingq_create_lesson': {
          const lesson = await lingqClient.createLesson(typedArgs.languageCode, {
            title: typedArgs.title,
            text: typedArgs.text,
            collection: typedArgs.collectionId,
            share_status: typedArgs.shareStatus || 'private',
            original_url: typedArgs.originalUrl
          });
          return {
            content: [
              {
                type: 'text',
                text: `Lesson created successfully!\n\nLesson ID: ${lesson.id}\nTitle: ${lesson.title}\nLanguage: ${typedArgs.languageCode}\nStatus: ${lesson.share_status}\n\nYou can now read this lesson in LingQ and create vocabulary cards.`
              }
            ]
          };
        }

        case 'lingq_search_cards': {
          const minimal = typedArgs.minimal !== undefined ? typedArgs.minimal : true;
          const results = await lingqClient.searchCards(typedArgs.languageCode, {
            search: typedArgs.search,
            search_criteria: typedArgs.searchCriteria,
            status: typedArgs.status,
            sort: typedArgs.sort,
            page: typedArgs.page,
            page_size: typedArgs.pageSize
          }, minimal);

          const summary = `Found ${results.count} cards (showing ${results.results.length})\n\n`;
          const cardList = results.results.map((card: any) =>
            `- ${card.term} (Status: ${card.status}, Tags: ${card.tags?.join(', ') || 'none'})`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: minimal
                  ? summary + cardList
                  : summary + cardList + '\n\n' + JSON.stringify(results, null, 2)
              }
            ]
          };
        }

        case 'lingq_get_card': {
          const card = await lingqClient.getCard(typedArgs.languageCode, typedArgs.cardId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(card, null, 2)
              }
            ]
          };
        }

        case 'lingq_update_card': {
          const updates: any = {};
          if (typedArgs.status !== undefined) updates.status = typedArgs.status;
          if (typedArgs.tags !== undefined) updates.tags = typedArgs.tags;
          if (typedArgs.notes !== undefined) updates.notes = typedArgs.notes;

          const card = await lingqClient.updateCard(
            typedArgs.languageCode,
            typedArgs.cardId,
            updates
          );
          return {
            content: [
              {
                type: 'text',
                text: `Card updated successfully!\n\nTerm: ${card.term}\nStatus: ${card.status}\nTags: ${card.tags.join(', ')}\n\n${JSON.stringify(card, null, 2)}`
              }
            ]
          };
        }

        case 'lingq_add_tags_to_card': {
          const card = await lingqClient.addTagsToCard(
            typedArgs.languageCode,
            typedArgs.cardId,
            typedArgs.tags
          );
          return {
            content: [
              {
                type: 'text',
                text: `Tags added successfully!\n\nTerm: ${card.term}\nTags: ${card.tags.join(', ')}`
              }
            ]
          };
        }

        case 'lingq_review_card': {
          const result = await lingqClient.reviewCard(
            typedArgs.languageCode,
            typedArgs.cardId
          );
          return {
            content: [
              {
                type: 'text',
                text: `Card reviewed!\n\nNext review date: ${result.srs_due_date}\nStatus changed: ${result.status_changed_date}`
              }
            ]
          };
        }

        case 'lingq_get_collections': {
          const minimal = typedArgs.minimal !== undefined ? typedArgs.minimal : true;
          const response = await lingqClient.getCollections(
            typedArgs.languageCode,
            typedArgs.page,
            typedArgs.pageSize,
            minimal
          );
          const summary = `Found ${response.count} collections (showing ${response.results.length})\n\n`;
          const collectionList = response.results.map((c: any) =>
            `- ${c.title} (ID: ${c.pk})`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: minimal
                  ? summary + collectionList
                  : summary + collectionList + '\n\n' + JSON.stringify(response, null, 2)
              }
            ]
          };
        }

        case 'lingq_get_lessons': {
          const minimal = typedArgs.minimal !== undefined ? typedArgs.minimal : true;
          const results = await lingqClient.getLessons(
            typedArgs.languageCode,
            typedArgs.collectionId,
            typedArgs.page,
            typedArgs.pageSize,
            minimal
          );

          const summary = `Found ${results.count} lessons (showing ${results.results.length})\n\n`;
          const lessonList = results.results.map((l: any) =>
            `- ${l.title} (ID: ${l.id})`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: minimal
                  ? summary + lessonList
                  : summary + lessonList + '\n\n' + JSON.stringify(results, null, 2)
              }
            ]
          };
        }

        case 'lingq_find_lesson_by_title': {
          const result = await lingqClient.findLessonByTitle(
            typedArgs.languageCode,
            typedArgs.title,
            {
              maxPages: typedArgs.maxPages,
              fuzzyMatch: typedArgs.fuzzyMatch,
              collectionId: typedArgs.collectionId
            }
          );

          if (result.found) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Lesson found!\n\nTitle: ${result.title}\nLesson ID: ${result.lessonId}\nCollection ID: ${result.collectionId || 'none'}`
                }
              ]
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `No lesson found with title "${typedArgs.title}"`
                }
              ]
            };
          }
        }

        case 'lingq_find_collection_by_title': {
          const result = await lingqClient.findCollectionByTitle(
            typedArgs.languageCode,
            typedArgs.title,
            {
              maxPages: typedArgs.maxPages,
              fuzzyMatch: typedArgs.fuzzyMatch
            }
          );

          if (result.found) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Collection found!\n\nTitle: ${result.title}\nCollection ID: ${result.collectionId}`
                }
              ]
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `No collection found with title "${typedArgs.title}"`
                }
              ]
            };
          }
        }

        case 'lingq_check_lesson_exists': {
          const exists = await lingqClient.checkLessonExists(
            typedArgs.languageCode,
            typedArgs.title,
            {
              maxPages: typedArgs.maxPages,
              fuzzyMatch: typedArgs.fuzzyMatch,
              collectionId: typedArgs.collectionId
            }
          );

          return {
            content: [
              {
                type: 'text',
                text: exists
                  ? `Lesson "${typedArgs.title}" exists`
                  : `Lesson "${typedArgs.title}" does not exist`
              }
            ]
          };
        }

        case 'lingq_get_recent_lessons': {
          const lessons = await lingqClient.getRecentLessons(
            typedArgs.languageCode,
            typedArgs.limit
          );

          const summary = `Retrieved ${lessons.length} recent lessons\n\n`;
          const lessonList = lessons.map(l =>
            `- ${l.title} (ID: ${l.id})`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: summary + lessonList
              }
            ]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  });
}

// Create Express app (only for HTTP mode)
const app = express();

// Trust proxy - required for Railway and other hosting platforms
// This allows express-rate-limit to correctly identify users behind proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/mcp', limiter);

app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Store active MCP server instances by session ID
const mcpServers = new Map<string, Server>();

// MCP SSE endpoint - GET (establish SSE stream)
app.get('/mcp', authenticateToken, async (req, res) => {
  console.log('New MCP SSE connection established');

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Create MCP server instance for this connection
  const server = new Server(
    {
      name: 'lingq-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Set up request handlers
  setupMCPHandlers(server);

  // Create SSE transport for this connection
  const transport = new SSEServerTransport('/mcp', res);
  await server.connect(transport);

  // Get session ID from the query parameter
  const sessionId = transport.sessionId;
  if (sessionId) {
    mcpServers.set(sessionId, server);
    console.log(`Stored server instance for session: ${sessionId}`);
  }

  // Handle client disconnect
  req.on('close', () => {
    console.log('MCP SSE connection closed');
    if (sessionId) {
      mcpServers.delete(sessionId);
      console.log(`Removed server instance for session: ${sessionId}`);
    }
  });
});

// MCP SSE endpoint - POST (send messages)
app.post('/mcp', authenticateToken, async (req, res) => {
  console.log('Received MCP POST request');

  try {
    // The SSE transport should handle this automatically
    // Just acknowledge the receipt
    res.status(202).json({ status: 'accepted' });
  } catch (error: any) {
    console.error('Error handling MCP POST:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server based on transport mode
if (TRANSPORT_MODE === 'stdio') {
  // Stdio mode: For local Claude Desktop integration
  console.error('Starting LingQ MCP Server in stdio mode...');
  console.error('Note: AUTH_TOKEN not required in stdio mode (local only)');

  const server = new Server(
    {
      name: 'lingq-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Set up request handlers
  setupMCPHandlers(server);

  // Connect via stdio
  const transport = new StdioServerTransport();
  server.connect(transport).then(() => {
    console.error('LingQ MCP Server running on stdio');
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else {
  // HTTP mode: For Railway/n8n integration
  console.log('Starting LingQ MCP Server in HTTP mode...');

  app.listen(PORT, () => {
    console.log(`LingQ MCP Server running on port ${PORT}`);
    console.log(`Transport mode: HTTP/SSE`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp (requires authentication)`);
  });
}
