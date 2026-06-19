import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ORDER_PIPELINE,
  SOCKET_EVENTS,
  formatMoney,
  type OrderDTO,
  type OrderStatus,
} from '@orderlink/shared';
import { useOrder, orderKeys } from '../features/orders/queries';
import { useRestaurant } from '../features/restaurants/queries';
import { getSocket } from '../lib/socket';

function steps(order: OrderDTO): { key: OrderStatus; label: string; icon: string }[] {
  const isDelivery = order.type === 'DELIVERY';
  return [
    { key: 'NEW', label: 'Order received', icon: 'receipt_long' },
    { key: 'PREPARING', label: 'Preparing your food', icon: 'skillet' },
    {
      key: 'READY',
      label: isDelivery ? 'Out for delivery' : 'Ready for you',
      icon: isDelivery ? 'delivery_dining' : 'check_circle',
    },
    { key: 'COMPLETED', label: isDelivery ? 'Delivered' : 'Completed', icon: 'task_alt' },
  ];
}

export function OrderStatusPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const orderQ = useOrder(id);
  const order = orderQ.data;
  // Look up by slug (not id) — this drives the currency and the "Order more" link.
  const restaurantQ = useRestaurant(order?.restaurantSlug ?? '');

  // Live updates: join the restaurant room and patch this order on changes.
  useEffect(() => {
    if (!order?.restaurantId) return;
    const socket = getSocket();
    const join = () => socket.emit(SOCKET_EVENTS.JOIN_RESTAURANT, order.restaurantId);
    join();
    socket.on('connect', join);
    const onUpdate = (updated: OrderDTO) => {
      if (updated.id === id) qc.setQueryData(orderKeys.detail(id), updated);
    };
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, onUpdate);
    return () => {
      socket.off('connect', join);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, onUpdate);
    };
  }, [order?.restaurantId, id, qc]);

  if (orderQ.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-6xl">🧾</div>
        <h1 className="font-headline-md text-headline-md">Order not found</h1>
      </div>
    );
  }
  if (!order) {
    return <div className="flex min-h-screen items-center justify-center text-secondary">Loading…</div>;
  }

  const currency = restaurantQ.data?.currency ?? '$';
  const rejected = order.status === 'REJECTED' || order.status === 'CANCELLED';
  const idx = ORDER_PIPELINE.indexOf(order.status);
  const flow = steps(order);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="bg-primary px-4 pb-6 pt-5 text-center text-on-primary">
        <div className="mx-auto mb-2.5 flex h-16 w-16 items-center justify-center rounded-full bg-white/25">
          <span className="material-symbols-outlined text-[32px]">
            {rejected ? 'cancel' : order.status === 'COMPLETED' ? 'task_alt' : (flow[Math.max(0, idx)]?.icon ?? 'receipt_long')}
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md font-bold">
          {rejected ? 'Order declined' : order.status === 'COMPLETED' ? 'All done — enjoy!' : (flow[Math.max(0, idx)]?.label ?? 'Order received')}
        </h1>
        <div className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-label-md">
          <span className="material-symbols-outlined text-[16px]">tag</span>
          {order.code}
        </div>
      </header>

      <main className="-mt-4 flex-1 space-y-4 rounded-t-3xl bg-surface px-4 py-5">
        {/* Stepper */}
        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          {rejected ? (
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined">cancel</span>
              <p className="font-label-lg text-label-lg">This order was declined by the restaurant.</p>
            </div>
          ) : (
            flow.map((step, i) => {
              const done = i < idx;
              const current = i === idx;
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        done || current ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-secondary'
                      } ${current ? 'animate-new-order' : ''}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{done ? 'check' : step.icon}</span>
                    </div>
                    {i < flow.length - 1 && (
                      <div className={`my-1 w-0.5 flex-1 ${i < idx ? 'bg-primary' : 'bg-outline-variant'}`} />
                    )}
                  </div>
                  <div className="pb-4 pt-1">
                    <p className={`font-label-lg text-label-lg ${done || current ? 'text-on-surface' : 'text-secondary'}`}>
                      {step.label}
                    </p>
                    {current && <p className="text-label-md text-primary">In progress…</p>}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Summary */}
        <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <h2 className="font-headline-sm text-headline-sm">Order summary</h2>
            <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-label-md text-on-surface-variant">
              {order.type === 'DELIVERY' ? 'Delivery' : order.type === 'PICKUP' ? 'Pickup' : 'Dine-in'}
              {order.table ? ` · Table ${order.table}` : ''}
            </span>
          </div>
          <div className="divide-y divide-outline-variant px-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">{item.emoji ?? '🍽️'}</span>
                  <span className="font-label-lg text-label-lg">
                    <span className="font-bold text-primary">{item.qty}× </span>
                    {item.name}
                  </span>
                </span>
                <span className="text-body-md">{formatMoney(item.price * item.qty, currency)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 bg-surface-container-low px-4 py-3">
            <div className="flex justify-between text-body-sm text-secondary">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal, currency)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-body-sm text-secondary">
                <span>Delivery</span>
                <span>{formatMoney(order.deliveryFee, currency)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 font-headline-sm text-headline-sm">
              <span>Total</span>
              <span>{formatMoney(order.total, currency)}</span>
            </div>
          </div>
        </section>

        {order.note && (
          <div className="rounded-2xl border border-tertiary/20 bg-tertiary-fixed/40 p-4">
            <p className="mb-1 font-label-md text-secondary">Your note</p>
            <p className="text-body-md italic">“{order.note}”</p>
          </div>
        )}

        <Link
          to={`/r/${order.restaurantSlug}`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-container-high py-3 font-label-lg text-on-surface"
        >
          <span className="material-symbols-outlined">add</span>
          Order more
        </Link>
      </main>
    </div>
  );
}
