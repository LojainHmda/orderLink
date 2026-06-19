import { asyncHandler } from '../../utils/async-handler.js';
import { param } from '../../utils/http.js';
import { toRestaurantDTO } from '../../lib/serializers.js';
import { getRestaurantBySlug, listRestaurants } from './restaurants.service.js';

export const list = asyncHandler(async (_req, res) => {
  const restaurants = await listRestaurants();
  res.json(restaurants.map(toRestaurantDTO));
});

export const getBySlug = asyncHandler(async (req, res) => {
  const restaurant = await getRestaurantBySlug(param(req, 'slug'));
  res.json(toRestaurantDTO(restaurant));
});
