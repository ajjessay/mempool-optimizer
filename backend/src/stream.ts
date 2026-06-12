import { EventEmitter } from 'events'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeeEstimates {
  [blocks: string]: number
}

export interface FeeEstimatesPayload {
  feeEstimates: FeeEstimates
}

// ─── Stream Class ─────────────────────────────────────────────────────────────

export class MempoolStream extends EventEmitter {
  private intervalHandle: ReturnType<typeof setInterval> | null = null
  private destroyed = false
  private readonly pollInterval = 30000 // 30 seconds
  private readonly apiUrl = 'https://blockstream.info/api/fee-estimates'

  // Called once to start polling
  connect(): void {
    if (this.destroyed) return
    console.log('[stream] Starting Blockstream fee-estimates polling...')

    // Fetch immediately on connect, then every 30 seconds
    this.fetchAndEmit()
    this.intervalHandle = setInterval(() => {
      this.fetchAndEmit()
    }, this.pollInterval)
  }

  private async fetchAndEmit(): Promise<void> {
    if (this.destroyed) return

    try {
      console.log('[stream] Fetching fee estimates from Blockstream...')

      const response = await fetch(this.apiUrl)

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const feeEstimates = await response.json() as FeeEstimates

      const payload: FeeEstimatesPayload = { feeEstimates }

      // Fire event that server.ts listens to
      this.emit('mempoolBlocks', payload)

    } catch (err) {
      console.error('[stream] Fetch error:', err)
      console.log('[stream] Will retry in 30 seconds...')
    }
  }

  // Call this to permanently stop polling
  destroy(): void {
    this.destroyed = true
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
  }
}
