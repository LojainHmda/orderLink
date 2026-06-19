/**
 * Seed script — idempotent. Creates the demo restaurant, its menu, and a set of
 * sample orders across every stage so the board looks alive for a demo.
 * Run with `npm run db:seed`.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { round2, type OrderChannel, type OrderStatus, type OrderType } from '@orderlink/shared';

const prisma = new PrismaClient();

type SeedItem = { name: string; category: string; price: number; emoji: string; description: string };

// Category order — drives the section order on the customer menu & POS picker.
const CATEGORIES = [
  'الإسبريسو',
  'آيس كوفي',
  'المشروبات الساخنة',
  'سموذي',
  'ميلك شيك',
  'مكس طبيعي',
  'حلويات',
];

const MENU: SeedItem[] = [
  // ☕ الإسبريسو
  { name: 'اسبريسو', category: 'الإسبريسو', price: 8, emoji: '☕', description: 'سنجل ٥ / دبل ٨' },
  { name: 'امريكانو', category: 'الإسبريسو', price: 8, emoji: '☕', description: 'سنجل ٦ / دبل ٨' },
  { name: 'فلتر امريكي', category: 'الإسبريسو', price: 7, emoji: '☕', description: '' },
  { name: 'كابتشينو', category: 'الإسبريسو', price: 7, emoji: '☕', description: '' },
  { name: 'لاتيه', category: 'الإسبريسو', price: 7, emoji: '☕', description: '' },
  { name: 'سبانيش لاتيه', category: 'الإسبريسو', price: 8, emoji: '☕', description: '' },
  { name: 'موكا', category: 'الإسبريسو', price: 8, emoji: '☕', description: 'وايت أو دارك' },
  { name: 'مكياتو', category: 'الإسبريسو', price: 7, emoji: '☕', description: '' },
  { name: 'كون بانا', category: 'الإسبريسو', price: 7, emoji: '☕', description: '' },
  { name: 'افوكاتو', category: 'الإسبريسو', price: 7, emoji: '☕', description: '' },
  { name: 'كورتادو', category: 'الإسبريسو', price: 7, emoji: '☕', description: '' },
  { name: 'نسكافيه', category: 'الإسبريسو', price: 7, emoji: '☕', description: '' },
  // 🧊 آيس كوفي
  { name: 'ايس لاتيه', category: 'آيس كوفي', price: 10, emoji: '🧊', description: '' },
  { name: 'ايس امريكانو', category: 'آيس كوفي', price: 10, emoji: '🧊', description: '' },
  { name: 'ايس بندق لاتيه', category: 'آيس كوفي', price: 10, emoji: '🧊', description: '' },
  { name: 'ايس فانيلا لاتيه', category: 'آيس كوفي', price: 10, emoji: '🧊', description: '' },
  { name: 'ايس كراميل لاتيه', category: 'آيس كوفي', price: 10, emoji: '🧊', description: '' },
  { name: 'ايس كراميل مكياتو لاتيه', category: 'آيس كوفي', price: 12, emoji: '🧊', description: '' },
  { name: 'ايس سبانيش لاتيه', category: 'آيس كوفي', price: 12, emoji: '🧊', description: '' },
  { name: 'ايس وايت موكا لاتيه', category: 'آيس كوفي', price: 12, emoji: '🧊', description: '' },
  { name: 'ايس موكا لاتيه', category: 'آيس كوفي', price: 12, emoji: '🧊', description: '' },
  // 🔥 المشروبات الساخنة
  { name: 'مرشملو فانيلا', category: 'المشروبات الساخنة', price: 8, emoji: '🍫', description: '' },
  { name: 'مرشملو بندق', category: 'المشروبات الساخنة', price: 8, emoji: '🍫', description: '' },
  { name: 'مرشملو كراميل', category: 'المشروبات الساخنة', price: 8, emoji: '🍫', description: '' },
  { name: 'شاي كرك', category: 'المشروبات الساخنة', price: 7, emoji: '🍵', description: '' },
  { name: 'هوت شوكلت', category: 'المشروبات الساخنة', price: 8, emoji: '🍫', description: 'بودرة / وايت / دارك' },
  { name: 'هوت نوتيلا', category: 'المشروبات الساخنة', price: 8, emoji: '🍫', description: '' },
  { name: 'هوت توفي كراميل', category: 'المشروبات الساخنة', price: 8, emoji: '🍫', description: '' },
  { name: 'هوت سبانيش', category: 'المشروبات الساخنة', price: 8, emoji: '☕', description: '' },
  { name: 'سحلب', category: 'المشروبات الساخنة', price: 5, emoji: '🥛', description: '' },
  { name: 'شاي', category: 'المشروبات الساخنة', price: 4, emoji: '🍵', description: '' },
  { name: 'اعشاب طبيعية', category: 'المشروبات الساخنة', price: 4, emoji: '🌿', description: '' },
  // 🧃 سموذي — سعرين: صغير ٨ / كبير ١٠
  { name: 'ليمون ونعنع', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'بسفلورا', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'فراولة', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'بطيخ', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'اناناس', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'بلوبري', category: 'سموذي', price: 10, emoji: '🧃', description: 'مكس بيري / رازبيري — صغير ٨ / كبير ١٠' },
  { name: 'خوخ', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'برتقال', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'جريفوت', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'مانجا', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'مانجا وبسفلورا', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'فراولة وموز', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'بنكولادا', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'كيوي', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'جوز الهند', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'عنب', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'شوكليت', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'نوتيلا', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'بندق', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  { name: 'فانيل', category: 'سموذي', price: 10, emoji: '🧃', description: 'صغير ٨ / كبير ١٠' },
  // 🥤 ميلك شيك
  { name: 'أوريو', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'فانيل', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'شوكولاتة', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'فراولة', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'بلوبري', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'لوتس', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'كورنتو', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'بلو انجل', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'بابل كم', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'كورن فليكس', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'تشيز كيك', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'نوتيلا', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'بون بون', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'كيندر', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'سيريلاك', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'توتي فروتي', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'منجا', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'مكس حوامض', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'اسبرسو', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'مستكة', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  { name: 'بيستاشيو', category: 'ميلك شيك', price: 12, emoji: '🥤', description: '' },
  // 🍹 مكس طبيعي
  { name: 'مكس حيفا', category: 'مكس طبيعي', price: 10, emoji: '🍹', description: '' },
  { name: 'حوامض', category: 'مكس طبيعي', price: 10, emoji: '🍹', description: '' },
  { name: 'استوائي', category: 'مكس طبيعي', price: 10, emoji: '🍹', description: '' },
  { name: 'تروبيكال', category: 'مكس طبيعي', price: 10, emoji: '🍹', description: '' },
  { name: 'موسمي', category: 'مكس طبيعي', price: 10, emoji: '🍹', description: '' },
  // 🍰 حلويات
  { name: 'كوكيز', category: 'حلويات', price: 4, emoji: '🍪', description: '' },
  { name: 'كلير', category: 'حلويات', price: 6, emoji: '🥐', description: '' },
  { name: 'دونات', category: 'حلويات', price: 6, emoji: '🍩', description: '' },
  { name: 'سينابون رول', category: 'حلويات', price: 8, emoji: '🥐', description: '' },
  { name: 'كرات شوكلاتة', category: 'حلويات', price: 3, emoji: '🍫', description: '' },
  { name: 'ليزي كيك', category: 'حلويات', price: 3, emoji: '🍰', description: '' },
  { name: 'تشيز كيك', category: 'حلويات', price: 3, emoji: '🧀', description: '' },
  { name: 'براونيز', category: 'حلويات', price: 3, emoji: '🍫', description: '' },
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
  { status: 'NEW', type: 'DELIVERY', channel: 'ONLINE', customer: 'Aya Mansour', phone: '15551110011', note: 'بدون سكر لو سمحت', minutesAgo: 3, items: [{ name: 'ايس لاتيه', qty: 2 }, { name: 'ايس كراميل لاتيه', qty: 1 }] },
  { status: 'NEW', type: 'PICKUP', channel: 'ONLINE', customer: 'Omar Haddad', minutesAgo: 7, items: [{ name: 'كابتشينو', qty: 1 }, { name: 'هوت شوكلت', qty: 1 }, { name: 'شاي كرك', qty: 1 }] },
  { status: 'PREPARING', type: 'DELIVERY', channel: 'ONLINE', customer: 'Lina Saleh', phone: '15552220022', minutesAgo: 14, items: [{ name: 'ايس موكا لاتيه', qty: 1 }, { name: 'مكس حيفا', qty: 2 }] },
  { status: 'PREPARING', type: 'DINE_IN', channel: 'POS', customer: 'Table 5', table: '5', minutesAgo: 18, items: [{ name: 'سبانيش لاتيه', qty: 1 }, { name: 'مرشملو كراميل', qty: 1 }] },
  { status: 'READY', type: 'PICKUP', channel: 'ONLINE', customer: 'Sara Khalil', minutesAgo: 24, items: [{ name: 'ايس سبانيش لاتيه', qty: 2 }, { name: 'سحلب', qty: 1 }] },
  { status: 'COMPLETED', type: 'DELIVERY', channel: 'ONLINE', customer: 'Yusuf Ali', minutesAgo: 52, items: [{ name: 'لاتيه', qty: 1 }, { name: 'هوت نوتيلا', qty: 1 }] },
  { status: 'COMPLETED', type: 'DINE_IN', channel: 'POS', customer: 'Table 2', table: '2', minutesAgo: 70, items: [{ name: 'امريكانو', qty: 2 }, { name: 'شاي', qty: 1 }] },
  { status: 'REJECTED', type: 'DELIVERY', channel: 'ONLINE', customer: 'Guest', minutesAgo: 30, items: [{ name: 'استوائي', qty: 1 }] },
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

  const branding = {
    name: 'حيفا كافيه',
    tagline: 'قهوة مختصة',
    cuisine: 'قهوة',
    currency: '₪',
    emoji: '☕',
    categories: CATEGORIES,
  };

  const restaurant = await prisma.restaurant.upsert({
    where: { slug },
    // Keep branding in sync on re-runs (upsert with an empty update is a no-op).
    update: branding,
    create: {
      slug,
      phone: '0595550768',
      address: 'حيفا',
      deliveryFee: new Prisma.Decimal(2.5),
      minOrder: new Prisma.Decimal(8),
      ...branding,
    },
  });

  // Replace the menu on every run so edits to MENU above always take effect.
  // OrderItem.menuItemId is onDelete: SetNull, so past orders keep their snapshots.
  await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
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
