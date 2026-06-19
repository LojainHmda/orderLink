/**
 * Prisma row -> API DTO mapping. Centralized so every endpoint returns the exact
 * same shape (numbers for money, ISO strings for dates) — no Decimal/Date leaks.
 */
import type { MenuItem, Order, OrderEvent, OrderItem, Restaurant, Prisma } from '@prisma/client';
import type { MenuItemDTO, OrderDTO, OrderItemDTO, RestaurantDTO } from '@orderlink/shared';

const num = (d: Prisma.Decimal): number => d.toNumber();

export function toRestaurantDTO(r: Restaurant): RestaurantDTO {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    cuisine: r.cuisine,
    phone: r.phone,
    currency: r.currency,
    address: r.address,
    deliveryFee: num(r.deliveryFee),
    minOrder: num(r.minOrder),
    emoji: r.emoji,
    categories: r.categories,
  };
}

export function toMenuItemDTO(m: MenuItem): MenuItemDTO {
  return {
    id: m.id,
    restaurantId: m.restaurantId,
    name: m.name,
    description: m.description,
    category: m.category,
    price: num(m.price),
    emoji: m.emoji,
    available: m.available,
  };
}

function toOrderItemDTO(i: OrderItem): OrderItemDTO {
  return {
    id: i.id,
    menuItemId: i.menuItemId,
    name: i.name,
    emoji: i.emoji,
    price: num(i.price),
    qty: i.qty,
    note: i.note,
  };
}

export type OrderWithRelations = Order & { items: OrderItem[]; events: OrderEvent[] };

export function toOrderDTO(o: OrderWithRelations): OrderDTO {
  return {
    id: o.id,
    code: o.code,
    restaurantId: o.restaurantId,
    channel: o.channel,
    type: o.type,
    table: o.table,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    note: o.note,
    status: o.status,
    subtotal: num(o.subtotal),
    deliveryFee: num(o.deliveryFee),
    total: num(o.total),
    items: o.items.map(toOrderItemDTO),
    events: o.events.map((e) => ({ status: e.status, createdAt: e.createdAt.toISOString() })),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
