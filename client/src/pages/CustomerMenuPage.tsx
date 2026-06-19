import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  formatMoney,
  type MenuItemDTO,
  type OrderDTO,
  type OrderType,
} from '@orderlink/shared';
import { useRestaurant } from '../features/restaurants/queries';
import { groupByCategory, useMenu } from '../features/menu/queries';
import { useCreateOrder, useGuestOrderHistory } from '../features/orders/queries';
import { StatusBadge } from '../components/StatusBadge';
import { CategoryChips } from '../components/CategoryChips';
import { getGuestPhone, rememberGuestPhone } from '../lib/guest';
import { useLang, UI, tr, timeAgoL, type Lang } from '../lib/i18n';

interface CartLine {
  menuItemId: string;
  name: string;
  emoji: string | null;
  price: number;
  qty: number;
}

const TYPES: { value: OrderType; icon: string; label: string }[] = [
  { value: 'DELIVERY', icon: 'delivery_dining', label: 'Delivery' },
  { value: 'PICKUP', icon: 'storefront', label: 'Pickup' },
  { value: 'DINE_IN', icon: 'restaurant', label: 'Dine-in' },
];

export function CustomerMenuPage() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const table = searchParams.get('table');
  const navigate = useNavigate();

  const { lang, toggle } = useLang();
  const t = UI[lang];

  const restaurantQ = useRestaurant(slug);
  const menuQ = useMenu(slug);
  const createOrder = useCreateOrder(slug);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [type, setType] = useState<OrderType>(table ? 'DINE_IN' : 'DELIVERY');
  const [activeCat, setActiveCat] = useState('all');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(() => getGuestPhone());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const restaurant = restaurantQ.data;
  const currency = restaurant?.currency ?? '$';
  const groups = groupByCategory(
    (menuQ.data ?? []).filter((m) => m.available),
    restaurant?.categories ?? [],
  );
  const shown = groups.filter((g) => activeCat === 'all' || g.category === activeCat);

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.qty, 0), [cart]);
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const deliveryFee = type === 'DELIVERY' ? (restaurant?.deliveryFee ?? 0) : 0;
  const total = subtotal + deliveryFee;
  const belowMin =
    type === 'DELIVERY' && (restaurant?.minOrder ?? 0) > 0 && subtotal < (restaurant?.minOrder ?? 0);

  const add = (item: MenuItemDTO) =>
    setCart((prev) => {
      const found = prev.find((c) => c.menuItemId === item.id);
      if (found) return prev.map((c) => (c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { menuItemId: item.id, name: item.name, emoji: item.emoji, price: item.price, qty: 1 }];
    });
  const changeQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev.map((c) => (c.menuItemId === id ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0),
    );

  /** Rebuild the cart from a past order, dropping items no longer on the menu. */
  const reorder = (order: OrderDTO): number => {
    const byId = new Map((menuQ.data ?? []).filter((m) => m.available).map((m) => [m.id, m]));
    const lines: CartLine[] = [];
    for (const it of order.items) {
      const m = it.menuItemId ? byId.get(it.menuItemId) : undefined;
      if (!m) continue;
      const existing = lines.find((l) => l.menuItemId === m.id);
      if (existing) existing.qty += it.qty;
      else lines.push({ menuItemId: m.id, name: m.name, emoji: m.emoji, price: m.price, qty: it.qty });
    }
    if (lines.length === 0) return 0;
    setCart(lines);
    setHistoryOpen(false);
    setCartOpen(true);
    return lines.length;
  };

  const placeOrder = () => {
    setError(null);
    if (!name.trim()) {
      setError(t.addName);
      return;
    }
    rememberGuestPhone(phone);
    createOrder.mutate(
      {
        items: cart.map((c) => ({ menuItemId: c.menuItemId, qty: c.qty })),
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        type,
        channel: 'ONLINE',
        table: table ?? null,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (order) => navigate(`/order/${order.id}`),
        onError: (err: unknown) =>
          setError(err instanceof Error ? err.message : t.orderFailed),
      },
    );
  };

  if (restaurantQ.isError) {
    return (
      <div
        dir={t.dir}
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-3xl">
          🔍
        </div>
        <h1 className="mb-1 font-headline-md text-headline-md text-on-surface">{t.notFoundTitle}</h1>
        <p className="max-w-xs text-body-md text-secondary">{t.notFoundBody}</p>
      </div>
    );
  }

  return (
    <div dir={t.dir} className="mx-auto max-w-2xl pb-24">
      {/* Header */}
      <header className="border-b border-outline-variant bg-surface-container-lowest px-4 pb-4 pt-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-2xl">
            {restaurant?.emoji ?? '🍽️'}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-headline-md text-headline-md text-on-surface">
              {restaurant ? tr(restaurant.name, lang) : t.menuFallback}
            </h1>
            <p className="truncate text-body-sm text-secondary">
              {tr(restaurant?.tagline ?? restaurant?.cuisine, lang)}
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={t.switchTo}
            className="flex shrink-0 items-center gap-1 rounded-full border border-outline-variant px-3 py-2 text-label-md text-on-surface transition active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">language</span>
            {t.switchTo}
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-outline-variant px-3 py-2 text-label-md text-on-surface transition active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            {t.myOrders}
          </button>
        </div>
        {table && (
          <span className="mt-3 inline-block rounded-full bg-primary/8 px-2.5 py-1 text-label-sm font-semibold text-primary">
            {t.table(table)}
          </span>
        )}
      </header>

      {/* Category filter — same chips as the POS menu picker */}
      {groups.length > 0 && (
        <div className="sticky top-0 z-20 border-b border-outline-variant bg-surface-container-lowest/90 px-4 py-3 backdrop-blur sm:px-6">
          <CategoryChips
            categories={groups.map((g) => g.category)}
            active={activeCat}
            onSelect={setActiveCat}
            tone="soft"
            allLabel={t.all}
            labelFor={(c) => tr(c, lang)}
          />
        </div>
      )}

      {/* Menu */}
      <main className="space-y-8 px-4 py-6 sm:px-6">
        {shown.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 text-label-md font-semibold uppercase tracking-[0.12em] text-secondary">
              {tr(group.category, lang)}
            </h2>
            <div className="divide-y divide-outline-variant/60">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3.5 py-4 first:pt-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-container text-3xl">
                    {item.emoji ?? '🍽️'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-body-lg font-semibold text-on-surface">{tr(item.name, lang)}</h3>
                    {item.description && (
                      <p className="line-clamp-1 text-body-md text-secondary">{tr(item.description, lang)}</p>
                    )}
                    <p className="mt-0.5 text-body-lg font-semibold text-on-surface">
                      {formatMoney(item.price, currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`${t.add} ${tr(item.name, lang)}`}
                    onClick={() => add(item)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-outline-variant text-primary transition active:scale-90 hover:bg-primary/8"
                  >
                    <span className="material-symbols-outlined text-[24px]">add</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
        {!menuQ.isLoading && shown.length === 0 && (
          <p className="py-16 text-center text-body-sm text-secondary">
            {groups.length === 0 ? t.emptyMenu : t.emptyCategory}
          </p>
        )}
      </main>

      {/* Floating cart bar */}
      {count > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-0 bottom-3 z-30 mx-auto flex w-[92%] max-w-md items-center justify-between rounded-2xl bg-primary px-4 py-3 text-on-primary shadow-lg transition-transform active:scale-[0.98]"
        >
          <span className="flex items-center gap-2 font-label-lg">
            <span className="relative material-symbols-outlined">
              shopping_cart
              <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-on-primary px-1 text-[10px] font-bold text-primary">
                {count}
              </span>
            </span>
            {t.viewOrder}
          </span>
          <span className="font-headline-sm">{formatMoney(total, currency)}</span>
        </button>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-on-surface/30 backdrop-blur-sm" onClick={() => setCartOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92vh] max-w-2xl flex-col rounded-t-3xl border-t border-outline-variant bg-surface-container-lowest shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-4">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{t.yourOrder}</h2>
              <button type="button" aria-label={t.close} onClick={() => setCartOpen(false)} className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-secondary transition hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-4">
              <div className="divide-y divide-outline-variant/60">
                {cart.map((c) => (
                  <div key={c.menuItemId} className="flex items-center gap-3 py-3 first:pt-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-lg">
                      {c.emoji ?? '🍽️'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-label-lg text-label-lg text-on-surface">{tr(c.name, lang)}</p>
                      <p className="text-body-sm text-secondary">{formatMoney(c.price, currency)}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-outline-variant px-1 py-1">
                      <button type="button" aria-label={t.decrease} onClick={() => changeQty(c.menuItemId, -1)} className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface transition hover:bg-surface-container-high">
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="w-5 text-center font-label-lg text-on-surface">{c.qty}</span>
                      <button type="button" aria-label={t.increase} onClick={() => changeQty(c.menuItemId, 1)} className="flex h-7 w-7 items-center justify-center rounded-full text-primary transition hover:bg-primary/8">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-label-md font-semibold uppercase tracking-[0.12em] text-secondary">{t.orderType}</p>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-label-md transition ${
                        type === opt.value
                          ? 'border-primary bg-primary/8 text-primary'
                          : 'border-outline-variant text-secondary hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{opt.icon}</span>
                      {opt.value === 'DELIVERY' ? t.delivery : opt.value === 'PICKUP' ? t.pickup : t.dineIn}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} className="w-full rounded-xl border border-outline-variant bg-transparent px-3.5 py-3 text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder={t.phoneOptional} className="w-full rounded-xl border border-outline-variant bg-transparent px-3.5 py-3 text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t.kitchenNote} className="w-full resize-none rounded-xl border border-outline-variant bg-transparent px-3.5 py-3 text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>

            <div className="shrink-0 space-y-2 border-t border-outline-variant px-5 py-4">
              <div className="flex justify-between text-body-md text-secondary">
                <span>{t.subtotal}</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-body-md text-secondary">
                  <span>{t.deliveryFee}</span>
                  <span>{formatMoney(deliveryFee, currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-0.5 font-headline-sm text-headline-sm text-on-surface">
                <span>{t.total}</span>
                <span>{formatMoney(total, currency)}</span>
              </div>
              {belowMin && (
                <p className="text-label-md text-error">
                  {t.minDelivery(formatMoney(restaurant?.minOrder ?? 0, currency))}
                </p>
              )}
              {error && <p className="text-label-md text-error">{error}</p>}
              <button
                type="button"
                onClick={placeOrder}
                disabled={cart.length === 0 || belowMin || createOrder.isPending}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-label-lg text-on-primary shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
                {t.placeOrder}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <HistorySheet
          slug={slug}
          currency={currency}
          lang={lang}
          onClose={() => setHistoryOpen(false)}
          onReorder={reorder}
        />
      )}
    </div>
  );
}

/** Bottom sheet listing the guest's previous orders, with quick reorder. */
function HistorySheet({
  slug,
  currency,
  lang,
  onClose,
  onReorder,
}: {
  slug: string;
  currency: string;
  lang: Lang;
  onClose: () => void;
  onReorder: (order: OrderDTO) => number;
}) {
  const t = UI[lang];
  const [phone, setPhone] = useState(() => getGuestPhone());
  const historyQ = useGuestOrderHistory(slug, phone, true);
  const orders = historyQ.data ?? [];
  const [notice, setNotice] = useState<string | null>(null);

  const handleReorder = (order: OrderDTO) => {
    const added = onReorder(order);
    if (added === 0) setNotice(t.notAvailable);
  };

  return (
    <div dir={t.dir} className="fixed inset-0 z-50 bg-on-surface/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] max-w-2xl flex-col rounded-t-3xl border-t border-outline-variant bg-surface-container-lowest shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-4">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{t.myOrders}</h2>
          <button type="button" aria-label={t.close} onClick={onClose} className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-secondary transition hover:bg-surface-container-high">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-4">
          <label className="block">
            <span className="mb-1.5 block text-body-sm text-secondary">{t.historyHint}</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder={t.phoneNumber}
              className="w-full rounded-xl border border-outline-variant bg-transparent px-3.5 py-3 text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {notice && <p className="text-label-md text-error">{notice}</p>}

          {historyQ.isLoading ? (
            <p className="py-12 text-center text-body-sm text-secondary">{t.loading}</p>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-2xl">
                🧾
              </div>
              <p className="font-label-lg text-label-lg text-on-surface">{t.noOrders}</p>
              <p className="text-body-sm text-secondary">{t.noOrdersBody}</p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-outline-variant p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-label-lg text-label-lg text-on-surface">#{order.code}</span>
                    <StatusBadge status={order.status} customer lang={lang} />
                  </div>
                  <span className="text-label-md text-secondary">{timeAgoL(order.createdAt, lang)}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-body-sm text-secondary">
                  {order.items.map((i) => `${i.qty}× ${tr(i.name, lang)}`).join('، ')}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    {formatMoney(order.total, currency)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/order/${order.id}`}
                      className="rounded-full border border-outline-variant px-3.5 py-2 font-label-md text-on-surface transition active:scale-95"
                    >
                      {t.track}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      className="flex items-center gap-1 rounded-full bg-primary px-3.5 py-2 font-label-md text-on-primary transition active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">replay</span>
                      {t.reorder}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
