import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MenuItemDTO, MenuItemInput } from '@orderlink/shared';
import { api } from '../../lib/api';

export const menuKeys = {
  list: (slug: string) => ['menu', slug] as const,
};

export function useMenu(slug: string) {
  return useQuery({
    queryKey: menuKeys.list(slug),
    queryFn: async () => (await api.get<MenuItemDTO[]>(`/restaurants/${slug}/menu`)).data,
  });
}

export function useSaveMenuItem(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id?: string; input: MenuItemInput }) => {
      const { id, input } = vars;
      const res = id
        ? await api.put<MenuItemDTO>(`/restaurants/${slug}/menu/${id}`, input)
        : await api.post<MenuItemDTO>(`/restaurants/${slug}/menu`, input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.list(slug) }),
  });
}

export function useSetMenuAvailability(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; available: boolean }) =>
      (await api.patch<MenuItemDTO>(`/restaurants/${slug}/menu/${vars.id}/availability`, {
        available: vars.available,
      })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.list(slug) }),
  });
}

export function useDeleteMenuItem(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/restaurants/${slug}/menu/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.list(slug) }),
  });
}

/** Group a flat menu into ordered category buckets for rendering. */
export function groupByCategory(
  items: MenuItemDTO[],
  categories: string[],
): { category: string; items: MenuItemDTO[] }[] {
  const known = categories.map((category) => ({
    category,
    items: items.filter((i) => i.category === category),
  }));
  // Include any category not in the restaurant's ordered list (defensive).
  const extra = [...new Set(items.map((i) => i.category))]
    .filter((c) => !categories.includes(c))
    .map((category) => ({ category, items: items.filter((i) => i.category === category) }));
  return [...known, ...extra].filter((g) => g.items.length > 0);
}
