import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { CreateOrderInput, OrderDTO, OrderStatus } from '@orderlink/shared';
import { api } from '../../lib/api';

export const orderKeys = {
  all: ['orders'] as const,
  list: (slug: string) => [...orderKeys.all, slug] as const,
  detail: (id: string) => ['order', id] as const,
};

/** Insert or replace an order in the cached list, keeping newest first. */
export function upsertOrder(qc: QueryClient, slug: string, order: OrderDTO): void {
  qc.setQueryData<OrderDTO[]>(orderKeys.list(slug), (prev) => {
    if (!prev) return [order];
    const idx = prev.findIndex((o) => o.id === order.id);
    if (idx === -1) return [order, ...prev];
    const next = prev.slice();
    next[idx] = order;
    return next;
  });
}

export function useOrders(slug: string) {
  return useQuery({
    queryKey: orderKeys.list(slug),
    queryFn: async () => (await api.get<OrderDTO[]>(`/restaurants/${slug}/orders`)).data,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => (await api.get<OrderDTO>(`/orders/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useCreateOrder(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) =>
      (await api.post<OrderDTO>(`/restaurants/${slug}/orders`, input)).data,
    onSuccess: (order) => upsertOrder(qc, slug, order),
  });
}

export function useAdvanceOrder(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<OrderDTO>(`/orders/${id}/advance`)).data,
    onSuccess: (order) => upsertOrder(qc, slug, order),
  });
}

export function useUpdateOrderStatus(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: OrderStatus }) =>
      (await api.patch<OrderDTO>(`/orders/${vars.id}/status`, { status: vars.status })).data,
    onSuccess: (order) => upsertOrder(qc, slug, order),
  });
}
