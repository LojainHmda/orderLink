import { Link } from 'react-router-dom';
import { formatMoney } from '@orderlink/shared';
import { DEFAULT_RESTAURANT_SLUG } from '../config';
import { useRestaurant, useRestaurantStats } from '../features/restaurants/queries';
import { useMenu } from '../features/menu/queries';

// Steps 3 & 4 (steps 1 & 2 are rendered inline because step 2 links out to the
// public customer menu in a new tab).
const STEPS = [
  {
    to: '/orders',
    icon: 'receipt_long',
    step: 'Step 3',
    title: 'Track the kitchen',
    body: 'Orders land live on the board: Requested → Preparing → Ready → Delivered.',
  },
  {
    to: '/pos',
    icon: 'point_of_sale',
    step: 'Step 4',
    title: 'Ring up at the counter',
    body: 'The built-in POS pushes walk-in tickets into the very same pipeline.',
  },
];

export function MainPage() {
  const slug = DEFAULT_RESTAURANT_SLUG;
  const { data: restaurant } = useRestaurant(slug);
  const { data: stats } = useRestaurantStats(slug);
  const menuQ = useMenu(slug);

  const currency = restaurant?.currency ?? '$';
  const demoLink = `/r/${slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      {/* Hero */}
      <section className="pb-8 pt-6 text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-container/30 px-3 py-1 text-label-md text-on-primary-container">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Live order tracking, no app required
        </span>
        <h1 className="mx-auto max-w-3xl font-display-lg text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.05]">
          Share your menu by link.
          <br />
          <span className="text-primary">Take orders in real time.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-body-lg text-secondary">
          {restaurant?.name ?? 'OrderLink'} gives every restaurant a shareable menu, a live kitchen
          board, and a built-in POS — so customers order from a link and you watch each ticket move
          from <b>requested</b> to <b>delivered</b>.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-label-lg text-on-primary transition-all hover:shadow-lg active:scale-95"
          >
            <span className="material-symbols-outlined">dashboard</span>
            Open restaurant console
          </Link>
          <a
            href={demoLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-surface-container-high px-6 py-3 font-label-lg text-on-surface transition-all hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined">smartphone</span>
            Open customer demo menu
          </a>
        </div>

        {/* Live stats strip */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={stats ? String(stats.ordersToday) : '—'} label="Orders today" />
          <Stat value={stats ? String(stats.liveOrders) : '—'} label="Live now" />
          <Stat value={menuQ.data ? String(menuQ.data.length) : '—'} label="Menu items" />
          <Stat
            value={stats ? formatMoney(stats.revenueToday, currency) : '—'}
            label="Revenue today"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="py-8">
        <h2 className="mb-1 text-center font-headline-md text-headline-md">How it works</h2>
        <p className="mb-6 text-center text-body-sm text-secondary">
          Four steps, one continuous flow — every screen shares the same live data.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <StepCard
            icon="restaurant_menu"
            step="Step 1"
            title="Build your menu"
            body="Add dishes, prices and categories. Get a shareable link + QR instantly."
            to="/menu"
          />
          {/* Step 2 opens the public customer menu in a new tab. */}
          <a
            href={demoLink}
            target="_blank"
            rel="noreferrer"
            className="glass-card rounded-2xl p-4 transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/30 text-on-primary-container">
              <span className="material-symbols-outlined">share</span>
            </div>
            <p className="mb-1 text-label-sm text-primary">Step 2</p>
            <h3 className="mb-1 font-headline-sm text-headline-sm">Customer orders</h3>
            <p className="text-body-sm text-secondary">
              They open the link, add to cart and place an order — no app, no signup.
            </p>
          </a>
          {STEPS.map((s) => (
            <StepCard key={s.to} {...s} />
          ))}
        </div>
      </section>

      {/* Tip */}
      <section className="mx-auto max-w-3xl pb-10">
        <div className="flex gap-3 rounded-2xl border border-primary-container/30 bg-primary-container/20 p-4">
          <span className="material-symbols-outlined text-primary">lightbulb</span>
          <p className="text-body-sm text-on-surface">
            Open the <b>customer demo</b> and the <b>orders board</b> in two windows side by side —
            place an order in one and watch it appear live in the other.
          </p>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-3 border-t border-outline-variant py-5 text-body-sm text-secondary sm:flex-row">
        <span>© {new Date().getFullYear()} OrderLink</span>
        <div className="flex gap-4">
          <Link to="/dashboard" className="hover:text-primary">
            Console
          </Link>
          <Link to="/menu" className="hover:text-primary">
            Menu
          </Link>
          <Link to="/orders" className="hover:text-primary">
            Orders
          </Link>
          <Link to="/pos" className="hover:text-primary">
            POS
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="font-headline-lg text-headline-lg text-primary">{value}</p>
      <p className="text-label-md text-secondary">{label}</p>
    </div>
  );
}

function StepCard({
  icon,
  step,
  title,
  body,
  to,
}: {
  icon: string;
  step: string;
  title: string;
  body: string;
  to: string;
}) {
  return (
    <Link to={to} className="glass-card rounded-2xl p-4 transition-shadow hover:shadow-md">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/30 text-on-primary-container">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="mb-1 text-label-sm text-primary">{step}</p>
      <h3 className="mb-1 font-headline-sm text-headline-sm">{title}</h3>
      <p className="text-body-sm text-secondary">{body}</p>
    </Link>
  );
}
