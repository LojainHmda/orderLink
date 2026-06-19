import { useMemo } from 'react';
import { formatMoney, type OrderDTO, type OrderStatus } from '@orderlink/shared';
import { DEFAULT_RESTAURANT_SLUG } from '../config';
import { useRestaurant, useRestaurantStats } from '../features/restaurants/queries';
import { useAdvanceOrder, useOrders, useUpdateOrderStatus } from '../features/orders/queries';
import { useOrderStream } from '../features/orders/useOrderStream';
import { OrderCard } from '../features/orders/OrderCard';

const LANES: { key: OrderStatus; title: string; icon: string }[] = [
  { key: 'NEW', title: 'Requested', icon: 'notifications_active' },
  { key: 'PREPARING', title: 'Preparing', icon: 'skillet' },
  { key: 'READY', title: 'Ready', icon: 'check_circle' },
  { key: 'COMPLETED', title: 'Completed', icon: 'task_alt' },
];

function groupByStatus(orders: OrderDTO[]): Record<OrderStatus, OrderDTO[]> {
  const groups: Record<OrderStatus, OrderDTO[]> = {
    NEW: [],
    PREPARING: [],
    READY: [],
    COMPLETED: [],
    REJECTED: [],
    CANCELLED: [],
  };
  for (const order of orders) groups[order.status].push(order);
  return groups;
}

export function OrderBoardPage() {
  const slug = DEFAULT_RESTAURANT_SLUG;
  const restaurantQ = useRestaurant(slug);
  const statsQ = useRestaurantStats(slug);
  const ordersQ = useOrders(slug);
  useOrderStream(restaurantQ.data?.id, slug);

  const advance = useAdvanceOrder(slug);
  const updateStatus = useUpdateOrderStatus(slug);
  const busy = advance.isPending || updateStatus.isPending;
  const currency = restaurantQ.data?.currency ?? '$';

  const grouped = useMemo(() => groupByStatus(ordersQ.data ?? []), [ordersQ.data]);
  const stats = statsQ.data;

  if (restaurantQ.isError) {
    return <CenteredMessage emoji="🔍" title="Restaurant not found" />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-headline-md text-headline-md">
            {restaurantQ.data?.name ?? 'Order board'}
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/30 px-2 py-0.5 text-label-md text-on-primary-container">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Live
          </span>
        </div>
        <p className="text-body-sm text-secondary">
          Orders flow in real time — accept, prepare, and complete each ticket.
        </p>
      </header>

      {/* KPIs */}
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Live orders" value={stats ? String(stats.liveOrders) : '—'} />
        <Kpi label="Orders today" value={stats ? String(stats.ordersToday) : '—'} />
        <Kpi label="Revenue today" value={stats ? formatMoney(stats.revenueToday, currency) : '—'} />
        <Kpi label="Avg. ticket" value={stats ? formatMoney(stats.avgTicket, currency) : '—'} />
      </section>

      {ordersQ.isError ? (
        <CenteredMessage emoji="⚠️" title="Couldn't load orders" subtitle="Is the API running?" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LANES.map((lane) => {
            const list =
              lane.key === 'COMPLETED' ? grouped.COMPLETED.slice(0, 12) : grouped[lane.key];
            return (
              <section key={lane.key}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant">
                      {lane.icon}
                    </span>
                    <h2 className="font-label-lg text-label-lg">{lane.title}</h2>
                  </div>
                  <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-md text-on-surface-variant">
                    {list.length}
                  </span>
                </div>
                <div className="min-h-[120px] space-y-3 rounded-xl bg-surface-container-low/40 p-2">
                  {ordersQ.isLoading ? (
                    <p className="py-8 text-center text-body-sm text-secondary">Loading…</p>
                  ) : list.length === 0 ? (
                    <p className="py-8 text-center text-body-sm text-secondary">No orders</p>
                  ) : (
                    list.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        currency={currency}
                        busy={busy}
                        onAdvance={(id) => advance.mutate(id)}
                        onReject={(id) => updateStatus.mutate({ id, status: 'REJECTED' })}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <p className="font-label-md text-secondary">{label}</p>
      <p className="font-headline-md text-headline-md">{value}</p>
    </div>
  );
}

function CenteredMessage({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-3 text-5xl">{emoji}</div>
      <h2 className="font-headline-sm text-headline-sm">{title}</h2>
      {subtitle ? <p className="text-body-sm text-secondary">{subtitle}</p> : null}
    </div>
  );
}
