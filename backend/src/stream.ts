import { WebSocket } from 'ws'
import { EventEmitter } from 'events'

export interface MempoolBlock {
  blockSize: number
  blockVSize: number
  nTx: number
  totalFees: number
  medianFee: number
  feeRange: number[]
}

export interface MempoolBlocksPayload {
  mempoolBlocks: MempoolBlock[]
}

export class MempoolStream extends EventEmitter {
  private ws: WebSocket | null = null
  private reconnectDelay = 1000
  private readonly maxDelay = 30000
  private destroyed = false

  connect(): void {
    if (this.destroyed) return
    console.log('[stream] Connecting to mempool.space...')

    this.ws = new WebSocket('wss://mempool.space/api/v1/ws')

    this.ws.on('open', () => {
      console.log('[stream] Connected. Subscribing to mempool blocks...')
      this.reconnectDelay = 1000
      this.ws!.send(JSON.stringify({
        action: 'want',
        data: ['blocks', 'mempool-blocks']
      }))
    })

    this.ws.on('message', (raw: Buffer) => {
      try {
        const parsed = JSON.parse(raw.toString())
        if (parsed['mempool-blocks']) {
          const payload: MempoolBlocksPayload = {
            mempoolBlocks: parsed['mempool-blocks']
          }
          this.emit('mempoolBlocks', payload)
        }
      } catch (err) {
        console.error('[stream] Failed to parse message:', err)
      }
    })

    this.ws.on('error', (err: Error) => {
      console.error('[stream] WebSocket error:', err.message)
    })

    this.ws.on('close', () => {
      if (this.destroyed) return
      console.warn(`[stream] Disconnected. Reconnecting in ${this.reconnectDelay / 1000}s...`)
      setTimeout(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay)
        this.connect()
      }, this.reconnectDelay)
    })
  }

  destroy(): void {
    this.destroyed = true
    this.ws?.close()
  }
}
