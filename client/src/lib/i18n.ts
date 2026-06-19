import { useEffect, useState } from 'react';
import { ORDER_STATUS_META, type OrderStatus } from '@orderlink/shared';
import { timeAgo } from './format';

export type Lang = 'ar' | 'en';

const STORAGE_KEY = 'orderlink-lang';

/** Reactive language preference, persisted to localStorage. Defaults to Arabic. */
export function useLang() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === 'en' ? 'en' : 'ar';
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }, [lang]);
  const toggle = () => setLang((l) => (l === 'ar' ? 'en' : 'ar'));
  return { lang, setLang, toggle };
}

/** Static UI chrome strings for the customer menu. */
export const UI = {
  ar: {
    dir: 'rtl' as const,
    all: 'الكل',
    myOrders: 'طلباتي',
    menuFallback: 'القائمة',
    switchTo: 'English',
    notFoundTitle: 'القائمة غير موجودة',
    notFoundBody: 'يبدو أن رابط الطلب غير صالح. يُرجى طلب رابط محدّث من المقهى.',
    emptyMenu: 'لا توجد أصناف في هذه القائمة بعد. تحقّق لاحقاً.',
    emptyCategory: 'لا توجد أصناف في هذا التصنيف.',
    viewOrder: 'عرض الطلب',
    yourOrder: 'طلبك',
    orderType: 'نوع الطلب',
    delivery: 'توصيل',
    pickup: 'استلام',
    dineIn: 'في المقهى',
    name: 'الاسم',
    phoneOptional: 'الهاتف (اختياري)',
    kitchenNote: 'ملاحظات للمطبخ',
    subtotal: 'المجموع الفرعي',
    deliveryFee: 'التوصيل',
    total: 'الإجمالي',
    placeOrder: 'إرسال الطلب',
    addName: 'الرجاء إدخال الاسم',
    orderFailed: 'تعذّر إرسال الطلب',
    add: 'إضافة',
    close: 'إغلاق',
    decrease: 'إنقاص',
    increase: 'زيادة',
    historyHint: 'طلبت من جهاز آخر؟ أدخل رقم هاتفك للعثور عليها أيضاً.',
    phoneNumber: 'رقم الهاتف',
    notAvailable: 'هذه الأصناف لم تعد متوفرة.',
    loading: 'جارٍ التحميل…',
    noOrders: 'لا توجد طلبات بعد',
    noOrdersBody: 'ستظهر طلباتك السابقة هنا.',
    track: 'تتبّع',
    reorder: 'إعادة الطلب',
    table: (n: string) => `طاولة ${n}`,
    minDelivery: (x: string) => `الحد الأدنى للتوصيل هو ${x}.`,
  },
  en: {
    dir: 'ltr' as const,
    all: 'All',
    myOrders: 'My orders',
    menuFallback: 'Menu',
    switchTo: 'العربية',
    notFoundTitle: 'Menu not found',
    notFoundBody: 'This ordering link looks invalid. Please ask the restaurant for an updated link.',
    emptyMenu: 'This menu has no items yet. Please check back soon.',
    emptyCategory: 'No items in this category.',
    viewOrder: 'View order',
    yourOrder: 'Your order',
    orderType: 'Order type',
    delivery: 'Delivery',
    pickup: 'Pickup',
    dineIn: 'Dine-in',
    name: 'Your name',
    phoneOptional: 'Phone (optional)',
    kitchenNote: 'Notes for the kitchen',
    subtotal: 'Subtotal',
    deliveryFee: 'Delivery',
    total: 'Total',
    placeOrder: 'Place order',
    addName: 'Please add your name',
    orderFailed: 'Could not place order',
    add: 'Add',
    close: 'Close',
    decrease: 'Decrease',
    increase: 'Increase',
    historyHint: 'Ordered on another device? Enter your phone to find those too.',
    phoneNumber: 'Phone number',
    notAvailable: 'Those items are no longer available.',
    loading: 'Loading…',
    noOrders: 'No orders yet',
    noOrdersBody: 'Your past orders will show up here.',
    track: 'Track',
    reorder: 'Reorder',
    table: (n: string) => `Table ${n}`,
    minDelivery: (x: string) => `Minimum for delivery is ${x}.`,
  },
} satisfies Record<Lang, Record<string, unknown>>;

/**
 * Arabic → English lookup for menu content (categories, item names, descriptions,
 * and the restaurant name/tagline). The database stores Arabic only; this map
 * supplies the English rendering. Unknown strings fall back to the original.
 */
