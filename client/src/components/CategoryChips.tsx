import clsx from 'clsx';

interface Props {
  /** Restaurant categories, in display order. An "All" chip is prepended. */
  categories: string[];
  /** Currently selected category, or 'all'. */
  active: string;
  onSelect: (category: string) => void;
  className?: string;
}

/**
 * Horizontally-scrollable category filter pills. Shared by the POS menu picker
 * and the public customer menu so both stay visually and behaviourally in sync.
 */
export function CategoryChips({ categories, active, onSelect, className }: Props) {
  return (
    <div className={clsx('no-scrollbar flex gap-2 overflow-x-auto', className)}>
      {['all', ...categories].map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onSelect(c)}
          className={clsx(
            'whitespace-nowrap rounded-full px-4 py-2 font-label-lg text-label-lg transition-colors',
            c === active
              ? 'bg-on-surface text-surface'
              : 'bg-surface-container-high text-on-surface',
          )}
        >
          {c === 'all' ? 'All' : c}
        </button>
      ))}
    </div>
  );
}
