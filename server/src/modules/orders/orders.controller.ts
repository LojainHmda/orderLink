import {
  createOrderSchema,
  guestOrdersQuerySchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
} from '@orderlink/shared';
import { asyncHandler } from '../../utils/async-handler.js';
import { param } from '../../utils/http.js';
import { getRestaurantBySlug } from '../restaurants/restaurants.service.js';
import * as service from './orders.service.js';

export const list = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  const query = listOrdersQuerySchema.parse(req.query);
  const orders = await service.listOrders(restaurant.id, query);
  res.json(orders);
});

export const create = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  const input = createOrderSchema.parse(req.body);
  const order = await service.createOrder(restaurant, input);
  res.status(201).json(order);
});

export const history = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  const query = guestOrdersQuerySchema.parse(req.query);
  res.json(await service.listGuestOrders(restaurant.id, query));
});

export const stats = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  res.json(await service.getStats(restaurant));
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await service.getOrderById(param(req, 'id')));
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = updateOrderStatusSchema.parse(req.body);
  res.json(await service.updateOrderStatus(param(req, 'id'), status));
});

export const advance = asyncHandler(async (req, res) => {
  res.json(await service.advanceOrder(param(req, 'id')));
});
