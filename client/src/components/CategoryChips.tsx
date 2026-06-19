import clsx from 'clsx';

interface Props {
  /** Restaurant categories, in display order. An "All" chip is prepended. */
  categories: string[];
  /** Currently selected category, or 'all'. */
  active: string;
  onSelect: (category: string) => void;
  className?: string;
  /**
   * Visual weight. `'solid'` (default) is the bold POS pill; `'soft'` is a
   * calmer, low-contrast variant used on the public customer menu.
   */
  tone?: 'solid' | 'soft';
  /** Label for the leading "all" chip. Defaults to `'All'`. */
  allLabel?: string;
  /** Maps a category value to its display label (e.g. for translation). */
  labelFor?: (category: string) => string;
}

const TONES = {
  solid: {
    active: 'bg-primary text-on-primary',
    inactive: 'bg-surface-container-high text-on-surface',
  },
  soft: {
    active: 'bg-primary text-on-primary shadow-sm',
    inactive: 'text-secondary hover:bg-surface-container-low',
  },
} as const;

/**
 * Horizontally-scrollable category filter pills. Shared by the POS menu picker
 * and the public customer menu so both stay visually and behaviourally in sync.
 */
export function CategoryChips({
  categories,
  active,
  onSelect,
  className,
  tone = 'solid',
  allLabel = 'All',
  labelFor,
}: Props) {
  const styles = TONES[tone];
  return (
    <div className={clsx('no-scrollbar flex gap-2 overflow-x-auto', className)}>
      {['all', ...categories].map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onSelect(c)}
          className={clsx(
            'whitespace-nowrap rounded-full px-4 py-2 font-label-lg text-label-lg transition-colors',
            c === active ? styles.active : styles.inactive,
          )}
        >
          {c === 'all' ? allLabel : labelFor ? labelFor(c) : c}
        </button>
      ))}
    </div>
  );
}
