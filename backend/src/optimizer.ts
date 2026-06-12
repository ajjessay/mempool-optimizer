import type { FeeEstimatesPayload } from './stream.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeeTiers {
  high: number    // sat/vB — next block (~10 mins)
  medium: number  // sat/vB — within 3 blocks (~30 mins)
  low: number     // sat/vB — within 6 blocks (~1 hour)
  timestamp: number
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function calculateTiers(payload: FeeEstimatesPayload): FeeTiers {
  const fees = payload.feeEstimates

  // Blockstream keys are "number of blocks to wait"
  // We pick the three most useful confirmation targets
  // Math.ceil ensures we never return a decimal or zero

  const high = Math.ceil(fees['1'] ?? fees['2'] ?? 10)
  const medium = Math.ceil(fees['3'] ?? fees['6'] ?? 5)
  const low = Math.ceil(fees['6'] ?? fees['12'] ?? 2)

  return {
    high: Math.max(high, 1),
    medium: Math.max(medium, 1),
    low: Math.max(low, 1),
    timestamp: Date.now()
  }
}
