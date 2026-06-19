import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS, type OrderDTO } from '@orderlink/shared';
import { getSocket } from '../../lib/socket';
import { restaurantKeys } from '../restaurants/queries';
import { upsertOrder } from './queries';

/**
 * Subscribes to the restaurant's realtime order stream and keeps the React Query
 * cache in sync — new and updated orders appear on the board without a refetch.
 */
export function useOrderStream(restaurantId: string | undefined, slug: string): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!restaurantId) return;
    const socket = getSocket();

    const join = () => socket.emit(SOCKET_EVENTS.JOIN_RESTAURANT, restaurantId);
    join();
    socket.on('connect', join);

    const onChange = (order: OrderDTO) => {
      upsertOrder(qc, slug, order);
      void qc.invalidateQueries({ queryKey: restaurantKeys.stats(slug) });
    };
    socket.on(SOCKET_EVENTS.ORDER_CREATED, onChange);
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, onChange);

    return () => {
      socket.off('connect', join);
      socket.off(SOCKET_EVENTS.ORDER_CREATED, onChange);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, onChange);
    };
  }, [restaurantId, slug, qc]);
}
