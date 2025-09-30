#!/usr/bin/env node

/**
 * ContextDS MCP Server Wrapper
 *
 * This wrapper enables Claude Desktop and other MCP clients to communicate
 * with the ContextDS API for design token extraction and analysis.
 *
 * Usage:
 *   Add to Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "contextds": {
 *         "command": "node",
 *         "args": ["/path/to/mcp-server-wrapper.js"],
 *         "env": {
 *           "CONTEXTDS_API_KEY": "your-key",
 *           "CONTEXTDS_API_URL": "http://localhost:3000/api/mcp"
 *         }
 *       }
 *     }
 *   }
 */

const { stdin, stdout, stderr } = require('process');
const https = require('https');
const http = require('http');

const API_KEY = process.env.CONTEXTDS_API_KEY;
const API_URL = process.env.CONTEXTDS_API_URL || 'https://contextds.com/api/mcp';
const DEBUG = process.env.CONTEXTDS_DEBUG === 'true';

if (!API_KEY) {
  stderr.write('ERROR: CONTEXTDS_API_KEY environment variable is required\n');
  process.exit(1);
}

if (DEBUG) {
  stderr.write(`ContextDS MCP Server initialized\n`);
  stderr.write(`API URL: ${API_URL}\n`);
}

let buffer = '';

stdin.setEncoding('utf8');

stdin.on('data', async (chunk) => {
  buffer += chunk;

  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const request = JSON.parse(line);

      if (DEBUG) {
        stderr.write(`Received: ${request.method}\n`);
      }

      // Handle MCP protocol methods
      if (request.method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '0.1.0',
            serverInfo: {
              name: 'contextds',
              version: '1.0.0'
            },
            capabilities: {
              tools: {}
            }
          }
        };
        stdout.write(JSON.stringify(response) + '\n');
      }

      else if (request.method === 'tools/list') {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              {
                name: 'scan_tokens',
                description: 'Extract design tokens (colors, typography, spacing, shadows, etc.) from any website with AI-powered analysis',
                inputSchema: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                      format: 'uri',
                      description: 'Website URL to scan (e.g., https://stripe.com)'
                    },
                    depth: {
                      type: 'string',
                      enum: ['1', '2', '3'],
                      default: '1',
                      description: 'Scan depth: 1=homepage only, 2=+key pages, 3=comprehensive'
                    },
                    prettify: {
                      type: 'boolean',
                      default: false,
                      description: 'Format CSS output for readability'
                    },
                    quality: {
                      type: 'string',
                      enum: ['basic', 'standard', 'premium'],
                      default: 'standard',
                      description: 'Analysis quality level (affects AI processing)'
                    }
                  },
                  required: ['url']
                }
              },
              {
                name: 'get_tokens',
                description: 'Retrieve previously scanned design tokens from cache (fast lookup)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                      format: 'uri',
                      description: 'Website URL to retrieve tokens for'
                    },
                    version: {
                      type: 'string',
                      description: 'Optional: specific token set version to retrieve'
                    }
                  },
                  required: ['url']
                }
              },
              {
                name: 'layout_profile',
                description: 'Analyze layout patterns, grid systems, spacing scales, and responsive breakpoints',
                inputSchema: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                      format: 'uri',
                      description: 'Website URL to profile'
                    },
                    pages: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Specific pages to analyze (e.g., ["/", "/pricing", "/features"])'
                    },
                    viewports: {
                      type: 'array',
                      items: { type: 'number' },
                      description: 'Viewport widths for responsive analysis (e.g., [375, 768, 1440])'
                    }
                  },
                  required: ['url']
                }
              },
              {
                name: 'research_artifacts',
                description: 'Discover design system documentation, Storybook, Figma files, and GitHub repos',
                inputSchema: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                      format: 'uri',
                      description: 'Company website URL'
                    },
                    github_org: {
                      type: 'string',
                      description: 'Optional: GitHub organization name to search for design system repos'
                    }
                  },
                  required: ['url']
                }
              },
              {
                name: 'compose_pack',
                description: 'Generate AI implementation guide with framework-specific mapping hints and best practices',
                inputSchema: {
                  type: 'object',
                  properties: {
                    token_set: {
                      type: 'object',
                      description: 'Design token set from scan_tokens'
                    },
                    layout_profile: {
                      type: 'object',
                      description: 'Optional: layout profile for enhanced recommendations'
                    },
                    artifacts: {
                      type: 'object',
                      description: 'Optional: design system artifacts for context'
                    },
                    intent: {
                      type: 'string',
                      enum: ['component-authoring', 'marketing-site'],
                      description: 'Implementation intent for tailored guidance'
                    }
                  },
                  required: ['token_set']
                }
              }
            ]
          }
        };
        stdout.write(JSON.stringify(response) + '\n');
      }

      else if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params;
        const endpoint = `${API_URL}/${name.replace('_', '-')}`;

        if (DEBUG) {
          stderr.write(`Calling tool: ${name}\n`);
          stderr.write(`Endpoint: ${endpoint}\n`);
        }

        const response = await makeRequest(endpoint, args);

        if (DEBUG) {
          stderr.write(`Response status: ${response.status || 'success'}\n`);
        }

        stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2)
              }
            ]
          }
        }) + '\n');
      }

      else {
        // Unknown method
        stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        }) + '\n');
      }

    } catch (error) {
      if (DEBUG) {
        stderr.write(`Error: ${error.message}\n`);
        stderr.write(`Stack: ${error.stack}\n`);
      }

      stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32603,
          message: error.message,
          data: DEBUG ? error.stack : undefined
        }
      }) + '\n');
    }
  }
});

function makeRequest(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const requestBody = JSON.stringify(body);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(requestBody),
        'User-Agent': 'ContextDS-MCP-Client/1.0.0'
      },
      timeout: 120000 // 2 minute timeout for scans
    };

    const req = client.request(url, options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          if (res.statusCode >= 400) {
            reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout after 2 minutes'));
    });

    req.write(requestBody);
    req.end();
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  if (DEBUG) stderr.write('Received SIGTERM, shutting down...\n');
  process.exit(0);
});

process.on('SIGINT', () => {
  if (DEBUG) stderr.write('Received SIGINT, shutting down...\n');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  stderr.write(`Uncaught exception: ${error.message}\n`);
  if (DEBUG) stderr.write(error.stack + '\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  stderr.write(`Unhandled rejection: ${reason}\n`);
  if (DEBUG) stderr.write(`Promise: ${promise}\n`);
});

if (DEBUG) {
  stderr.write('ContextDS MCP Server ready and listening on stdin...\n');
}