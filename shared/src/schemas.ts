/**
 * Zod schemas for every API input. The server validates against these and the
 * client can reuse them for form validation — one definition, no duplication.
 */
import { z } from 'zod';
import { ORDER_STATUSES } from './order-status.js';

export const orderTypeSchema = z.enum(['DELIVERY', 'PICKUP', 'DINE_IN']);
export type OrderType = z.infer<typeof orderTypeSchema>;

export const orderChannelSchema = z.enum(['ONLINE', 'POS']);
export type OrderChannel = z.infer<typeof orderChannelSchema>;

export const orderStatusSchema = z.enum(ORDER_STATUSES);

/* --------------------------------- Menu --------------------------------- */
export const menuItemInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional().default(''),
  category: z.string().trim().min(1).max(60),
  price: z.number().nonnegative().finite(),
  emoji: z.string().trim().max(8).optional(),
  available: z.boolean().optional().default(true),
});
export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

/* -------------------------------- Orders -------------------------------- */
export const createOrderItemSchema = z.object({
  menuItemId: z.string().trim().min(1),
  qty: z.number().int().positive().max(99),
  note: z.string().trim().max(200).optional(),
});
export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;

export const createOrderSchema = z.object({
  type: orderTypeSchema.default('DELIVERY'),
  channel: orderChannelSchema.default('ONLINE'),
  table: z.string().trim().max(20).nullish(),
  customerName: z.string().trim().min(1).max(80),
  customerPhone: z.string().trim().max(30).optional(),
  note: z.string().trim().max(500).optional(),
  items: z.array(createOrderItemSchema).min(1, 'An order needs at least one item'),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const listOrdersQuerySchema = z.object({
  status: z
    .union([orderStatusSchema, z.array(orderStatusSchema)])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v])),
  today: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((v) => v === true || v === 'true'),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
