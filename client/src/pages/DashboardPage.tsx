import { useMemo, useState } from 'react';
import { formatMoney, type OrderDTO } from '@orderlink/shared';
import { DEFAULT_RESTAURANT_SLUG } from '../config';
import { useRestaurant, useRestaurantStats } from '../features/restaurants/queries';
import { useAdvanceOrder, useOrders } from '../features/orders/queries';
import { useOrderStream } from '../features/orders/useOrderStream';
import { StatusBadge } from '../components/StatusBadge';

const ACTIVE: OrderDTO['status'][] = ['NEW', 'PREPARING', 'READY'];

export function DashboardPage() {
  const slug = DEFAULT_RESTAURANT_SLUG;
  const { data: restaurant } = useRestaurant(slug);
  const { data: stats } = useRestaurantStats(slug);
  const ordersQ = useOrders(slug);
  useOrderStream(restaurant?.id, slug);
  const advance = useAdvanceOrder(slug);

  const currency = restaurant?.currency ?? '$';
  const live = useMemo(
    () => (ordersQ.data ?? []).filter((o) => ACTIVE.includes(o.status)),
    [ordersQ.data],
  );
  const shareUrl = `${window.location.origin}/r/${slug}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <header className="mb-6">
        <h1 className="font-headline-md text-headline-md">
          Good day, {restaurant?.name ?? 'there'} 👋
        </h1>
        <p className="text-body-sm text-secondary">Here's what's happening in your kitchen.</p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon="receipt_long" label="Orders today" value={stats ? String(stats.ordersToday) : '—'} />
        <Kpi icon="payments" label="Revenue today" value={stats ? formatMoney(stats.revenueToday, currency) : '—'} />
        <Kpi icon="local_fire_department" label="Live orders" value={stats ? String(stats.liveOrders) : '—'} />
        <Kpi icon="sell" label="Avg. ticket" value={stats ? formatMoney(stats.avgTicket, currency) : '—'} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Live queue */}
        <section className="glass-card rounded-2xl p-5 lg:col-span-2">
          <h2 className="mb-4 font-headline-sm text-headline-sm">Live order queue</h2>
          <div className="space-y-2">
            {live.length === 0 ? (
              <p className="py-8 text-center text-body-sm text-secondary">
                No active orders. Share your menu to get started.
              </p>
            ) : (
              live.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-label-lg text-label-lg">#{order.code}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="truncate text-body-sm text-secondary">
                      {order.customerName} · {order.items.reduce((s, i) => s + i.qty, 0)} items ·{' '}
                      {formatMoney(order.total, currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={advance.isPending}
                    onClick={() => advance.mutate(order.id)}
                    className="whitespace-nowrap rounded-lg bg-primary px-3 py-2 font-label-md text-on-primary transition-all active:scale-95 disabled:opacity-50"
                  >
                    {order.status === 'NEW' ? 'Accept' : order.status === 'PREPARING' ? 'Ready' : 'Complete'}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Side column */}
        <div className="space-y-4">
          <ShareCard shareUrl={shareUrl} />
          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-3 font-headline-sm text-headline-sm">Top sellers today</h2>
            {stats && stats.topItems.length > 0 ? (
              <div className="space-y-3">
                {stats.topItems.map((t) => {
                  const max = stats.topItems[0]?.qty ?? 1;
                  return (
                    <div key={t.name}>
                      <div className="mb-1 flex justify-between text-body-sm">
                        <span className="truncate pr-2 font-label-lg">{t.name}</span>
                        <span className="text-secondary">{t.qty}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((t.qty / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-body-sm text-secondary">No sales yet today.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-3 w-fit rounded-lg bg-primary/10 p-2.5 text-primary">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="font-label-md text-secondary">{label}</p>
      <h3 className="font-headline-lg text-headline-lg text-on-surface">{value}</h3>
    </div>
  );
}

function ShareCard({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=6&data=${encodeURIComponent(shareUrl)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="glass-card rounded-2xl p-5">
      <h2 className="mb-3 font-headline-sm text-headline-sm">Your menu link</h2>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 truncate rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-body-sm">
            {shareUrl}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-2.5 font-label-lg text-on-primary transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-surface-container-high py-2.5 font-label-lg text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Open
            </a>
          </div>
        </div>
        <img src={qr} alt="Menu QR code" width={84} height={84} className="rounded-lg" />
      </div>
    </section>
  );
}
