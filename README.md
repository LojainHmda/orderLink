# OrderLink

**Share a menu by link. Take orders in real time. Track the kitchen.**

OrderLink gives a restaurant a shareable menu, a live order board, customer order
tracking, and a built-in point-of-sale — all in one. A customer opens the link,
places an order, and the restaurant watches that ticket move through
**Requested → Preparing → Ready → Completed/Delivered** in real time.

Built with plain HTML + the [Tailwind CSS Play CDN](https://tailwindcss.com/docs/installation/play-cdn)
and a small vanilla-JS data layer. **No build step, no backend, no signup** — it runs
entirely in the browser and deploys to any static host (e.g. GitHub Pages).

## The flow

| # | Screen | What happens |
|---|--------|--------------|
| 1 | **Menu Manager** · `pages/admin/menu.html` | Add dishes, prices & categories. Get a shareable link + QR. |
| 2 | **Customer Menu** · `pages/customer/menu.html?r=<slug>` | Customer browses, builds a cart, places an order. |
| 3 | **Order Tracking** · `pages/customer/order.html?id=<id>` | Customer watches their order status update live. |
| 4 | **Order Board** · `pages/admin/orders.html` | Orders land live in kitchen lanes; staff advance each ticket. |
| 5 | **POS** · `pages/admin/pos.html` | Staff ring up walk-in tickets into the same pipeline. |
| 6 | **Dashboard** · `pages/admin/dashboard.html` | Live KPIs, order queue, top sellers, menu link. |

> **Try it:** open the customer menu and the order board in two windows side by side —
> place an order in one and watch it appear instantly in the other.

## How the logic works

Everything is coordinated by a single client-side store, [`assets/js/store.js`](assets/js/store.js):

- **Single source of truth** persisted to `localStorage` (survives reloads).
- **Order state machine** — `new → preparing → ready → completed` (+ `rejected`),
  with a recorded status history per order.
- **Live cross-tab sync** via `BroadcastChannel` (with a `storage`-event fallback), so
  every open tab — customer and restaurant — stays in sync in real time.
- **Reactive views** — pages call `OL.subscribe(render)` and re-render on any change.
- **Derived stats** (revenue, live count, top sellers) computed on demand.

The store's logic is covered by a headless test suite (run under Node, no browser needed).

## Project structure

```
OrderLink/
├── index.html                      # Landing hub → routes to console / customer demo
├── pages/
│   ├── admin/
│   │   ├── dashboard.html          # Owner dashboard (live KPIs + queue)
│   │   ├── orders.html             # Live kitchen order board (pipeline lanes)
│   │   ├── menu.html               # Menu manager + shareable link / QR
│   │   └── pos.html                # Point of sale (staff order entry)
│   └── customer/
│       ├── menu.html               # Customer ordering page (the shared link)
│       └── order.html              # Live order-status tracking
├── assets/
│   ├── css/styles.css              # Shared styles + animations
│   └── js/
│       ├── store.js                # Reactive data layer (orders, menu, state machine)
│       ├── ui.js                   # Shared UI kit (toasts, QR, admin shell, badges)
│       └── tailwind.config.js      # Design tokens (single source of truth)
└── README.md
```

## Running locally

Any static server works (the customer-link QR needs a real URL, so a server beats
double-clicking the file):

```bash
# From the project root:
python -m http.server 5173
# then open http://localhost:5173
```

To reset all demo data, run `OL.reset()` in the browser console (or clear site data).

## Notes & next steps

- The Tailwind Play CDN compiles styles in the browser (great for prototyping). For
  production, switch to a compiled Tailwind build and replace the CDN `<script>`.
- The data layer is intentionally swappable: replacing the `localStorage` read/write and
  the broadcast in `store.js` with API/WebSocket calls would make it multi-device without
  changing any of the views.
