#!/usr/bin/env node

/**
 * Design Contracts MCP stdio ↔ HTTP bridge.
 *
 * Preferred: point clients at the Streamable HTTP endpoint directly:
 *   claude mcp add --transport http designcontracts https://designcontracts.sh/api/mcp
 *
 * This wrapper exists for stdio-only hosts. It forwards JSON-RPC to /api/mcp
 * so tool names never drift from lib/agent/tools.ts.
 *
 * Env:
 *   DESIGNCONTRACTS_API_URL  — default https://designcontracts.sh/api/mcp
 *   DESIGNCONTRACTS_API_KEY  — Bearer key (dc_live_… Pro key or MCP_API_KEY)
 */

const { stdin, stdout, stderr } = require('process')
const https = require('https')
const http = require('http')

const API_KEY =
  process.env.DESIGNCONTRACTS_API_KEY || process.env.CONTEXTDS_API_KEY || ''
const API_URL =
  process.env.DESIGNCONTRACTS_API_URL ||
  process.env.CONTEXTDS_API_URL ||
  'https://designcontracts.sh/api/mcp'
const DEBUG =
  (process.env.DESIGNCONTRACTS_DEBUG || process.env.CONTEXTDS_DEBUG) === 'true'

function log(...args) {
  if (DEBUG) stderr.write(args.map(String).join(' ') + '\n')
}

function postRpc(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL)
    const transport = url.protocol === 'https:' ? https : http
    const body = JSON.stringify(payload)
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
    if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`

    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers,
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          if (!text) {
            resolve(null)
            return
          }
          try {
            resolve(JSON.parse(text))
          } catch (error) {
            reject(error)
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

let buffer = ''
stdin.setEncoding('utf8')

stdin.on('data', async (chunk) => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    if (!line.trim()) continue
    let request
    try {
      request = JSON.parse(line)
    } catch {
      continue
    }

    log('←', request.method)

    try {
      // Proxy everything to the HTTP MCP endpoint so manifests stay in sync.
      const response = await postRpc(request)
      if (response === null) {
        // Notification / 202
        continue
      }
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        if (response.id === undefined && request.id !== undefined) {
          response.id = request.id
        }
        stdout.write(JSON.stringify(response) + '\n')
      } else if (Array.isArray(response)) {
        for (const entry of response) {
          stdout.write(JSON.stringify(entry) + '\n')
        }
      }
    } catch (error) {
      stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: request.id ?? null,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Bridge error',
          },
        }) + '\n'
      )
    }
  }
})

stdin.on('end', () => process.exit(0))
