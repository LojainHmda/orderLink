import { z } from 'zod';
import { menuItemInputSchema } from '@orderlink/shared';
import { asyncHandler } from '../../utils/async-handler.js';
import { param } from '../../utils/http.js';
import { toMenuItemDTO } from '../../lib/serializers.js';
import { getRestaurantBySlug } from '../restaurants/restaurants.service.js';
import * as service from './menu.service.js';

const availabilitySchema = z.object({ available: z.boolean() });

export const list = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  const items = await service.listMenu(restaurant.id);
  res.json(items.map(toMenuItemDTO));
});

export const create = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  const input = menuItemInputSchema.parse(req.body);
  const item = await service.createMenuItem(restaurant.id, input);
  res.status(201).json(toMenuItemDTO(item));
});

export const update = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  const input = menuItemInputSchema.parse(req.body);
  const item = await service.updateMenuItem(restaurant.id, param(req, 'itemId'), input);
  res.json(toMenuItemDTO(item));
});

export const setAvailability = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  const { available } = availabilitySchema.parse(req.body);
  const item = await service.setAvailability(restaurant.id, param(req, 'itemId'), available);
  res.json(toMenuItemDTO(item));
});

export const remove = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  await service.deleteMenuItem(restaurant.id, param(req, 'itemId'));
  res.status(204).end();
});
