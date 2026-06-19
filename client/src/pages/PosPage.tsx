import { useMemo, useState } from 'react';
import { formatMoney, type MenuItemDTO, type OrderType } from '@orderlink/shared';
import { DEFAULT_RESTAURANT_SLUG } from '../config';
import { useRestaurant } from '../features/restaurants/queries';
import { groupByCategory, useMenu } from '../features/menu/queries';
import { useCreateOrder } from '../features/orders/queries';

interface TicketLine {
  menuItemId: string;
  name: string;
  emoji: string | null;
  price: number;
  qty: number;
}

const TYPES: { value: OrderType; icon: string; label: string }[] = [
  { value: 'DINE_IN', icon: 'restaurant', label: 'Dine-in' },
  { value: 'PICKUP', icon: 'storefront', label: 'Pickup' },
  { value: 'DELIVERY', icon: 'delivery_dining', label: 'Delivery' },
];

export function PosPage() {
  const slug = DEFAULT_RESTAURANT_SLUG;
  const { data: restaurant } = useRestaurant(slug);
  const menuQ = useMenu(slug);
  const createOrder = useCreateOrder(slug);

  const [ticket, setTicket] = useState<TicketLine[]>([]);
  const [type, setType] = useState<OrderType>('DINE_IN');
  const [customer, setCustomer] = useState('');
  const [table, setTable] = useState('');
  const [activeCat, setActiveCat] = useState('all');

  const currency = restaurant?.currency ?? '$';
  const categories = restaurant?.categories ?? [];
  const groups = groupByCategory(
    (menuQ.data ?? []).filter((m) => m.available),
    categories,
  );
  const shown = groups.filter((g) => activeCat === 'all' || g.category === activeCat);

  const subtotal = useMemo(
    () => ticket.reduce((s, t) => s + t.price * t.qty, 0),
    [ticket],
  );
  const deliveryFee = type === 'DELIVERY' ? (restaurant?.deliveryFee ?? 0) : 0;
  const total = subtotal + deliveryFee;

  const add = (item: MenuItemDTO) =>
    setTicket((prev) => {
      const found = prev.find((t) => t.menuItemId === item.id);
      if (found) return prev.map((t) => (t.menuItemId === item.id ? { ...t, qty: t.qty + 1 } : t));
      return [
        ...prev,
        { menuItemId: item.id, name: item.name, emoji: item.emoji, price: item.price, qty: 1 },
      ];
    });

  const changeQty = (id: string, delta: number) =>
    setTicket((prev) =>
      prev
        .map((t) => (t.menuItemId === id ? { ...t, qty: t.qty + delta } : t))
        .filter((t) => t.qty > 0),
    );

  const submit = () => {
    if (ticket.length === 0) return;
    createOrder.mutate(
      {
        items: ticket.map((t) => ({ menuItemId: t.menuItemId, qty: t.qty })),
        customerName: customer.trim() || 'Walk-in',
        type,
        channel: 'POS',
        table: table.trim() || null,
      },
      {
        onSuccess: () => {
          setTicket([]);
          setCustomer('');
          setTable('');
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Menu picker */}
        <section>
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {['all', ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCat(c)}
                className={`whitespace-nowrap rounded-full px-4 py-2 font-label-lg text-label-lg ${
                  c === activeCat ? 'bg-on-surface text-surface' : 'bg-surface-container-high text-on-surface'
                }`}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
          <div className="space-y-6">
            {shown.map((group) => (
              <div key={group.category}>
                <h3 className="mb-2 font-label-lg text-label-lg uppercase tracking-wide text-secondary">
                  {group.category}
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => add(item)}
                      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-left transition-all hover:border-primary hover:shadow-sm active:scale-95"
                    >
                      <div className="mb-1 text-2xl">{item.emoji ?? '🍽️'}</div>
                      <p className="line-clamp-2 font-label-lg text-label-lg leading-tight">{item.name}</p>
                      <p className="mt-1 font-label-lg text-primary">{formatMoney(item.price, currency)}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ticket */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex max-h-[calc(100vh-3rem)] flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm">
                <span className="material-symbols-outlined">receipt</span>Ticket
              </h2>
              {ticket.length > 0 && (
                <button type="button" onClick={() => setTicket([])} className="text-label-md text-error hover:underline">
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {ticket.length === 0 ? (
                <p className="py-10 text-center text-secondary">Tap items to build a ticket.</p>
              ) : (
                ticket.map((t) => (
                  <div key={t.menuItemId} className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2">
                    <span className="text-xl">{t.emoji ?? '🍽️'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-label-lg text-label-lg">{t.name}</p>
                      <p className="text-body-sm text-secondary">{formatMoney(t.price * t.qty, currency)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface px-1 py-0.5">
                      <button type="button" onClick={() => changeQty(t.menuItemId, -1)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-surface-container-high">
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="w-4 text-center font-label-md">{t.qty}</span>
                      <button type="button" onClick={() => changeQty(t.menuItemId, 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-outline-variant px-5 py-4">
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg border py-2 text-label-md ${
                      type === t.value
                        ? 'border-primary bg-primary-container/20 text-on-primary-container'
                        : 'border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Customer name"
                  className="flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 focus:border-primary focus:ring-primary"
                />
                <input
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  placeholder="Table"
                  className="w-20 rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-body-sm text-secondary">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal, currency)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-body-sm text-secondary">
                    <span>Delivery</span>
                    <span>{formatMoney(deliveryFee, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-headline-sm text-headline-sm">
                  <span>Total</span>
                  <span>{formatMoney(total, currency)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={ticket.length === 0 || createOrder.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-label-lg text-on-primary transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">point_of_sale</span>
                Send to kitchen
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
