// ─── Config ───────────────────────────────────────────
const SSE_URL     = 'http://localhost:3000/events'
const MAX_HISTORY = 30

// ─── State ────────────────────────────────────────────
const history = { labels: [], high: [], medium: [], low: [] }
let lastUpdateTime = null
let prevTiers      = { high: null, medium: null, low: null }
let sessionHigh    = null
let sessionLow     = null
let updateCount    = 0

// ─── DOM References ───────────────────────────────────
const feeHigh     = document.getElementById('fee-high')
const feeMedium   = document.getElementById('fee-medium')
const feeLow      = document.getElementById('fee-low')
const statusPill  = document.getElementById('status')
const statusText  = document.getElementById('status-text')
const lastUpdated = document.getElementById('last-updated')
const heartbeat   = document.getElementById('heartbeat')
const congBanner  = document.getElementById('congestion-banner')
const congText    = document.getElementById('congestion-text')
const congIcon    = document.getElementById('congestion-icon')
const arrowHigh   = document.getElementById('arrow-high')
const arrowMedium = document.getElementById('arrow-medium')
const arrowLow    = document.getElementById('arrow-low')
const statHigh    = document.getElementById('stat-session-high')
const statLow     = document.getElementById('stat-session-low')
const statUpdates = document.getElementById('stat-updates')
const statSpread  = document.getElementById('stat-spread')

// ─── Heartbeat Ticker ─────────────────────────────────
setInterval(() => {
  if (!lastUpdateTime) return
  const secondsAgo = Math.floor((Date.now() - lastUpdateTime) / 1000)
  heartbeat.textContent = secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`
  heartbeat.className = 'heartbeat-timer'
  if (secondsAgo < 15)      heartbeat.classList.add('fresh')
  else if (secondsAgo < 45) heartbeat.classList.add('stale')
  else                       heartbeat.classList.add('old')
}, 1000)

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
        borderColor: '#f0a500',
        backgroundColor: 'rgba(240,165,0,0.08)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.45,
        fill: true
      },
      {
        label: 'Medium',
        data: history.medium,
        borderColor: '#4da6ff',
        backgroundColor: 'rgba(77,166,255,0.08)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.45,
        fill: true
      },
      {
        label: 'Low',
        data: history.low,
        borderColor: '#3dd68c',
        backgroundColor: 'rgba(61,214,140,0.08)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.45,
        fill: true
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500, easing: 'easeInOutQuart' },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        ticks: { color: '#5a7190', maxTicksLimit: 6, font: { size: 11 } },
        grid: { color: '#1e2d47' }
      },
      y: {
        min: 0,
        suggestedMax: 5,
        ticks: {
          color: '#5a7190',
          font: { size: 11 },
          callback: val => `${Math.round(val)} sat/vB`
        },
        grid: { color: '#1e2d47' }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f1623',
        borderColor: '#1e2d47',
        borderWidth: 1,
        titleColor: '#8ba3c0',
        bodyColor: '#e8edf5',
        padding: 12,
        callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y} sat/vB` }
      }
    }
  }
})

// ─── Arrow Helper ─────────────────────────────────────
function updateArrow(el, current, previous) {
  if (previous === null) { el.textContent = '—'; el.className = 'card-arrow flat'; return }
  if (current > previous)      { el.textContent = '↑'; el.className = 'card-arrow up' }
  else if (current < previous) { el.textContent = '↓'; el.className = 'card-arrow down' }
  else                         { el.textContent = '→'; el.className = 'card-arrow flat' }
}

// ─── Congestion Banner ────────────────────────────────
function updateCongestion(high) {
  congBanner.className = 'congestion-banner'
  if (high <= 5) {
    congBanner.classList.add('quiet')
    congText.textContent = 'Network is quiet — great time to send a low-fee transaction'
  } else if (high <= 30) {
    congBanner.classList.add('moderate')
    congText.textContent = 'Network is moderately busy — fees are reasonable right now'
  } else {
    congBanner.classList.add('busy')
    congText.textContent = 'Network is congested — high fees required for fast confirmation'
  }
}

// ─── Update UI ────────────────────────────────────────
function updateDisplay(data) {
  lastUpdateTime = Date.now()
  updateCount++

  updateArrow(arrowHigh,   data.high,   prevTiers.high)
  updateArrow(arrowMedium, data.medium, prevTiers.medium)
  updateArrow(arrowLow,    data.low,    prevTiers.low)
  prevTiers = { high: data.high, medium: data.medium, low: data.low }

  feeHigh.textContent   = data.high
  feeMedium.textContent = data.medium
  feeLow.textContent    = data.low

  ;[feeHigh, feeMedium, feeLow].forEach(el => {
    el.classList.remove('updating')
    void el.offsetWidth
    el.classList.add('updating')
  })

  if (sessionHigh === null || data.high > sessionHigh) sessionHigh = data.high
  if (sessionLow  === null || data.high < sessionLow)  sessionLow  = data.high
  statHigh.textContent    = sessionHigh !== null ? `${sessionHigh} s/vB` : '—'
  statLow.textContent     = sessionLow  !== null ? `${sessionLow} s/vB`  : '—'
  statUpdates.textContent = updateCount

  const spread = data.high - data.low
  statSpread.textContent = spread === 0 ? '< 1 s/vB' : `${spread} s/vB`

  updateCongestion(data.high)

  const time = new Date(data.timestamp)
  lastUpdated.textContent = `Last update: ${time.toLocaleTimeString()}`

  history.labels.push(time.toLocaleTimeString())
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
    statusPill.className   = 'status-pill live'
    statusText.textContent = 'Live'
  }

  source.onmessage = (event) => {
    try { updateDisplay(JSON.parse(event.data)) }
    catch (err) { console.error('[client] Failed to parse SSE data:', err) }
  }

  source.onerror = () => {
    statusPill.className   = 'status-pill error'
    statusText.textContent = 'Reconnecting...'
    source.close()
    setTimeout(connect, 3000)
  }
}

// ─── Start ────────────────────────────────────────────
connect()