const AR_EN: Record<string, string> = {
  // Categories
  'الإسبريسو': 'Espresso',
  'آيس كوفي': 'Iced Coffee',
  'المشروبات الساخنة': 'Hot Drinks',
  'سموذي': 'Smoothie',
  'ميلك شيك': 'Milkshake',
  'مكس طبيعي': 'Natural Mix',
  'حلويات': 'Desserts',
  // Espresso
  'اسبريسو': 'Espresso',
  'امريكانو': 'Americano',
  'فلتر امريكي': 'American Filter',
  'كابتشينو': 'Cappuccino',
  'لاتيه': 'Latte',
  'سبانيش لاتيه': 'Spanish Latte',
  'موكا': 'Mocha',
  'مكياتو': 'Macchiato',
  'كون بانا': 'Con Panna',
  'افوكاتو': 'Affogato',
  'كورتادو': 'Cortado',
  'نسكافيه': 'Nescafé',
  // Iced coffee
  'ايس لاتيه': 'Iced Latte',
  'ايس امريكانو': 'Iced Americano',
  'ايس بندق لاتيه': 'Iced Hazelnut Latte',
  'ايس فانيلا لاتيه': 'Iced Vanilla Latte',
  'ايس كراميل لاتيه': 'Iced Caramel Latte',
  'ايس كراميل مكياتو لاتيه': 'Iced Caramel Macchiato',
  'ايس سبانيش لاتيه': 'Iced Spanish Latte',
  'ايس وايت موكا لاتيه': 'Iced White Mocha',
  'ايس موكا لاتيه': 'Iced Mocha Latte',
  // Hot drinks
  'مرشملو فانيلا': 'Vanilla Marshmallow',
  'مرشملو بندق': 'Hazelnut Marshmallow',
  'مرشملو كراميل': 'Caramel Marshmallow',
  'شاي كرك': 'Karak Tea',
  'هوت شوكلت': 'Hot Chocolate',
  'هوت نوتيلا': 'Hot Nutella',
  'هوت توفي كراميل': 'Hot Toffee Caramel',
  'هوت سبانيش': 'Hot Spanish',
  'سحلب': 'Sahlab',
  'شاي': 'Tea',
  'اعشاب طبيعية': 'Herbal Tea',
  // Smoothie
  'ليمون ونعنع': 'Lemon & Mint',
  'بسفلورا': 'Passion Fruit',
  'فراولة': 'Strawberry',
  'بطيخ': 'Watermelon',
  'اناناس': 'Pineapple',
  'بلوبري': 'Blueberry',
  'خوخ': 'Peach',
  'برتقال': 'Orange',
  'جريفوت': 'Grapefruit',
  'مانجا': 'Mango',
  'مانجا وبسفلورا': 'Mango & Passion Fruit',
  'فراولة وموز': 'Strawberry & Banana',
  'بنكولادا': 'Piña Colada',
  'كيوي': 'Kiwi',
  'جوز الهند': 'Coconut',
  'عنب': 'Grape',
  'شوكليت': 'Chocolate',
  'نوتيلا': 'Nutella',
  'بندق': 'Hazelnut',
  'فانيل': 'Vanilla',
  // Milkshake (additional)
  'أوريو': 'Oreo',
  'شوكولاتة': 'Chocolate',
  'لوتس': 'Lotus',
  'كورنتو': 'Cornetto',
  'بلو انجل': 'Blue Angel',
  'بابل كم': 'Bubble Gum',
  'كورن فليكس': 'Corn Flakes',
  'تشيز كيك': 'Cheesecake',
  'بون بون': 'Bonbon',
  'كيندر': 'Kinder',
  'سيريلاك': 'Cerelac',
  'توتي فروتي': 'Tutti Frutti',
  'منجا': 'Mango',
  'مكس حوامض': 'Citrus Mix',
  'اسبرسو': 'Espresso',
  'مستكة': 'Mastic',
  'بيستاشيو': 'Pistachio',
  // Natural mix
  'مكس حيفا': 'Haifa Mix',
  'حوامض': 'Citrus',
  'استوائي': 'Tropical',
  'تروبيكال': 'Tropicana',
  'موسمي': 'Seasonal',
  // Desserts
  'كوكيز': 'Cookies',
  'كلير': 'Éclair',
  'دونات': 'Donut',
  'سينابون رول': 'Cinnamon Roll',
  'كرات شوكلاتة': 'Chocolate Balls',
  'ليزي كيك': 'Lazy Cake',
  'براونيز': 'Brownies',
  // Descriptions
  'سنجل ٥ / دبل ٨': 'Single 5 / Double 8',
  'سنجل ٦ / دبل ٨': 'Single 6 / Double 8',
  'وايت أو دارك': 'White or Dark',
  'بودرة / وايت / دارك': 'Powder / White / Dark',
  'صغير ٨ / كبير ١٠': 'Small 8 / Large 10',
  'مكس بيري / رازبيري — صغير ٨ / كبير ١٠': 'Mixed berry / Raspberry — Small 8 / Large 10',
  // Branding
  'حيفا كافيه': 'Haifa Coffee',
  'قهوة مختصة': 'Specialty Coffee',
};

/** Translate stored (Arabic) menu content to the active language. */
export function tr(text: string | null | undefined, lang: Lang): string {
  if (!text) return '';
  return lang === 'en' ? AR_EN[text] ?? text : text;
}

const STATUS_AR_CUSTOMER: Record<OrderStatus, string> = {
  NEW: 'تم الاستلام',
  PREPARING: 'قيد التحضير',
  READY: 'جاهز',
  COMPLETED: 'مكتمل',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغى',
};

/** Customer-facing order-status label in the active language. */
export function statusCustomerLabel(status: OrderStatus, lang: Lang): string {
  return lang === 'ar' ? STATUS_AR_CUSTOMER[status] : ORDER_STATUS_META[status].customerLabel;
}

/** Relative "x ago" time, localized. */
export function timeAgoL(iso: string, lang: Lang): string {
  if (lang === 'en') return timeAgo(iso);
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 10) return 'الآن';
  if (s < 60) return `قبل ${s} ثانية`;
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  return `قبل ${Math.floor(h / 24)} يوم`;
}
