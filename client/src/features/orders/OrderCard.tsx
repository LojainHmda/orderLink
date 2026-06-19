import { formatMoney, nextStatus, type OrderDTO } from '@orderlink/shared';
import { timeAgo } from '../../lib/format';

const TYPE_META: Record<OrderDTO['type'], { icon: string; label: string }> = {
  DELIVERY: { icon: 'delivery_dining', label: 'Delivery' },
  PICKUP: { icon: 'storefront', label: 'Pickup' },
  DINE_IN: { icon: 'restaurant', label: 'Dine-in' },
};

function advanceLabel(order: OrderDTO): string {
  switch (order.status) {
    case 'NEW':
      return 'Accept';
    case 'PREPARING':
      return 'Mark ready';
    case 'READY':
      return order.type === 'DELIVERY' ? 'Mark delivered' : 'Complete';
    default:
      return '';
  }
}

interface Props {
  order: OrderDTO;
  currency: string;
  isNew?: boolean;
  busy?: boolean;
  onAdvance: (id: string) => void;
  onReject: (id: string) => void;
}

export function OrderCard({ order, currency, isNew, busy, onAdvance, onReject }: Props) {
  const type = TYPE_META[order.type];
  const canAdvance = nextStatus(order.status) !== null;
  const isLive = order.status === 'NEW' || order.status === 'PREPARING' || order.status === 'READY';

  return (
    <article
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm animate-slide-in ${
        order.status === 'NEW' && isNew ? 'animate-new-order border-primary-container' : ''
      }`}
    >
      <header className="mb-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-headline-sm text-headline-sm">#{order.code}</h3>
            <span className="inline-flex items-center gap-1 text-label-sm text-secondary">
              <span className="material-symbols-outlined text-[14px]">
                {order.channel === 'POS' ? 'point_of_sale' : 'smartphone'}
              </span>
              {order.channel === 'POS' ? 'POS' : 'Online'}
            </span>
          </div>
          <p className="font-label-lg text-on-surface">{order.customerName}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-high px-2.5 py-1 font-label-md text-label-md text-on-surface-variant">
          <span className="material-symbols-outlined text-[15px]">{type.icon}</span>
          {type.label}
          {order.table ? ` · T${order.table}` : ''}
        </span>
      </header>

      <ul className="mb-2 space-y-1">
        {order.items.map((item) => (
          <li key={item.id} className="text-body-sm">
            <span className="font-bold">{item.qty}×</span> {item.name}
            {item.note ? <span className="italic text-tertiary"> ({item.note})</span> : null}
          </li>
        ))}
      </ul>

      {order.note ? (
        <p className="mb-2 rounded-lg border border-dashed border-tertiary/30 bg-tertiary-fixed/40 px-3 py-2 text-label-md italic text-on-surface">
          “{order.note}”
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-outline-variant pt-2">
        <p className="font-headline-sm text-headline-sm">{formatMoney(order.total, currency)}</p>
        <p className="flex items-center gap-1 text-label-md text-secondary">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {timeAgo(order.createdAt)}
        </p>
      </div>

      {isLive ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {canAdvance ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdvance(order.id)}
              className="rounded-lg bg-primary py-2.5 font-label-lg text-on-primary transition-all active:scale-95 disabled:opacity-50"
            >
              {advanceLabel(order)}
            </button>
          ) : null}
          {order.status === 'NEW' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject(order.id)}
              className="rounded-lg bg-surface-container-high py-2.5 font-label-lg text-secondary transition-all hover:bg-error-container hover:text-on-error-container disabled:opacity-50"
            >
              Reject
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1 text-label-md text-secondary">
          <span className="material-symbols-outlined text-[18px]">check</span>
          {order.status === 'COMPLETED' ? 'Completed' : 'Closed'} {timeAgo(order.updatedAt)}
        </p>
      )}
    </article>
  );
}
