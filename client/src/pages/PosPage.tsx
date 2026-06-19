import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { formatMoney, type MenuItemDTO, type OrderType } from '@orderlink/shared';
import { DEFAULT_RESTAURANT_SLUG } from '../config';
import { useRestaurant } from '../features/restaurants/queries';
import { groupByCategory, useMenu } from '../features/menu/queries';
import { useCreateOrder } from '../features/orders/queries';
import { CategoryChips } from '../components/CategoryChips';

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
  const [query, setQuery] = useState('');
  const [sentCode, setSentCode] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const currency = restaurant?.currency ?? '$';
  const available = (menuQ.data ?? []).filter((m) => m.available);
  const groups = groupByCategory(available, restaurant?.categories ?? []);

  // Apply the category filter, then the live text search; drop empty groups.
  const q = query.trim().toLowerCase();
  const shown = groups
    .filter((g) => activeCat === 'all' || g.category === activeCat)
    .map((g) => ({
      category: g.category,
      items: q ? g.items.filter((i) => i.name.toLowerCase().includes(q)) : g.items,
    }))
    .filter((g) => g.items.length > 0);
  const flatShown = shown.flatMap((g) => g.items);

  const qtyById = useMemo(() => new Map(ticket.map((t) => [t.menuItemId, t.qty])), [ticket]);
  const subtotal = useMemo(() => ticket.reduce((s, t) => s + t.price * t.qty, 0), [ticket]);
  const itemCount = ticket.reduce((s, t) => s + t.qty, 0);
  const deliveryFee = type === 'DELIVERY' ? (restaurant?.deliveryFee ?? 0) : 0;
  const total = subtotal + deliveryFee;

  const add = (item: MenuItemDTO) => {
    setSentCode(null);
    setTicket((prev) => {
      const found = prev.find((t) => t.menuItemId === item.id);
      if (found) return prev.map((t) => (t.menuItemId === item.id ? { ...t, qty: t.qty + 1 } : t));
      return [
        ...prev,
        { menuItemId: item.id, name: item.name, emoji: item.emoji, price: item.price, qty: 1 },
      ];
    });
  };

  const changeQty = (id: string, delta: number) =>
    setTicket((prev) =>
      prev
        .map((t) => (t.menuItemId === id ? { ...t, qty: t.qty + delta } : t))
        .filter((t) => t.qty > 0),
    );

  const remove = (id: string) => setTicket((prev) => prev.filter((t) => t.menuItemId !== id));

  // Enter in the search box adds the top match and clears the query — keeps a
  // cashier's hands on the keyboard during a rush.
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && flatShown[0]) {
      add(flatShown[0]);
      setQuery('');
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  };

  const submit = () => {
    if (ticket.length === 0 || createOrder.isPending) return;
    setError(null);
    createOrder.mutate(
      {
        items: ticket.map((t) => ({ menuItemId: t.menuItemId, qty: t.qty })),
        customerName: customer.trim() || 'Walk-in',
        type,
        channel: 'POS',
        table: type === 'DINE_IN' ? table.trim() || null : null,
      },
      {
        onSuccess: (order) => {
          setTicket([]);
          setCustomer('');
          setTable('');
          setSentCode(order.code);
          searchRef.current?.focus();
        },
        onError: (err: unknown) =>
          setError(err instanceof Error ? err.message : 'Could not send the order. Try again.'),
      },
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 md:px-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Menu picker */}
        <section>
          {/* Instant search */}
          <div className="relative mb-3">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-secondary">
              search
            </span>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Search the menu…  (Enter adds the top match)"
              aria-label="Search the menu"
              autoFocus
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-10 focus:border-primary focus:ring-primary"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-secondary hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <CategoryChips
            categories={groups.map((g) => g.category)}
            active={activeCat}
            onSelect={setActiveCat}
            className="mb-3"
          />

          {flatShown.length === 0 ? (
            <p className="py-16 text-center text-body-sm text-secondary">
              {menuQ.isLoading ? 'Loading menu…' : 'No items match your search.'}
            </p>
          ) : (
            <div className="space-y-4">
              {shown.map((group) => (
                <div key={group.category}>
                  <h3 className="mb-2 font-label-lg text-label-lg uppercase tracking-wide text-secondary">
                    {group.category}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {group.items.map((item) => {
                      const qty = qtyById.get(item.id) ?? 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => add(item)}
                          className={`relative rounded-xl border bg-surface-container-lowest p-2.5 text-left transition-all hover:shadow-sm active:scale-95 ${
                            qty > 0 ? 'border-primary ring-1 ring-primary' : 'border-outline-variant hover:border-primary'
                          }`}
                        >
                          {qty > 0 && (
                            <span className="absolute right-1.5 top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-on-primary">
                              {qty}
                            </span>
                          )}
                          <div className="mb-0.5 text-xl">{item.emoji ?? '🍽️'}</div>
                          <p className="line-clamp-2 font-label-lg text-label-lg leading-tight">{item.name}</p>
                          <p className="mt-0.5 font-label-lg text-primary">{formatMoney(item.price, currency)}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ticket */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="flex max-h-[calc(100vh-2rem)] flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm">
                <span className="material-symbols-outlined">receipt</span>
                Ticket
                {itemCount > 0 && (
                  <span className="rounded-full bg-primary-container/40 px-2 py-0.5 font-label-md text-label-md text-on-primary-container">
                    {itemCount}
                  </span>
                )}
              </h2>
              {ticket.length > 0 && (
                <button type="button" onClick={() => setTicket([])} className="text-label-md text-error hover:underline">
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2.5">
              {ticket.length === 0 ? (
                <div className="py-10 text-center">
                  {sentCode != null ? (
                    <div className="text-primary">
                      <span className="material-symbols-outlined text-[40px]">check_circle</span>
                      <p className="mt-1 font-label-lg text-label-lg">Order #{sentCode} sent to the kitchen</p>
                      <p className="text-body-sm text-secondary">Start the next ticket below.</p>
                    </div>
                  ) : (
                    <p className="text-body-sm text-secondary">Tap items to build a ticket.</p>
                  )}
                </div>
              ) : (
                ticket.map((t) => (
                  <div key={t.menuItemId} className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2">
                    <span className="text-xl">{t.emoji ?? '🍽️'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-label-lg text-label-lg">{t.name}</p>
                      <p className="text-body-sm text-secondary">{formatMoney(t.price * t.qty, currency)}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-1 py-0.5">
                      <button
                        type="button"
                        aria-label={t.qty === 1 ? `Remove ${t.name}` : 'Decrease'}
                        onClick={() => (t.qty === 1 ? remove(t.menuItemId) : changeQty(t.menuItemId, -1))}
                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {t.qty === 1 ? 'delete' : 'remove'}
                        </span>
                      </button>
                      <span className="w-4 text-center font-label-md">{t.qty}</span>
                      <button type="button" aria-label="Increase" onClick={() => changeQty(t.menuItemId, 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2.5 border-t border-outline-variant px-4 py-3">
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
                {type === 'DINE_IN' && (
                  <input
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    placeholder="Table"
                    aria-label="Table number"
                    className="w-20 rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 focus:border-primary focus:ring-primary"
                  />
                )}
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
              {error && (
                <p className="flex items-center gap-1.5 rounded-lg bg-error-container/40 px-3 py-2 text-label-md text-on-error-container">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={ticket.length === 0 || createOrder.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-label-lg text-on-primary transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">{createOrder.isPending ? 'hourglass_top' : 'point_of_sale'}</span>
                {createOrder.isPending ? 'Sending…' : 'Send to kitchen'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
