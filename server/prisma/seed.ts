/**
 * Seed script — idempotent. Creates the demo restaurant, its menu, and a set of
 * sample orders across every stage so the board looks alive for a demo.
 * Run with `npm run db:seed`.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { round2, type OrderChannel, type OrderStatus, type OrderType } from '@orderlink/shared';

const prisma = new PrismaClient();

type SeedItem = { name: string; category: string; price: number; emoji: string; description: string };

const MENU: SeedItem[] = [
  { name: 'Hummus & Pita', category: 'Starters', price: 6.5, emoji: '🥙', description: 'Creamy chickpea hummus, warm pita, olive oil' },
  { name: 'Falafel Plate', category: 'Starters', price: 7.0, emoji: '🧆', description: 'Six crispy falafel, tahini, pickles' },
  { name: 'Greek Salad', category: 'Starters', price: 8.5, emoji: '🥗', description: 'Tomato, cucumber, feta, kalamata olives' },
  { name: 'Chicken Shawarma', category: 'Mains', price: 12.0, emoji: '🌯', description: 'Marinated chicken, garlic sauce, fries' },
  { name: 'Lamb Kofta', category: 'Mains', price: 14.5, emoji: '🍖', description: 'Spiced lamb skewers, grilled veg, rice' },
  { name: 'Grilled Halloumi Wrap', category: 'Mains', price: 11.0, emoji: '🫓', description: 'Halloumi, roasted peppers, hummus' },
  { name: 'Margherita Flatbread', category: 'Mains', price: 10.5, emoji: '🍕', description: 'Tomato, mozzarella, fresh basil' },
  { name: 'Truffle Fries', category: 'Sides', price: 6.5, emoji: '🍟', description: 'Parmesan, truffle oil, aioli' },
  { name: 'Saffron Rice', category: 'Sides', price: 4.0, emoji: '🍚', description: 'Fragrant basmati, toasted almonds' },
  { name: 'Garlic Bread', category: 'Sides', price: 4.5, emoji: '🥖', description: 'Toasted ciabatta, herb butter' },
  { name: 'Fresh Lemonade', category: 'Beverages', price: 3.5, emoji: '🍋', description: 'Hand-squeezed, mint' },
  { name: 'Mint Tea', category: 'Beverages', price: 3.0, emoji: '🍵', description: 'Moroccan-style sweet mint tea' },
  { name: 'Sparkling Water', category: 'Beverages', price: 2.5, emoji: '💧', description: 'Chilled, with lemon' },
  { name: 'Baklava', category: 'Desserts', price: 5.0, emoji: '🍯', description: 'Pistachio, honey, filo' },
  { name: 'Chocolate Mousse', category: 'Desserts', price: 5.5, emoji: '🍫', description: 'Dark chocolate, sea salt' },
];

type OrderSpec = {
  status: OrderStatus;
  type: OrderType;
  channel: OrderChannel;
  customer: string;
  phone?: string;
  table?: string;
  note?: string;
  minutesAgo: number;
  items: { name: string; qty: number; note?: string }[];
};

const ORDERS: OrderSpec[] = [
  { status: 'NEW', type: 'DELIVERY', channel: 'ONLINE', customer: 'Aya Mansour', phone: '15551110011', note: 'Extra garlic sauce, please', minutesAgo: 3, items: [{ name: 'Chicken Shawarma', qty: 2 }, { name: 'Truffle Fries', qty: 1 }, { name: 'Fresh Lemonade', qty: 2 }] },
  { status: 'NEW', type: 'PICKUP', channel: 'ONLINE', customer: 'Omar Haddad', minutesAgo: 7, items: [{ name: 'Falafel Plate', qty: 1, note: 'No pickles' }, { name: 'Hummus & Pita', qty: 1 }, { name: 'Mint Tea', qty: 1 }] },
  { status: 'PREPARING', type: 'DELIVERY', channel: 'ONLINE', customer: 'Lina Saleh', phone: '15552220022', minutesAgo: 14, items: [{ name: 'Lamb Kofta', qty: 1 }, { name: 'Saffron Rice', qty: 1 }, { name: 'Baklava', qty: 2 }] },
  { status: 'PREPARING', type: 'DINE_IN', channel: 'POS', customer: 'Table 5', table: '5', minutesAgo: 18, items: [{ name: 'Margherita Flatbread', qty: 1 }, { name: 'Greek Salad', qty: 1 }, { name: 'Sparkling Water', qty: 2 }] },
  { status: 'READY', type: 'PICKUP', channel: 'ONLINE', customer: 'Sara Khalil', minutesAgo: 24, items: [{ name: 'Grilled Halloumi Wrap', qty: 2 }, { name: 'Garlic Bread', qty: 1 }] },
  { status: 'COMPLETED', type: 'DELIVERY', channel: 'ONLINE', customer: 'Yusuf Ali', minutesAgo: 52, items: [{ name: 'Chicken Shawarma', qty: 1 }, { name: 'Baklava', qty: 1 }, { name: 'Fresh Lemonade', qty: 1 }] },
  { status: 'COMPLETED', type: 'DINE_IN', channel: 'POS', customer: 'Table 2', table: '2', minutesAgo: 70, items: [{ name: 'Lamb Kofta', qty: 2 }, { name: 'Greek Salad', qty: 1 }, { name: 'Sparkling Water', qty: 2 }] },
  { status: 'REJECTED', type: 'DELIVERY', channel: 'ONLINE', customer: 'Guest', minutesAgo: 30, items: [{ name: 'Truffle Fries', qty: 1 }] },
];

const PIPELINE: OrderStatus[] = ['NEW', 'PREPARING', 'READY', 'COMPLETED'];

/** Build a plausible status history for an order, with increasing timestamps. */
function buildEvents(status: OrderStatus, channel: OrderChannel, createdAt: Date) {
  const start: OrderStatus = channel === 'POS' ? 'PREPARING' : 'NEW';
  let path: OrderStatus[];
  if (status === 'REJECTED' || status === 'CANCELLED') {
    path = [start, status];
  } else {
    path = PIPELINE.slice(PIPELINE.indexOf(start), PIPELINE.indexOf(status) + 1);
  }
  return path.map((s, i) => ({ status: s, createdAt: new Date(createdAt.getTime() + i * 90_000) }));
}

