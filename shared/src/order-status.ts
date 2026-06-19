/**
 * Order lifecycle — the single source of truth for the state machine.
 *
 * Both the API (which enforces transitions) and the React client (which renders
 * the pipeline) import these constants, so the two can never drift apart.
 */

export const ORDER_STATUSES = [
  'NEW',
  'PREPARING',
  'READY',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The happy-path pipeline an active order moves through, in order. */
export const ORDER_PIPELINE: readonly OrderStatus[] = ['NEW', 'PREPARING', 'READY', 'COMPLETED'];

/** Terminal states an order can no longer move out of. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = ['COMPLETED', 'REJECTED', 'CANCELLED'];

/** Allowed transitions out of each status. Anything not listed is rejected. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ['PREPARING', 'REJECTED', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export interface OrderStatusMeta {
  /** Label shown on the restaurant side. */
  label: string;
  /** Label shown to the customer (friendlier wording). */
  customerLabel: string;
  icon: string;
  tone: 'info' | 'warning' | 'primary' | 'success' | 'error';
}

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  NEW: { label: 'Requested', customerLabel: 'Order received', icon: 'receipt_long', tone: 'info' },
  PREPARING: { label: 'Preparing', customerLabel: 'Being prepared', icon: 'skillet', tone: 'warning' },
  READY: { label: 'Ready', customerLabel: 'Ready', icon: 'check_circle', tone: 'primary' },
  COMPLETED: { label: 'Completed', customerLabel: 'Completed', icon: 'task_alt', tone: 'success' },
  REJECTED: { label: 'Rejected', customerLabel: 'Declined', icon: 'cancel', tone: 'error' },
  CANCELLED: { label: 'Cancelled', customerLabel: 'Cancelled', icon: 'do_not_disturb', tone: 'error' },
};

/** Whether `from -> to` is a legal transition. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** The next status in the happy-path pipeline, or `null` if there is none. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_PIPELINE.indexOf(status);
  if (i === -1 || i === ORDER_PIPELINE.length - 1) return null;
  return ORDER_PIPELINE[i + 1] ?? null;
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
