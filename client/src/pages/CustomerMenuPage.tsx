import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatMoney, type MenuItemDTO, type OrderType } from '@orderlink/shared';
import { useRestaurant } from '../features/restaurants/queries';
import { groupByCategory, useMenu } from '../features/menu/queries';
import { useCreateOrder } from '../features/orders/queries';

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

  const restaurantQ = useRestaurant(slug);
  const menuQ = useMenu(slug);
  const createOrder = useCreateOrder(slug);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [type, setType] = useState<OrderType>(table ? 'DINE_IN' : 'DELIVERY');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const restaurant = restaurantQ.data;
  const currency = restaurant?.currency ?? '$';
  const groups = groupByCategory(
    (menuQ.data ?? []).filter((m) => m.available),
    restaurant?.categories ?? [],
  );

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

  const placeOrder = () => {
    setError(null);
    if (!name.trim()) {
      setError('Please add your name');
      return;
    }
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
          setError(err instanceof Error ? err.message : 'Could not place order'),
      },
    );
  };

  if (restaurantQ.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-6xl">🔍</div>
        <h1 className="font-headline-md text-headline-md">Menu not found</h1>
        <p className="max-w-xs text-body-md text-secondary">
          This ordering link looks invalid. Please ask the restaurant for an updated link.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-40">
      {/* Header */}
      <header className="bg-primary-container px-4 pb-4 pt-5 text-on-primary-container">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25 text-3xl">
            {restaurant?.emoji ?? '🍽️'}
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold">{restaurant?.name ?? 'Menu'}</h1>
            <p className="text-body-sm opacity-80">{restaurant?.tagline ?? restaurant?.cuisine}</p>
            {table && (
              <span className="mt-1 inline-block rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold">
                Table {table}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Menu */}
      <main className="space-y-8 px-4 py-5">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 font-headline-sm text-headline-sm">{group.category}</h2>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-3xl">
                    {item.emoji ?? '🍽️'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-label-lg text-label-lg">{item.name}</h3>
                    <p className="line-clamp-2 text-body-sm text-secondary">{item.description}</p>
                    <p className="mt-1 font-headline-sm text-headline-sm">{formatMoney(item.price, currency)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(item)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-full bg-primary text-on-primary shadow transition-transform active:scale-90"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Floating cart bar */}
      {count > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-1/2 z-30 flex w-[92%] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-on-primary shadow-xl transition-transform active:scale-[0.98]"
        >
          <span className="flex items-center gap-2 font-label-lg">
            <span className="relative material-symbols-outlined">
              shopping_cart
              <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-on-primary px-1 text-[10px] font-bold text-primary">
                {count}
              </span>
            </span>
            View order
          </span>
          <span className="font-headline-sm">{formatMoney(total, currency)}</span>
        </button>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setCartOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto flex max-h-[92vh] max-w-2xl flex-col rounded-t-3xl bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-4">
              <h2 className="font-headline-sm text-headline-sm">Your order</h2>
              <button type="button" onClick={() => setCartOpen(false)} className="rounded-full p-2 hover:bg-surface-container-high">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.menuItemId} className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-xl">
                      {c.emoji ?? '🍽️'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-label-lg text-label-lg">{c.name}</p>
                      <p className="text-body-sm text-secondary">{formatMoney(c.price, currency)}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-1 py-1">
                      <button type="button" onClick={() => changeQty(c.menuItemId, -1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-container-high">
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="w-5 text-center font-label-lg">{c.qty}</span>
                      <button type="button" onClick={() => changeQty(c.menuItemId, 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 font-label-lg text-label-lg">Order type</p>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-label-md ${
                        type === t.value
                          ? 'border-primary bg-primary-container/20 text-on-primary-container'
                          : 'border-outline-variant text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 focus:border-primary focus:ring-primary" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Phone (optional)" className="w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 focus:border-primary focus:ring-primary" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Notes for the kitchen" className="w-full resize-none rounded-xl border border-outline-variant bg-surface-container px-4 py-3 focus:border-primary focus:ring-primary" />
              </div>
            </div>

            <div className="shrink-0 space-y-2 border-t border-outline-variant bg-surface px-5 py-4">
              <div className="flex justify-between text-body-md text-secondary">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-body-md text-secondary">
                  <span>Delivery</span>
                  <span>{formatMoney(deliveryFee, currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-headline-sm text-headline-sm">
                <span>Total</span>
                <span>{formatMoney(total, currency)}</span>
              </div>
              {belowMin && (
                <p className="text-label-md text-error">
                  Minimum for delivery is {formatMoney(restaurant?.minOrder ?? 0, currency)}.
                </p>
              )}
              {error && <p className="text-label-md text-error">{error}</p>}
              <button
                type="button"
                onClick={placeOrder}
                disabled={cart.length === 0 || belowMin || createOrder.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-label-lg text-on-primary transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined">send</span>
                Place order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
