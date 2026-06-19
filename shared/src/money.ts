/** Money helpers shared across server and client so formatting/rounding match. */

/** Round to 2 decimal places, avoiding binary float drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Format an amount with a currency symbol (e.g. "$12.50"). */
export function formatMoney(amount: number, currency = '$'): string {
  return `${currency}${round2(amount).toFixed(2)}`;
}