async function main() {
  const slug = 'green-olive-bistro';

  const restaurant = await prisma.restaurant.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: 'Green Olive Bistro',
      tagline: 'Mediterranean Kitchen',
      cuisine: 'Mediterranean',
      phone: '15551234567',
      currency: '$',
      address: '12 Garden Street, Riverside',
      deliveryFee: new Prisma.Decimal(2.5),
      minOrder: new Prisma.Decimal(8),
      emoji: '🫒',
      categories: ['Starters', 'Mains', 'Sides', 'Beverages', 'Desserts'],
    },
  });

  // Seed the menu only the first time.
  if ((await prisma.menuItem.count({ where: { restaurantId: restaurant.id } })) === 0) {
    await prisma.menuItem.createMany({
      data: MENU.map((m) => ({
        restaurantId: restaurant.id,
        name: m.name,
        description: m.description,
        category: m.category,
        price: new Prisma.Decimal(m.price),
        emoji: m.emoji,
      })),
    });
  }

  const menuItems = await prisma.menuItem.findMany({ where: { restaurantId: restaurant.id } });
  const byName = new Map(menuItems.map((m) => [m.name, m]));

  // Seed sample orders only if there are none yet (keeps re-runs idempotent).
  if ((await prisma.order.count({ where: { restaurantId: restaurant.id } })) === 0) {
    let code = 1040;
    for (const spec of ORDERS) {
      code += 1;
      const createdAt = new Date(Date.now() - spec.minutesAgo * 60_000);
      const lines = spec.items.map((it) => {
        const menuItem = byName.get(it.name);
        if (!menuItem) throw new Error(`Seed menu item not found: ${it.name}`);
        return { menuItem, qty: it.qty, note: it.note ?? null };
      });
      const subtotal = round2(lines.reduce((s, l) => s + l.menuItem.price.toNumber() * l.qty, 0));
      const deliveryFee = spec.type === 'DELIVERY' ? restaurant.deliveryFee.toNumber() : 0;
      const total = round2(subtotal + deliveryFee);

      await prisma.order.create({
        data: {
          code,
          restaurantId: restaurant.id,
          channel: spec.channel,
          type: spec.type,
          table: spec.table ?? null,
          customerName: spec.customer,
          customerPhone: spec.phone ?? null,
          note: spec.note ?? null,
          status: spec.status,
          subtotal: new Prisma.Decimal(subtotal),
          deliveryFee: new Prisma.Decimal(deliveryFee),
          total: new Prisma.Decimal(total),
          createdAt,
          items: {
            create: lines.map((l) => ({
              menuItemId: l.menuItem.id,
              name: l.menuItem.name,
              emoji: l.menuItem.emoji,
              price: l.menuItem.price,
              qty: l.qty,
              note: l.note,
            })),
          },
          events: { create: buildEvents(spec.status, spec.channel, createdAt) },
        },
      });
    }
    await prisma.restaurant.update({ where: { id: restaurant.id }, data: { orderSeq: code } });
  }

  const [menuCount, orderCount] = await Promise.all([
    prisma.menuItem.count({ where: { restaurantId: restaurant.id } }),
    prisma.order.count({ where: { restaurantId: restaurant.id } }),
  ]);
  console.log(`Seeded "${restaurant.name}" — ${menuCount} menu items, ${orderCount} orders.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
