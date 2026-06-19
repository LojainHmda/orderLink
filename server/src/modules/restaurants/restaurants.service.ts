import type { Restaurant } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../errors/ApiError.js';

/** Look up a restaurant by slug or throw a clean 404. */
export async function getRestaurantBySlug(slug: string): Promise<Restaurant> {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) throw ApiError.notFound(`Restaurant "${slug}" not found`);
  return restaurant;
}

export async function listRestaurants(): Promise<Restaurant[]> {
  return prisma.restaurant.findMany({ orderBy: { name: 'asc' } });
}
