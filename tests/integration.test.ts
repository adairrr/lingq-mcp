#!/usr/bin/env node
/**
 * Integration Test for LingQ MCP Server
 *
 * Tests the Railway deployment with HTTP/SSE transport and Bearer token authentication.
 *
 * Usage:
 *   pnpm test:integration
 *
 * Environment Variables:
 *   MCP_SERVER_URL - URL of the MCP server (default: https://lingq-mcp-production.up.railway.app/mcp)
 *   MCP_AUTH_TOKEN - Bearer token for authentication (default: from .env)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Configuration from environment variables
const SERVER_URL = process.env.MCP_SERVER_URL || 'https://lingq-mcp-production.up.railway.app/mcp';
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN || '';

if (!AUTH_TOKEN) {
  console.error('❌ Error: MCP_AUTH_TOKEN or AUTH_TOKEN environment variable is required');
  console.error('Set it with: export MCP_AUTH_TOKEN="your_token_here"');
  process.exit(1);
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class MCPIntegrationTest {
  private client: Client | null = null;
  private results: TestResult[] = [];

  constructor(
    private serverUrl: string,
    private authToken: string
  ) {}

  /**
   * Custom fetch function that includes Bearer token authentication
   */
  private createAuthFetch() {
    return async (url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      headers.set('Authorization', `Bearer ${this.authToken}`);
      headers.set('Accept', 'text/event-stream');

      return fetch(url, {
        ...init,
        headers
      });
    };
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    const start = Date.now();
    try {
      this.client = new Client(
        {
          name: 'integration-test-client',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      const transport = new SSEClientTransport(
        new URL(this.serverUrl),
        {
          eventSourceInit: {
            fetch: this.createAuthFetch()
          }
        }
      );

      await this.client.connect(transport);

      this.results.push({
        name: 'Connection',
        passed: true,
        duration: Date.now() - start
      });
    } catch (error: any) {
      this.results.push({
        name: 'Connection',
        passed: false,
        duration: Date.now() - start,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Test listing available tools
   */
  async testListTools(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.client) throw new Error('Client not connected');

      const response = await this.client.listTools();

      if (response.tools.length === 0) {
        throw new Error('No tools returned');
      }

      // Verify expected tools exist
      const expectedTools = [
        'lingq_get_languages',
        'lingq_create_lesson',
        'lingq_search_cards',
        'lingq_get_collections',
        'lingq_get_lessons'
      ];

      const toolNames = response.tools.map((t: any) => t.name);
      const missingTools = expectedTools.filter(name => !toolNames.includes(name));

      if (missingTools.length > 0) {
        throw new Error(`Missing expected tools: ${missingTools.join(', ')}`);
      }

      this.results.push({
        name: `List Tools (found ${response.tools.length})`,
        passed: true,
        duration: Date.now() - start
      });
    } catch (error: any) {
      this.results.push({
        name: 'List Tools',
        passed: false,
        duration: Date.now() - start,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Test calling a simple tool
   */
  async testToolCall(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.client) throw new Error('Client not connected');

      const result = await this.client.callTool({
        name: 'lingq_get_languages',
        arguments: {}
      });

      if (!result.content || result.content.length === 0) {
        throw new Error('No content returned from tool call');
      }

      this.results.push({
        name: 'Tool Call (lingq_get_languages)',
        passed: true,
        duration: Date.now() - start
      });
    } catch (error: any) {
      this.results.push({
        name: 'Tool Call',
        passed: false,
        duration: Date.now() - start,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Close the connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  /**
   * Print test results
   */
  printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${icon} ${result.name.padEnd(40)} ${duration.padStart(8)}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('='.repeat(60));
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(60));
  }

  /**
   * Run all tests
   */
  async runAll(): Promise<boolean> {
    console.log('🧪 LingQ MCP Server Integration Tests');
    console.log('Server:', this.serverUrl);
    console.log('Auth:', this.authToken ? `Bearer ${this.authToken.slice(0, 8)}...` : 'None');
    console.log('---\n');

    try {
      console.log('📡 Connecting to server...');
      await this.connect();
      console.log('✅ Connected\n');

      console.log('🔧 Testing tool listing...');
      await this.testListTools();
      console.log('✅ Tools listed\n');

      console.log('🚀 Testing tool execution...');
      await this.testToolCall();
      console.log('✅ Tool executed\n');

      await this.disconnect();

      this.printResults();
      return this.results.every(r => r.passed);
    } catch (error: any) {
      console.error('\n❌ Tests failed:', error.message);
      await this.disconnect();
      this.printResults();
      return false;
    }
  }
}

// Run tests
const test = new MCPIntegrationTest(SERVER_URL, AUTH_TOKEN);
test.runAll().then(success => {
  process.exit(success ? 0 : 1);
});
