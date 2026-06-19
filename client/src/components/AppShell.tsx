import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { DEFAULT_RESTAURANT_SLUG } from '../config';
import { useRestaurant } from '../features/restaurants/queries';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/orders', label: 'Orders', icon: 'receipt_long' },
  { to: '/pos', label: 'POS', icon: 'point_of_sale' },
  { to: '/menu', label: 'Menu', icon: 'restaurant_menu' },
];

export function AppShell() {
  const slug = DEFAULT_RESTAURANT_SLUG;
  const { data: restaurant } = useRestaurant(slug);
  const liveMenuUrl = `/r/${slug}`;

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col bg-surface-container-low p-6 shadow-md md:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-xl text-on-primary-container">
            {restaurant?.emoji ?? '🍽️'}
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold leading-tight text-on-surface">
              {restaurant?.name ?? 'OrderLink'}
            </h1>
            <p className="font-label-md text-label-md text-secondary">Restaurant Console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <a
          href={liveMenuUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 font-label-lg text-on-primary transition-all hover:shadow-lg active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
          View live menu
        </a>
      </aside>

      {/* Mobile top nav */}
      <header className="sticky top-0 z-40 flex items-center gap-3 overflow-x-auto bg-surface-container-low px-4 py-2 shadow-sm md:hidden">
        <div className="flex shrink-0 items-center gap-2 pr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
            {restaurant?.emoji ?? '🍽️'}
          </div>
        </div>
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} compact />
        ))}
      </header>

      <main className="md:ml-[260px]">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon,
  compact,
}: {
  to: string;
  label: string;
  icon: string;
  compact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg px-4 py-3 font-label-lg text-label-lg transition-all',
          compact && 'shrink-0 px-3 py-2',
          isActive
            ? 'bg-primary-container font-bold text-on-primary-container'
            : 'text-on-surface-variant hover:bg-surface-container-highest',
        )
      }
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className={compact ? 'text-label-md' : ''}>{label}</span>
    </NavLink>
  );
}
