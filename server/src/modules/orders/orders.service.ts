import { Prisma, type Restaurant } from '@prisma/client';
import {
  canTransition,
  nextStatus,
  round2,
  type CreateOrderInput,
  type GuestOrdersQuery,
  type ListOrdersQuery,
  type OrderDTO,
  type OrderStatus,
  type RestaurantStatsDTO,
} from '@orderlink/shared';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../errors/ApiError.js';
import { toOrderDTO } from '../../lib/serializers.js';
import { emitOrderCreated, emitOrderUpdated } from '../../lib/realtime.js';

const ORDER_INCLUDE = {
  items: true,
  events: { orderBy: { createdAt: 'asc' } },
  restaurant: { select: { slug: true } },
} satisfies Prisma.OrderInclude;

const LIVE_STATUSES: OrderStatus[] = ['NEW', 'PREPARING', 'READY'];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Create an order. Prices and totals are computed on the server from the live
 * menu — client-supplied prices are never trusted. Item rows snapshot the name
 * and price so historical orders are unaffected by later menu edits.
 */
export async function createOrder(
  restaurant: Restaurant,
  input: CreateOrderInput,
): Promise<OrderDTO> {
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: input.items.map((i) => i.menuItemId) }, restaurantId: restaurant.id },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const lines = input.items.map((line) => {
    const menuItem = byId.get(line.menuItemId);
    if (!menuItem) throw ApiError.badRequest(`Item ${line.menuItemId} is not on this menu`);
    if (!menuItem.available) throw ApiError.unprocessable(`"${menuItem.name}" is currently unavailable`);
    return { menuItem, qty: line.qty, note: line.note ?? null };
  });

  const subtotal = round2(
    lines.reduce((sum, l) => sum + l.menuItem.price.toNumber() * l.qty, 0),
  );
  const deliveryFee = input.type === 'DELIVERY' ? restaurant.deliveryFee.toNumber() : 0;
  const minOrder = restaurant.minOrder.toNumber();

  if (input.type === 'DELIVERY' && minOrder > 0 && subtotal < minOrder) {
    throw ApiError.unprocessable(
      `Minimum order for delivery is ${restaurant.currency}${minOrder.toFixed(2)}`,
    );
  }

  const total = round2(subtotal + deliveryFee);
  // Staff-entered (POS) orders are already accepted; online orders await the kitchen.
  const initialStatus: OrderStatus = input.channel === 'POS' ? 'PREPARING' : 'NEW';

  const order = await prisma.$transaction(async (tx) => {
    const { orderSeq } = await tx.restaurant.update({
      where: { id: restaurant.id },
      data: { orderSeq: { increment: 1 } },
      select: { orderSeq: true },
    });

    return tx.order.create({
      data: {
        code: orderSeq,
        restaurantId: restaurant.id,
        channel: input.channel,
        type: input.type,
        table: input.table ?? null,
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? null,
        guestId: input.guestId ?? null,
        note: input.note ?? null,
        status: initialStatus,
        subtotal: new Prisma.Decimal(subtotal),
        deliveryFee: new Prisma.Decimal(deliveryFee),
        total: new Prisma.Decimal(total),
        items: {
          create: lines.map((l) => ({
            menuItemId: l.menuItem.id,
            name: l.menuItem.name,
            emoji: l.menuItem.emoji,
            price: l.menuItem.price,
            qty: l.qty,
            note: l.note,
          })),
        },
        events: { create: { status: initialStatus } },
      },
      include: ORDER_INCLUDE,
    });
  });

  const dto = toOrderDTO(order);
  emitOrderCreated(dto);
  return dto;
}

export async function listOrders(
  restaurantId: string,
  query: ListOrdersQuery,
): Promise<OrderDTO[]> {
  const where: Prisma.OrderWhereInput = { restaurantId };
  if (query.status?.length) where.status = { in: query.status };
  if (query.today) where.createdAt = { gte: startOfToday() };

  const orders = await prisma.order.findMany({
    where,
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(toOrderDTO);
}

/**
 * A guest's own order history, scoped to one restaurant. Matches on the
 * anonymous guest id and/or the phone number they ordered with. Requires at
 * least one identifier — with neither, there is nothing to look up, so we
 * return an empty list rather than leaking the restaurant's whole order book.
 */
export async function listGuestOrders(
  restaurantId: string,
  query: GuestOrdersQuery,
): Promise<OrderDTO[]> {
  const match: Prisma.OrderWhereInput[] = [];
  if (query.guestId) match.push({ guestId: query.guestId });
  if (query.phone) match.push({ customerPhone: query.phone });
  if (match.length === 0) return [];

  const orders = await prisma.order.findMany({
    where: { restaurantId, OR: match },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 25,
  });
  return orders.map(toOrderDTO);
}

export async function getOrderById(id: string): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) throw ApiError.notFound('Order not found');
  return toOrderDTO(order);
}

/** Move an order to a new status, enforcing the shared state machine. */
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<OrderDTO> {
  const current = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw ApiError.notFound('Order not found');

  if (current.status === status) return getOrderById(id);
  if (!canTransition(current.status, status)) {
    throw ApiError.unprocessable(`Cannot move an order from ${current.status} to ${status}`);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status, events: { create: { status } } },
    include: ORDER_INCLUDE,
  });

  const dto = toOrderDTO(updated);
  emitOrderUpdated(dto);
  return dto;
}

/** Advance an order one step along the happy-path pipeline. */
export async function advanceOrder(id: string): Promise<OrderDTO> {
  const current = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw ApiError.notFound('Order not found');
  const next = nextStatus(current.status);
  if (!next) throw ApiError.unprocessable(`Order is already ${current.status}`);
  return updateOrderStatus(id, next);
}

export async function getStats(restaurant: Restaurant): Promise<RestaurantStatsDTO> {
  const since = startOfToday();
  const [ordersToday, liveOrders, todays] = await Promise.all([
    prisma.order.count({ where: { restaurantId: restaurant.id, createdAt: { gte: since } } }),
    prisma.order.count({ where: { restaurantId: restaurant.id, status: { in: LIVE_STATUSES } } }),
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, createdAt: { gte: since } },
      include: { items: true },
    }),
  ]);

  const completed = todays.filter((o) => o.status === 'COMPLETED');
  const revenueToday = round2(completed.reduce((s, o) => s + o.total.toNumber(), 0));
  const avgTicket = completed.length ? round2(revenueToday / completed.length) : 0;

  const tally = new Map<string, number>();
  for (const order of todays) {
    if (order.status === 'REJECTED' || order.status === 'CANCELLED') continue;
    for (const item of order.items) tally.set(item.name, (tally.get(item.name) ?? 0) + item.qty);
  }
  const topItems = [...tally.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return { ordersToday, liveOrders, revenueToday, avgTicket, topItems };
}
