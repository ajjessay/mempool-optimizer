import http from 'http'
import { MempoolStream } from './stream.js'
import { calculateTiers } from './optimizer.js'
import type { FeeTiers } from './optimizer.js'

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3000

// ─── State ────────────────────────────────────────────────────────────────────

// Keeps track of every browser currently watching the dashboard
const clients = new Set<http.ServerResponse>()

// Stores the last known fee tiers so new visitors get data immediately
let latestTiers: FeeTiers | null = null

// ─── SSE Helper ───────────────────────────────────────────────────────────────

// Formats data in the SSE spec format and sends to one client
function sendToClient(client: http.ServerResponse, data: FeeTiers): void {
  client.write(`data: ${JSON.stringify(data)}\n\n`)
}

// Sends latest data to every connected browser at once
function broadcast(data: FeeTiers): void {
  clients.forEach(client => sendToClient(client, data))
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = req.url ?? '/'

  // ── CORS Headers ────────────────────────────────────────────────────────────
  // Allows the frontend (on a different port or domain) to talk to this server
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // ── SSE Endpoint ────────────────────────────────────────────────────────────
  // This is what the frontend connects to for live updates
  if (url === '/events' && req.method === 'GET') {
    // These headers tell the browser "this is a live stream, keep it open"
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    // Register this browser as an active client
    clients.add(res)
    console.log(`[server] Client connected. Total: ${clients.size}`)

    // If we already have data, send it immediately so the
    // dashboard isn't blank while waiting for the next update
    if (latestTiers) sendToClient(res, latestTiers)

    // When this browser disconnects, remove it from the list
    req.on('close', () => {
      clients.delete(res)
      console.log(`[server] Client disconnected. Total: ${clients.size}`)
    })

    return
  }

  // ── Health Check Endpoint ───────────────────────────────────────────────────
  // Visit http://localhost:3000/health to confirm the server is alive
  if (url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      connectedClients: clients.size,
      latestTiers
    }))
    return
  }

  // ── 404 for everything else ─────────────────────────────────────────────────
  res.writeHead(404)
  res.end('Not found')
})

// ─── Wire Everything Together ─────────────────────────────────────────────────

const stream = new MempoolStream()

// When stream.ts fires a mempoolBlocks event:
// 1. Pass the data to optimizer.ts to calculate fee tiers
// 2. Store the result
// 3. Broadcast to all connected browsers
stream.on('mempoolBlocks', (payload) => {
  const tiers = calculateTiers(payload)
  latestTiers = tiers
  broadcast(tiers)
  console.log(`[optimizer] High: ${tiers.high} | Medium: ${tiers.medium} | Low: ${tiers.low} sat/vB`)
})

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`)
  console.log(`[server] SSE endpoint: http://localhost:${PORT}/events`)
  console.log(`[server] Health check: http://localhost:${PORT}/health`)
  stream.connect()
})

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

// When you press Ctrl+C, close everything cleanly
process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...')
  stream.destroy()
  server.close(() => process.exit(0))
})
