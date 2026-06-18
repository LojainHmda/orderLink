# OrderLink Admin

A static admin dashboard UI for **OrderLink** — a multi-tenant restaurant ordering
platform. Restaurant partners ("tenants") are managed from a central dashboard, and
each can connect WhatsApp and share a menu QR code with customers.

Built with plain HTML + the [Tailwind CSS Play CDN](https://tailwindcss.com/docs/installation/play-cdn).
No build step is required — just open the pages in a browser (or serve them locally).

## Project structure

```
OrderLink/
├── index.html                     # Dashboard (tenant overview, stats, activity)
├── pages/
│   └── whatsapp-settings.html     # WhatsApp connectivity & menu QR settings
├── assets/
│   ├── css/
│   │   └── styles.css             # Shared custom styles (glass-card, chat bubble, …)
│   ├── js/
│   │   ├── tailwind.config.js     # Shared Tailwind design tokens (single source of truth)
│   │   └── main.js                # Shared UI behaviour (mobile sidebar toggle)
│   └── data/
│       └── tenants.json           # Sample tenant data (for future dynamic rendering)
├── .gitignore
└── README.md
```

### Why this layout

- **One source of truth for the design system.** Colors, spacing, fonts and the type
  scale live in `assets/js/tailwind.config.js`, loaded by every page right after the
  Tailwind CDN. Update a token once and every page picks it up.
- **No duplicated CSS or JS.** Custom styles and interactions are extracted into
  `assets/css/styles.css` and `assets/js/main.js` instead of being inlined per page.
- **Pages are navigable.** The sidebar / bottom-nav links connect the dashboard and the
  WhatsApp settings page, so you can click through the prototype.
- **Room to grow.** New screens go in `pages/`; shared assets stay in `assets/`.

## Running locally

The pages reference assets with relative paths, so any static server works.

```bash
# From the project root:
python -m http.server 5173
# then open http://localhost:5173
```

Or simply double-click `index.html` to open it directly in a browser.

> Note: the Tailwind Play CDN compiles styles in the browser and is intended for
> prototyping. For production, migrate to a compiled Tailwind build (PostCSS / CLI /
> Vite) and replace the CDN `<script>` with the generated stylesheet.
