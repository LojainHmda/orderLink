import { Prisma, type MenuItem } from '@prisma/client';
import type { MenuItemInput } from '@orderlink/shared';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../errors/ApiError.js';

export async function listMenu(restaurantId: string): Promise<MenuItem[]> {
  return prisma.menuItem.findMany({
    where: { restaurantId },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

async function getOwnedItem(restaurantId: string, itemId: string): Promise<MenuItem> {
  const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
  if (!item) throw ApiError.notFound('Menu item not found');
  return item;
}

/** Add a category to the restaurant's ordered category list if it's new. */
async function ensureCategory(restaurantId: string, category: string): Promise<void> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { categories: true },
  });
  if (restaurant && !restaurant.categories.includes(category)) {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { categories: { push: category } },
    });
  }
}

export async function createMenuItem(restaurantId: string, input: MenuItemInput): Promise<MenuItem> {
  await ensureCategory(restaurantId, input.category);
  return prisma.menuItem.create({
    data: {
      restaurantId,
      name: input.name,
      description: input.description,
      category: input.category,
      price: new Prisma.Decimal(input.price),
      emoji: input.emoji,
      available: input.available,
    },
  });
}

export async function updateMenuItem(
  restaurantId: string,
  itemId: string,
  input: MenuItemInput,
): Promise<MenuItem> {
  await getOwnedItem(restaurantId, itemId);
  await ensureCategory(restaurantId, input.category);
  return prisma.menuItem.update({
    where: { id: itemId },
    data: {
      name: input.name,
      description: input.description,
      category: input.category,
      price: new Prisma.Decimal(input.price),
      emoji: input.emoji,
      available: input.available,
    },
  });
}

export async function setAvailability(
  restaurantId: string,
  itemId: string,
  available: boolean,
): Promise<MenuItem> {
  await getOwnedItem(restaurantId, itemId);
  return prisma.menuItem.update({ where: { id: itemId }, data: { available } });
}

export async function deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
  await getOwnedItem(restaurantId, itemId);
  await prisma.menuItem.delete({ where: { id: itemId } });
}
