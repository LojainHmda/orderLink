import { useQuery } from '@tanstack/react-query';
import type { RestaurantDTO, RestaurantStatsDTO } from '@orderlink/shared';
import { api } from '../../lib/api';

export const restaurantKeys = {
  detail: (slug: string) => ['restaurant', slug] as const,
  stats: (slug: string) => ['restaurant', slug, 'stats'] as const,
};

export function useRestaurant(slug: string) {
  return useQuery({
    queryKey: restaurantKeys.detail(slug),
    queryFn: async () => (await api.get<RestaurantDTO>(`/restaurants/${slug}`)).data,
    staleTime: 5 * 60_000,
  });
}

export function useRestaurantStats(slug: string) {
  return useQuery({
    queryKey: restaurantKeys.stats(slug),
    queryFn: async () => (await api.get<RestaurantStatsDTO>(`/restaurants/${slug}/stats`)).data,
    refetchInterval: 30_000,
  });
}
