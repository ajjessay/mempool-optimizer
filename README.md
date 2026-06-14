# ⛓ Mempool Optimizer
> A live fee-rate traffic reporter for the Bitcoin mempool.

![Node.js](https://img.shields.io/badge/Node.js-v22-339933?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)
![WebSockets](https://img.shields.io/badge/WebSockets-live-f0a500?style=flat)
![License](https://img.shields.io/badge/license-MIT-green?style=flat)

---

## What It Does

When you send Bitcoin, your transaction enters a waiting room called the **mempool** — a queue of thousands of unconfirmed transactions competing for limited block space. Miners always pick the highest-fee transactions first, so if you underpay, your transaction gets stuck. If you overpay, you waste money.

**Mempool Optimizer** solves this by streaming live mempool data and calculating the exact minimum fee required for fast, medium, or slow confirmation — updated in real time.

---

## Live Dashboard

| Metric | Description |
|---|---|
| 🟡 **High Priority** | Minimum fee to get into the very next block (~10 min) |
| 🔵 **Medium Priority** | Fee to confirm within 2-3 blocks (~30 min) |
| 🟢 **Low Priority** | Absolute floor fee for eventual confirmation (~1 hour) |

The dashboard also shows:
- **Live heartbeat** — counts seconds since last data update
- **Network congestion banner** — tells you in plain English if now is a good time to transact
- **Directional arrows** — shows whether fees are rising or falling since the last update
- **Session stats** — high, low, data points received, fee spread
- **Rolling 30-point chart** — visualises fee history over time

---

## Architecture

\`\`\`
mempool.space WSS
      ↓
 stream.ts   — Persistent WebSocket connection with exponential backoff reconnect
      ↓
optimizer.ts — Pure fee-tier calculator (High / Medium / Low sat/vB)
      ↓
 server.ts   — Native Node.js HTTP server with SSE broadcast endpoint
      ↓
  main.js    — Vanilla JS frontend, EventSource, live Chart.js updates
\`\`\`

**Why this architecture:**
- stream.ts and optimizer.ts are fully decoupled — the calculator has zero WebSocket dependency and is independently testable
- SSE (Server-Sent Events) over WebSocket for the frontend connection — simpler, auto-reconnects, zero client-side dependencies
- No framework overhead on the frontend — vanilla JS updates the DOM directly at high frequency without a reconciliation layer

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v22 (native ESM) |
| Language | TypeScript 5.x (strict mode) |
| Upstream data | wss://mempool.space/api/v1/ws |
| Backend transport | Server-Sent Events (SSE) |
| Frontend | Vanilla JS + Chart.js |
| Module system | ES Modules ("type": "module") |
| Module resolution | NodeNext (tsconfig) |

---

## Run Locally

**Prerequisites:** Node.js v18+ and WSL (Ubuntu) or any Unix environment.

\`\`\`bash
# 1. Clone the repo
git clone https://github.com/ajjessay/mempool-optimizer.git
cd mempool-optimizer

# 2. Install backend dependencies
cd backend && npm install

# 3. Start the backend
npm run dev
\`\`\`

Open a second terminal:

\`\`\`bash
# 4. Serve the frontend
cd mempool-optimizer/frontend
npx serve .
\`\`\`

Open the URL shown in your terminal. The dashboard connects automatically and begins streaming live fee data.

---

## Key Engineering Decisions

**Exponential backoff reconnect** — if the upstream WebSocket drops, the backend retries at 1s → 2s → 4s → 8s → 30s cap. The dashboard never silently goes stale.

**Block template fee extraction** — rather than sorting thousands of raw transactions, the optimizer reads feeRange arrays from mempool.space pre-assembled block templates. This is more accurate and far less CPU-intensive.

**Pure function design** — optimizer.ts is a stateless function that takes raw mempool data and returns three numbers. No side effects, no I/O, fully testable in isolation.

**NodeNext module resolution** — the only tsconfig setting that correctly handles .js extension imports in strict ESM on Node 22. Using the legacy node resolution would break silently.

---

## Project Structure

\`\`\`
mempool-optimizer/
├── backend/
│   ├── src/
│   │   ├── stream.ts       ← WebSocket manager + reconnect logic
│   │   ├── optimizer.ts    ← Fee tier calculator (pure functions)
│   │   └── server.ts       ← HTTP server + SSE endpoint
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── index.html          ← Dashboard layout
│   ├── style.css           ← Premium dark theme
│   └── main.js             ← SSE client + Chart.js
└── .gitignore
\`\`\`

---

## What This Demonstrates

- **Real-time data streaming** — persistent WebSocket consumer with production-grade fault tolerance
- **Separation of concerns** — three backend files with zero cross-contamination of responsibilities
- **Modern TypeScript config** — strict ESM, NodeNext resolution, no legacy hacks
- **Pure function architecture** — testable business logic fully decoupled from I/O
- **Efficient frontend** — no framework overhead for a high-frequency data feed

---

*Built with Node.js, TypeScript, and the mempool.space public API.*
