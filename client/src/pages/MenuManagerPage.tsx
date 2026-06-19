import { useState, type FormEvent } from 'react';
import type { MenuItemDTO, MenuItemInput } from '@orderlink/shared';
import { formatMoney } from '@orderlink/shared';
import { DEFAULT_RESTAURANT_SLUG } from '../config';
import { useRestaurant } from '../features/restaurants/queries';
import {
  groupByCategory,
  useDeleteMenuItem,
  useMenu,
  useSaveMenuItem,
  useSetMenuAvailability,
} from '../features/menu/queries';

export function MenuManagerPage() {
  const slug = DEFAULT_RESTAURANT_SLUG;
  const { data: restaurant } = useRestaurant(slug);
  const menuQ = useMenu(slug);
  const save = useSaveMenuItem(slug);
  const toggle = useSetMenuAvailability(slug);
  const remove = useDeleteMenuItem(slug);

  const [editing, setEditing] = useState<MenuItemDTO | null>(null);
  const [open, setOpen] = useState(false);

  const currency = restaurant?.currency ?? '$';
  const categories = restaurant?.categories ?? [];
  const groups = groupByCategory(menuQ.data ?? [], categories);

  const startAdd = () => {
    setEditing(null);
    setOpen(true);
  };
  const startEdit = (item: MenuItemDTO) => {
    setEditing(item);
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 md:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-headline-md text-headline-md">Menu items</h1>
          <p className="text-body-sm text-secondary">
            {menuQ.data?.length ?? 0} items · {groups.length} categories
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-label-lg text-on-primary transition-all hover:shadow-lg active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          Add item
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mb-3 text-5xl">🍽️</div>
          <p className="font-headline-sm text-headline-sm">No menu items yet</p>
          <p className="text-body-sm text-secondary">Add your first dish to start taking orders.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 px-1 font-label-lg text-label-lg uppercase tracking-wide text-secondary">
                {group.category} · {group.items.length}
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5 ${
                      item.available ? '' : 'opacity-60'
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-container/20 text-xl">
                      {item.emoji ?? '🍽️'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-label-lg text-label-lg">{item.name}</p>
                        {!item.available && <span className="text-label-sm text-error">Hidden</span>}
                      </div>
                      <p className="truncate text-body-sm text-secondary">{item.description}</p>
                      <p className="mt-0.5 font-label-lg text-primary">
                        {formatMoney(item.price, currency)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <button
                        type="button"
                        title="Toggle availability"
                        onClick={() => toggle.mutate({ id: item.id, available: !item.available })}
                        className="rounded-lg p-1.5 text-secondary hover:bg-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {item.available ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg p-1.5 text-primary hover:bg-surface-container-high"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete "${item.name}"?`)) remove.mutate(item.id);
                          }}
                          className="rounded-lg p-1.5 text-error hover:bg-error-container/30"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {open && (
        <ItemModal
          item={editing}
          categories={categories}
          currency={currency}
          saving={save.isPending}
          onClose={() => setOpen(false)}
          onSubmit={(input) =>
            save.mutate(
              { id: editing?.id, input },
              { onSuccess: () => setOpen(false) },
            )
          }
        />
      )}
    </div>
  );
}

function ItemModal({
  item,
  categories,
  currency,
  saving,
  onClose,
  onSubmit,
}: {
  item: MenuItemDTO | null;
  categories: string[];
  currency: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: MenuItemInput) => void;
}) {
  const [emoji, setEmoji] = useState(item?.emoji ?? '🍽️');
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? categories[0] ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [available, setAvailable] = useState(item?.available ?? true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      price: parseFloat(price) || 0,
      emoji: emoji.trim() || '🍽️',
      available,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="animate-slide-in max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm">{item ? 'Edit item' : 'Add item'}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-surface-container-high">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <label className="w-20">
              <span className="mb-1 block text-label-md text-secondary">Icon</span>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={2}
                className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 text-center text-2xl focus:border-primary focus:ring-primary"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-label-md text-secondary">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Chicken Shawarma"
                className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 focus:border-primary focus:ring-primary"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-label-md text-secondary">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 focus:border-primary focus:ring-primary"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-label-md text-secondary">Category</span>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="cats"
                required
                placeholder="e.g. Mains"
                className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 focus:border-primary focus:ring-primary"
              />
              <datalist id="cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="w-28">
              <span className="mb-1 block text-label-md text-secondary">Price</span>
              <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container px-3 focus-within:ring-1 focus-within:ring-primary">
                <span className="text-secondary">{currency}</span>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  className="w-full border-none bg-transparent px-1 py-2.5 focus:ring-0"
                />
              </div>
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-surface-container px-3 py-3">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="h-5 w-5 rounded text-primary focus:ring-primary"
            />
            <span className="text-body-md">Available to order</span>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-surface-container-high py-3 font-label-lg text-on-surface-variant"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-primary py-3 font-label-lg text-on-primary transition-all active:scale-95 disabled:opacity-50"
          >
            Save item
          </button>
        </div>
      </form>
    </div>
  );
}
