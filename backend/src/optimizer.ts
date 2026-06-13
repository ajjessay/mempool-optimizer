import type { MempoolBlock, MempoolBlocksPayload } from './stream.js'

export interface FeeTiers {
  high: number
  medium: number
  low: number
  timestamp: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function getBlock(blocks: MempoolBlock[], index: number): MempoolBlock | null {
  return blocks[index] ?? null
}

export function calculateTiers(payload: MempoolBlocksPayload): FeeTiers {
  const blocks = payload.mempoolBlocks

  const block0 = getBlock(blocks, 0)
  const high = block0 ? median(block0.feeRange) : 0

  const block1 = getBlock(blocks, 1) ?? getBlock(blocks, 2)
  const medium = block1 ? median(block1.feeRange) : Math.round(high * 0.6)

  const lastBlock = blocks[blocks.length - 1] ?? null
  const low = lastBlock ? Math.min(...lastBlock.feeRange) : Math.round(high * 0.3)

  return {
    high:   Math.max(Math.round(high), 1),
    medium: Math.max(Math.round(medium), 1),
    low:    Math.max(Math.round(low), 1),
    timestamp: Date.now()
  }
}
