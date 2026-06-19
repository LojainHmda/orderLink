/**
 * Realtime contract shared by the socket.io server and client.
 * Clients join a per-restaurant room and receive typed order events.
 */
import type { OrderDTO } from './dto.js';

export const SOCKET_EVENTS = {
  /** Client -> server: subscribe to a restaurant's order stream. */
  JOIN_RESTAURANT: 'restaurant:join',
  /** Server -> client: a new order was placed. */
  ORDER_CREATED: 'order:created',
  /** Server -> client: an order's status (or data) changed. */
  ORDER_UPDATED: 'order:updated',
} as const;

export interface ServerToClientEvents {
  [SOCKET_EVENTS.ORDER_CREATED]: (order: OrderDTO) => void;
  [SOCKET_EVENTS.ORDER_UPDATED]: (order: OrderDTO) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.JOIN_RESTAURANT]: (restaurantId: string) => void;
}

/** Room name a restaurant's order events are broadcast on. */
export function restaurantRoom(restaurantId: string): string {
  return `restaurant:${restaurantId}`;
}
