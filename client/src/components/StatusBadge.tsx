import clsx from 'clsx';
import { ORDER_STATUS_META, type OrderStatus } from '@orderlink/shared';
import { statusCustomerLabel, type Lang } from '../lib/i18n';

const TONE_CLASSES: Record<string, string> = {
  info: 'bg-tertiary-container/30 text-on-tertiary-container',
  warning: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  primary: 'bg-primary-container/30 text-on-primary-container',
  success: 'bg-primary text-on-primary',
  error: 'bg-error-container text-on-error-container',
};

interface Props {
  status: OrderStatus;
  customer?: boolean;
  /** Language for the customer label (defaults to English). */
  lang?: Lang;
}

export function StatusBadge({ status, customer = false, lang = 'en' }: Props) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label-md text-label-md',
        TONE_CLASSES[meta.tone],
      )}
    >
      <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
      {customer ? statusCustomerLabel(status, lang) : meta.label}
    </span>
  );
}
