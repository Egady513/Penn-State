/**
 * Closest-to-Pin / Long-Drive pricing.
 *
 * Both contests together = the bundle price (2 catalog rows at $10 each = $20).
 * That's what registration sells, and the catalog item prices back it.
 *
 * A SINGLE contest bought on its own costs more, so the bundle stays the
 * better deal — someone walking up to just the closest-to-pin hole pays $12
 * rather than half the bundle. The purchase row stores its own `amount`, so
 * this override lives here rather than on the catalog item (whose price still
 * has to be $10 for the bundle math to come out right).
 */
export const SINGLE_CONTEST_PRICE = 12

/** Both contests for one golfer. Derived from the catalog rows, not hardcoded. */
export function bundlePrice(ctpPrice: number, ldPrice: number): number {
  return ctpPrice + ldPrice
}
