// ─── Config ───────────────────────────────────────────
const SSE_URL = 'http://localhost:3000/events'
const MAX_HISTORY = 30

// ─── State ────────────────────────────────────────────
const history = {
  labels: [],
  high:   [],
  medium: [],
  low:    []
}

// ─── DOM References ───────────────────────────────────
const feeHigh    = document.getElementById('fee-high')
const feeMedium  = document.getElementById('fee-medium')
const feeLow     = document.getElementById('fee-low')
const statusPill = document.getElementById('status')
const lastUpdated = document.getElementById('last-updated')

// ─── Chart Setup ──────────────────────────────────────
const ctx = document.getElementById('feeChart').getContext('2d')

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: history.labels,
    datasets: [
      {
        label: 'High',
        data: history.high,
        borderColor: '#f85149',
        backgroundColor: 'rgba(248,81,73,0.08)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.4,
        fill: true
      },
      {
        label: 'Medium',
        data: history.medium,
        borderColor: '#f0883e',
        backgroundColor: 'rgba(240,136,62,0.08)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.4,
        fill: true
      },
      {
        label: 'Low',
        data: history.low,
        borderColor: '#3fb950',
        backgroundColor: 'rgba(63,185,80,0.08)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.4,
        fill: true
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        ticks: { color: '#8b949e', maxTicksLimit: 8 },
        grid:  { color: '#21262d' }
      },
      y: {
        ticks: {
          color: '#8b949e',
          callback: val => `${val} sat/vB`
        },
        grid: { color: '#21262d' }
      }
    },
    plugins: {
      legend: {
        labels: { color: '#e6edf3', usePointStyle: true }
      },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} sat/vB`
        }
      }
    }
  }
})

// ─── Update UI ────────────────────────────────────────
function updateDisplay(data) {
  // Update cards
  feeHigh.textContent   = data.high
  feeMedium.textContent = data.medium
  feeLow.textContent    = data.low

  // Pulse animation on update
  ;[feeHigh, feeMedium, feeLow].forEach(el => {
    el.classList.remove('updating')
    void el.offsetWidth // force reflow to restart animation
    el.classList.add('updating')
  })

  // Update last-updated timestamp
  const time = new Date(data.timestamp)
  lastUpdated.textContent = time.toLocaleTimeString()

  // Update chart history — keep last 30 points
  const label = time.toLocaleTimeString()
  history.labels.push(label)
  history.high.push(data.high)
  history.medium.push(data.medium)
  history.low.push(data.low)

  if (history.labels.length > MAX_HISTORY) {
    history.labels.shift()
    history.high.shift()
    history.medium.shift()
    history.low.shift()
  }

  chart.update()
}

// ─── SSE Connection ───────────────────────────────────
function connect() {
  const source = new EventSource(SSE_URL)

  source.onopen = () => {
    console.log('[client] Connected to backend SSE stream')
    statusPill.textContent = '● Live'
    statusPill.className = 'status-pill live'
  }

  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      updateDisplay(data)
    } catch (err) {
      console.error('[client] Failed to parse SSE data:', err)
    }
  }

  source.onerror = () => {
    console.warn('[client] SSE connection lost. Reconnecting...')
    statusPill.textContent = '● Reconnecting...'
    statusPill.className = 'status-pill error'
    source.close()

    // Try reconnecting after 3 seconds
    setTimeout(connect, 3000)
  }
}

// ─── Start ────────────────────────────────────────────
connect()
