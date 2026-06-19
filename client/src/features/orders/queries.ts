import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { CreateOrderInput, OrderDTO, OrderStatus } from '@orderlink/shared';
import { api } from '../../lib/api';
import { getGuestId } from '../../lib/guest';

export const orderKeys = {
  all: ['orders'] as const,
  list: (slug: string) => [...orderKeys.all, slug] as const,
  detail: (id: string) => ['order', id] as const,
  history: (slug: string, phone: string) => ['orderHistory', slug, phone] as const,
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
    // Stamp every order with the anonymous guest id so the customer can find it
    // again under "My orders" (the server keeps any explicitly-provided id).
    mutationFn: async (input: CreateOrderInput) =>
      (await api.post<OrderDTO>(`/restaurants/${slug}/orders`, { guestId: getGuestId(), ...input }))
        .data,
    onSuccess: (order) => {
      upsertOrder(qc, slug, order);
      qc.invalidateQueries({ queryKey: ['orderHistory', slug] });
    },
  });
}

/**
 * A guest's own past orders for this restaurant, looked up by their anonymous
 * guest id (always) plus an optional phone number (broadens the match across
 * devices). No login required.
 */
export function useGuestOrderHistory(slug: string, phone: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.history(slug, phone),
    queryFn: async () => {
      const params = new URLSearchParams({ guestId: getGuestId() });
      if (phone.trim()) params.set('phone', phone.trim());
      return (await api.get<OrderDTO[]>(`/restaurants/${slug}/orders/history?${params}`)).data;
    },
    enabled: enabled && Boolean(slug),
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
