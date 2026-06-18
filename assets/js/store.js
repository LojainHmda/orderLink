/**
 * OrderLink — client-side data layer (single source of truth).
 *
 * This is the heart of the app's logic. It is intentionally backend-free:
 * everything lives in localStorage so the whole order lifecycle works on a
 * static host (e.g. GitHub Pages) and survives reloads. Changes are broadcast
 * to every open tab via BroadcastChannel (with a `storage` event fallback),
 * so a customer placing an order in one tab updates the restaurant's order
 * board in another — in real time.
 *
 * Public surface: `window.OL` (Store + a few pure helpers).
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "orderlink.db.v1";
  var CHANNEL_NAME = "orderlink";
  var SCHEMA_VERSION = 1;

  /* ------------------------------------------------------------------ *
   * Order state machine
   * ------------------------------------------------------------------ */
  // The pipeline a live order moves through. `completed` is the happy
  // terminal state (shown as "Delivered" for delivery orders); `rejected`
  // and `cancelled` are the unhappy terminals.
  var PIPELINE = ["new", "preparing", "ready", "completed"];

  var STATUS_META = {
    new:        { label: "Requested",  customerLabel: "Order received",   icon: "receipt_long",   tone: "info"    },
    preparing:  { label: "Preparing",  customerLabel: "Being prepared",   icon: "skillet",        tone: "warning" },
    ready:      { label: "Ready",      customerLabel: "Ready",            icon: "check_circle",   tone: "primary" },
    completed:  { label: "Completed",  customerLabel: "Completed",        icon: "task_alt",       tone: "success" },
    rejected:   { label: "Rejected",   customerLabel: "Declined",         icon: "cancel",         tone: "error"   },
    cancelled:  { label: "Cancelled",  customerLabel: "Cancelled",        icon: "do_not_disturb", tone: "error"   }
  };

  function nextStatus(status) {
    var i = PIPELINE.indexOf(status);
    if (i === -1 || i === PIPELINE.length - 1) return null;
    return PIPELINE[i + 1];
  }

  /* ------------------------------------------------------------------ *
   * Pure helpers (also exported for views)
   * ------------------------------------------------------------------ */
  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 7);
  }

  function slugify(str) {
    return String(str || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || ("item-" + Math.random().toString(36).slice(2, 6));
  }

  function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

  function money(amount, restaurant) {
    var symbol = (restaurant && restaurant.currency) || "$";
    return symbol + round2(amount || 0).toFixed(2);
  }

  function timeAgo(iso) {
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "";
    var s = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (s < 10) return "just now";
    if (s < 60) return s + "s ago";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ------------------------------------------------------------------ *
   * Seed data — a believable, fully-stocked demo restaurant.
   * ------------------------------------------------------------------ */
  function seed() {
    function item(name, category, price, emoji, description) {
      return {
        id: "mi-" + slugify(name),
        name: name, category: category, price: price,
        emoji: emoji, description: description, available: true
      };
    }

    var greenOlive = {
      slug: "green-olive-bistro",
      name: "Green Olive Bistro",
      tagline: "Mediterranean Kitchen",
      cuisine: "Mediterranean",
      phone: "15551234567",            // WhatsApp number (digits only)
      currency: "$",
      address: "12 Garden Street, Riverside",
      deliveryFee: 2.5,
      minOrder: 8,
      accent: "#006d2f",
      emoji: "🫒",
      categories: ["Starters", "Mains", "Sides", "Beverages", "Desserts"],
      menu: [
        item("Hummus & Pita", "Starters", 6.5, "🥙", "Creamy chickpea hummus, warm pita, olive oil"),
        item("Falafel Plate", "Starters", 7.0, "🧆", "Six crispy falafel, tahini, pickles"),
        item("Greek Salad", "Starters", 8.5, "🥗", "Tomato, cucumber, feta, kalamata olives"),
        item("Chicken Shawarma", "Mains", 12.0, "🌯", "Marinated chicken, garlic sauce, fries"),
        item("Lamb Kofta", "Mains", 14.5, "🍖", "Spiced lamb skewers, grilled veg, rice"),
        item("Grilled Halloumi Wrap", "Mains", 11.0, "🫓", "Halloumi, roasted peppers, hummus"),
        item("Margherita Flatbread", "Mains", 10.5, "🍕", "Tomato, mozzarella, fresh basil"),
        item("Truffle Fries", "Sides", 6.5, "🍟", "Parmesan, truffle oil, aioli"),
        item("Saffron Rice", "Sides", 4.0, "🍚", "Fragrant basmati, toasted almonds"),
        item("Garlic Bread", "Sides", 4.5, "🥖", "Toasted ciabatta, herb butter"),
        item("Fresh Lemonade", "Beverages", 3.5, "🍋", "Hand-squeezed, mint"),
        item("Mint Tea", "Beverages", 3.0, "🍵", "Moroccan-style sweet mint tea"),
        item("Sparkling Water", "Beverages", 2.5, "💧", "Chilled, with lemon"),
        item("Baklava", "Desserts", 5.0, "🍯", "Pistachio, honey, filo"),
        item("Chocolate Mousse", "Desserts", 5.5, "🍫", "Dark chocolate, sea salt")
      ]
    };

    return {
      version: SCHEMA_VERSION,
      activeRestaurant: greenOlive.slug,
      restaurants: { "green-olive-bistro": greenOlive },
      orders: [],
      seq: 1041
    };
  }

  /* ------------------------------------------------------------------ *
   * Persistence
   * ------------------------------------------------------------------ */
  var db = load();

  function load() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === SCHEMA_VERSION) return parsed;
      }
    } catch (e) { /* fall through to seed */ }
    var fresh = seed();
    persist(fresh);
    return fresh;
  }

  function persist(next) {
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next || db)); }
    catch (e) { /* storage may be full / disabled — keep in-memory */ }
  }

  /* ------------------------------------------------------------------ *
   * Reactivity — local subscribers + cross-tab broadcast
   * ------------------------------------------------------------------ */
  var subscribers = [];
  var channel = null;
  try { channel = new global.BroadcastChannel(CHANNEL_NAME); } catch (e) { channel = null; }

  function emit(reason) {
    subscribers.forEach(function (fn) { try { fn(db, reason); } catch (e) {} });
  }

  // A local mutation: persist, notify this tab, and tell other tabs.
  function commit(reason) {
    persist(db);
    emit(reason);
    if (channel) { try { channel.postMessage({ reason: reason, at: Date.now() }); } catch (e) {} }
  }

  // Another tab changed the DB — reload from storage and notify locally only.
  function refreshFromStorage(reason) {
    db = load();
    emit(reason || "external");
  }

  if (channel) {
    channel.onmessage = function () { refreshFromStorage("broadcast"); };
  }
  // Fallback for browsers/contexts without BroadcastChannel.
  global.addEventListener("storage", function (e) {
    if (e.key === STORAGE_KEY) refreshFromStorage("storage-event");
  });

  function subscribe(fn) {
    if (typeof fn !== "function") return function () {};
    subscribers.push(fn);
    return function unsubscribe() {
      var i = subscribers.indexOf(fn);
      if (i > -1) subscribers.splice(i, 1);
    };
  }

  /* ------------------------------------------------------------------ *
   * Restaurant + menu API
   * ------------------------------------------------------------------ */
  function getRestaurant(slug) {
    return db.restaurants[slug || db.activeRestaurant] || null;
  }

  function activeRestaurant() { return getRestaurant(db.activeRestaurant); }

  function updateRestaurant(slug, patch) {
    var r = db.restaurants[slug];
    if (!r) return null;
    Object.assign(r, patch || {});
    commit("restaurant:update");
    return r;
  }

  function menu(slug) {
    var r = getRestaurant(slug);
    return r ? r.menu.slice() : [];
  }

  function menuByCategory(slug, opts) {
    var r = getRestaurant(slug);
    if (!r) return [];
    var onlyAvailable = opts && opts.onlyAvailable;
    return r.categories.map(function (cat) {
      return {
        category: cat,
        items: r.menu.filter(function (m) {
          return m.category === cat && (!onlyAvailable || m.available);
        })
      };
    }).filter(function (g) { return g.items.length; });
  }

  function saveMenuItem(slug, data) {
    var r = getRestaurant(slug);
    if (!r) return null;
    if (data.category && r.categories.indexOf(data.category) === -1) {
      r.categories.push(data.category);
    }
    if (data.id) {
      var existing = r.menu.find(function (m) { return m.id === data.id; });
      if (existing) { Object.assign(existing, data); commit("menu:update"); return existing; }
    }
    var created = {
      id: uid("mi"),
      name: data.name, category: data.category,
      price: round2(data.price), emoji: data.emoji || "🍽️",
      description: data.description || "", available: data.available !== false
    };
    r.menu.push(created);
    commit("menu:create");
    return created;
  }

  function deleteMenuItem(slug, id) {
    var r = getRestaurant(slug);
    if (!r) return;
    r.menu = r.menu.filter(function (m) { return m.id !== id; });
    commit("menu:delete");
  }

  function toggleMenuItem(slug, id) {
    var r = getRestaurant(slug);
    if (!r) return;
    var m = r.menu.find(function (x) { return x.id === id; });
    if (m) { m.available = !m.available; commit("menu:toggle"); }
  }

  /* ------------------------------------------------------------------ *
   * Order API
   * ------------------------------------------------------------------ */
  // payload: { items:[{id,name,price,qty,note}], customer:{name,phone},
  //            type:'delivery'|'pickup'|'dine-in', table, note, channel }
  function placeOrder(slug, payload) {
    var r = getRestaurant(slug);
    if (!r) throw new Error("Unknown restaurant: " + slug);

    var items = (payload.items || []).map(function (it) {
      return {
        id: it.id, name: it.name, emoji: it.emoji || "",
        price: round2(it.price), qty: Math.max(1, parseInt(it.qty, 10) || 1),
        note: (it.note || "").trim()
      };
    }).filter(function (it) { return it.qty > 0; });

    if (!items.length) throw new Error("Cannot place an empty order.");

    var subtotal = round2(items.reduce(function (s, it) { return s + it.price * it.qty; }, 0));
    var type = payload.type || "delivery";
    var deliveryFee = type === "delivery" ? round2(r.deliveryFee || 0) : 0;
    var total = round2(subtotal + deliveryFee);
    var now = new Date().toISOString();

    db.seq = (db.seq || 1000) + 1;
    var order = {
      id: uid("ord"),
      code: db.seq,                    // human-friendly #1042
      restaurant: r.slug,
      channel: payload.channel || "online",
      type: type,
      table: payload.table || null,
      customer: {
        name: (payload.customer && payload.customer.name || "").trim() || "Guest",
        phone: (payload.customer && payload.customer.phone || "").trim()
      },
      items: items,
      note: (payload.note || "").trim(),
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      total: total,
      status: payload.status || "new",
      createdAt: now,
      updatedAt: now,
      statusHistory: [{ status: payload.status || "new", at: now }]
    };

    db.orders.unshift(order);
    commit("order:create");
    return order;
  }

  function getOrder(id) {
    return db.orders.find(function (o) { return o.id === id; }) || null;
  }

  function listOrders(slug, filter) {
    var list = db.orders.filter(function (o) { return o.restaurant === (slug || db.activeRestaurant); });
    if (filter && filter.status) {
      var set = [].concat(filter.status);
      list = list.filter(function (o) { return set.indexOf(o.status) > -1; });
    }
    if (filter && filter.activeOnly) {
      list = list.filter(function (o) { return PIPELINE.indexOf(o.status) > -1 && o.status !== "completed"; });
    }
    if (filter && filter.today) {
      var d = new Date(); d.setHours(0, 0, 0, 0);
      list = list.filter(function (o) { return new Date(o.createdAt).getTime() >= d.getTime(); });
    }
    return list;
  }

  function setStatus(id, status) {
    var o = getOrder(id);
    if (!o || o.status === status) return o;
    o.status = status;
    o.updatedAt = new Date().toISOString();
    o.statusHistory.push({ status: status, at: o.updatedAt });
    commit("order:status");
    return o;
  }

  function advanceOrder(id) {
    var o = getOrder(id);
    if (!o) return null;
    var n = nextStatus(o.status);
    return n ? setStatus(id, n) : o;
  }

  function rejectOrder(id) { return setStatus(id, "rejected"); }

  /* ------------------------------------------------------------------ *
   * Derived stats for dashboards
   * ------------------------------------------------------------------ */
  function stats(slug) {
    var all = listOrders(slug);
    var today = listOrders(slug, { today: true });
    var live = all.filter(function (o) { return o.status !== "completed" && PIPELINE.indexOf(o.status) > -1; });
    var revenue = today
      .filter(function (o) { return o.status === "completed"; })
      .reduce(function (s, o) { return s + o.total; }, 0);

    // Best-selling items today
    var tally = {};
    today.forEach(function (o) {
      if (o.status === "rejected" || o.status === "cancelled") return;
      o.items.forEach(function (it) {
        tally[it.name] = (tally[it.name] || 0) + it.qty;
      });
    });
    var top = Object.keys(tally)
      .map(function (k) { return { name: k, qty: tally[k] }; })
      .sort(function (a, b) { return b.qty - a.qty; })
      .slice(0, 5);

    return {
      ordersToday: today.length,
      liveOrders: live.length,
      revenueToday: round2(revenue),
      avgTicket: today.length ? round2(revenue / Math.max(1, today.filter(function (o) { return o.status === "completed"; }).length)) : 0,
      newCount: all.filter(function (o) { return o.status === "new"; }).length,
      preparingCount: all.filter(function (o) { return o.status === "preparing"; }).length,
      readyCount: all.filter(function (o) { return o.status === "ready"; }).length,
      topItems: top
    };
  }

  /* ------------------------------------------------------------------ *
   * Utilities for views
   * ------------------------------------------------------------------ */
  function customerLink(slug, extra) {
    // Build an absolute link to the customer menu, resolved from site root so
    // it works the same whether called from index.html or a /pages/* page.
    var path = location.pathname;
    var cut = path.indexOf("/pages/") > -1 ? path.indexOf("/pages/") : path.lastIndexOf("/");
    var root = location.origin + path.substring(0, cut);
    var url = root + "/pages/customer/menu.html?r=" + encodeURIComponent(slug || db.activeRestaurant);
    if (extra && extra.table) url += "&table=" + encodeURIComponent(extra.table);
    return url;
  }

  function reset() {
    db = seed();
    persist(db);
    commit("reset");
  }

  /* ------------------------------------------------------------------ *
   * Export
   * ------------------------------------------------------------------ */
  global.OL = {
    // state
    subscribe: subscribe,
    getState: function () { return db; },
    reset: reset,
    // restaurants
    getRestaurant: getRestaurant,
    activeRestaurant: activeRestaurant,
    updateRestaurant: updateRestaurant,
    // menu
    menu: menu,
    menuByCategory: menuByCategory,
    saveMenuItem: saveMenuItem,
    deleteMenuItem: deleteMenuItem,
    toggleMenuItem: toggleMenuItem,
    // orders
    placeOrder: placeOrder,
    getOrder: getOrder,
    listOrders: listOrders,
    setStatus: setStatus,
    advanceOrder: advanceOrder,
    rejectOrder: rejectOrder,
    // derived
    stats: stats,
    customerLink: customerLink,
    // constants + helpers
    PIPELINE: PIPELINE,
    STATUS_META: STATUS_META,
    nextStatus: nextStatus,
    money: money,
    round2: round2,
    timeAgo: timeAgo,
    slugify: slugify,
    escapeHtml: escapeHtml,
    uid: uid
  };
})(window);
