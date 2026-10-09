/** Format a session cost for display: four decimals under $1, two above. */
export function formatCost(cost: number): string {
  if (!Number.isFinite(cost) || cost < 0) return ""
  return `$${cost < 1 ? cost.toFixed(4) : cost.toFixed(2)}`
}
