/**
 * API response shapes (DTOs). The server serializes Prisma rows into these and
 * the client consumes them — the contract lives here so both sides stay in sync.
 * Money is always exposed as a `number` (Prisma `Decimal` is serialized on the way out).
 */
import type { OrderStatus } from './order-status.js';
import type { OrderChannel, OrderType } from './schemas.js';

export interface RestaurantDTO {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  cuisine: string | null;
  phone: string | null;
  currency: string;
  address: string | null;
  deliveryFee: number;
  minOrder: number;
  emoji: string | null;
  categories: string[];
}

export interface MenuItemDTO {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  emoji: string | null;
  available: boolean;
}

export interface OrderItemDTO {
  id: string;
  menuItemId: string | null;
  name: string;
  emoji: string | null;
  price: number;
  qty: number;
  note: string | null;
}

export interface OrderEventDTO {
  status: OrderStatus;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  code: number;
  restaurantId: string;
  /** Public slug of the owning restaurant — lets the order page link back to its menu. */
  restaurantSlug: string;
  channel: OrderChannel;
  type: OrderType;
  table: string | null;
  customerName: string;
  customerPhone: string | null;
  note: string | null;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: OrderItemDTO[];
  events: OrderEventDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantStatsDTO {
  ordersToday: number;
  liveOrders: number;
  revenueToday: number;
  avgTicket: number;
  topItems: { name: string; qty: number }[];
}

/** Standard error envelope returned by the API. */
export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}
