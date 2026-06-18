/**
 * OrderLink — shared UI kit.
 *
 * Small, dependency-free helpers used across pages: toasts, clipboard,
 * QR codes, status badges, and the reusable admin shell (sidebar + topbar)
 * so navigation stays consistent without copy-pasting markup into every page.
 *
 * Depends on store.js (window.OL) being loaded first.
 */
(function (global) {
  "use strict";

  var OL = global.OL || (global.OL = {});

  /* ----------------------------- Toasts ----------------------------- */
  function toast(message, opts) {
    opts = opts || {};
    var host = document.getElementById("ol-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "ol-toast-host";
      host.className = "fixed z-[100] bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none";
      document.body.appendChild(host);
    }
    var tone = opts.tone || "default";
    var toneClass = {
      success: "bg-primary text-on-primary",
      error: "bg-error text-on-error",
      default: "bg-inverse-surface text-inverse-on-surface"
    }[tone] || "bg-inverse-surface text-inverse-on-surface";

    var el = document.createElement("div");
    el.className = "ol-toast pointer-events-auto px-4 py-3 rounded-xl shadow-lg font-label-lg text-label-lg flex items-center gap-2 " + toneClass;
    el.style.cssText = "opacity:0;transform:translateY(12px);transition:all .25s ease";
    var icon = opts.icon || (tone === "success" ? "check_circle" : tone === "error" ? "error" : "info");
    el.innerHTML = '<span class="material-symbols-outlined text-[20px]">' + icon + "</span><span>" + OL.escapeHtml(message) + "</span>";
    host.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = "1"; el.style.transform = "translateY(0)"; });
    setTimeout(function () {
      el.style.opacity = "0"; el.style.transform = "translateY(12px)";
      setTimeout(function () { el.remove(); }, 250);
    }, opts.duration || 2600);
  }

  /* --------------------------- Clipboard ---------------------------- */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove(); resolve();
      } catch (e) { reject(e); }
    });
  }

  /* ----------------------------- QR code ---------------------------- *
   * Uses a lightweight public QR image endpoint. No build step / npm. */
  function qrUrl(data, size) {
    size = size || 200;
    return "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size +
      "&margin=8&data=" + encodeURIComponent(data);
  }

  /* -------------------------- Status badge -------------------------- */
  var TONE_CLASSES = {
    info:    "bg-tertiary-container/30 text-on-tertiary-container",
    warning: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    primary: "bg-primary-container/30 text-on-primary-container",
    success: "bg-primary text-on-primary",
    error:   "bg-error-container text-on-error-container"
  };

  function statusBadge(status, opts) {
    var meta = OL.STATUS_META[status] || { label: status, tone: "info", icon: "circle" };
    var label = (opts && opts.customer) ? meta.customerLabel : meta.label;
    var cls = TONE_CLASSES[meta.tone] || TONE_CLASSES.info;
    return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-md text-label-md ' + cls + '">' +
      '<span class="material-symbols-outlined text-[14px]">' + meta.icon + "</span>" +
      OL.escapeHtml(label) + "</span>";
  }

  function toneClasses(tone) { return TONE_CLASSES[tone] || TONE_CLASSES.info; }

  function statusBadgeIcon(status) {
    var meta = OL.STATUS_META[status] || { icon: "circle" };
    return '<span class="material-symbols-outlined text-primary text-[22px]">' + meta.icon + "</span>";
  }

  /* ------------------- Confirm dialog (promise) --------------------- */
  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4";
      overlay.innerHTML =
        '<div class="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6 animate-pop">' +
          '<div class="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-4">' +
            '<span class="material-symbols-outlined">' + (opts.icon || "help") + "</span></div>" +
          '<h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">' + OL.escapeHtml(opts.title || "Are you sure?") + "</h3>" +
          '<p class="text-body-sm text-secondary mb-6">' + OL.escapeHtml(opts.message || "") + "</p>" +
          '<div class="flex gap-3 justify-end">' +
            '<button data-act="cancel" class="px-4 py-2 rounded-lg font-label-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">' + OL.escapeHtml(opts.cancelText || "Cancel") + "</button>" +
            '<button data-act="ok" class="px-4 py-2 rounded-lg font-label-lg bg-error text-on-error hover:shadow-lg active:scale-95 transition-all">' + OL.escapeHtml(opts.confirmText || "Confirm") + "</button>" +
          "</div></div>";
      document.body.appendChild(overlay);
      function close(val) { overlay.remove(); resolve(val); }
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close(false);
        var act = e.target.closest("[data-act]");
        if (act) close(act.getAttribute("data-act") === "ok");
      });
    });
  }

  /* ----------------------- Admin shell (nav) ------------------------ *
   * base = relative path from the current page back to repo root
   * (e.g. "../../" for pages/admin/*). */
  var NAV = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard",        href: "pages/admin/dashboard.html" },
    { key: "orders",    label: "Orders",    icon: "receipt_long",     href: "pages/admin/orders.html" },
    { key: "pos",       label: "POS",       icon: "point_of_sale",    href: "pages/admin/pos.html" },
    { key: "menu",      label: "Menu",      icon: "restaurant_menu",  href: "pages/admin/menu.html" },
    { key: "analytics", label: "Analytics", icon: "analytics",        href: "pages/admin/analytics.html" },
    { key: "settings",  label: "Settings",  icon: "settings",         href: "pages/admin/settings.html" }
  ];

  function mountAdminShell(opts) {
    opts = opts || {};
    var base = opts.base || "../../";
    var active = opts.active;
    var r = OL.activeRestaurant() || { name: "OrderLink", tagline: "" };

    var navLinks = NAV.map(function (n) {
      var on = n.key === active;
      var cls = on
        ? "bg-primary-container text-on-primary-container rounded-lg font-bold px-4 py-3 flex items-center gap-3"
        : "text-on-surface-variant px-4 py-3 flex items-center gap-3 hover:bg-surface-container-highest transition-all rounded-lg";
      return '<a class="' + cls + '" href="' + base + n.href + '">' +
        '<span class="material-symbols-outlined">' + n.icon + "</span>" +
        '<span class="font-label-lg text-label-lg">' + n.label + "</span></a>";
    }).join("");

    var sidebar = document.getElementById("ol-sidebar");
    if (sidebar) {
      sidebar.className = "fixed left-0 top-0 h-screen w-[280px] bg-surface-container-low shadow-md hidden md:flex flex-col p-stack-lg z-40";
      sidebar.innerHTML =
        '<div class="flex items-center gap-3 mb-8 px-2">' +
          '<div class="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container text-xl">' + (r.emoji || "🍽️") + "</div>" +
          "<div><h1 class=\"font-headline-sm text-headline-sm font-bold text-on-surface leading-tight\">" + OL.escapeHtml(r.name) + "</h1>" +
          '<p class="font-label-md text-label-md text-secondary">Restaurant Console</p></div>' +
        "</div>" +
        '<nav class="flex-1 space-y-1">' + navLinks + "</nav>" +
        '<div class="mt-auto border-t border-outline-variant pt-4 space-y-1">' +
          '<a href="' + base + 'pages/customer/menu.html?r=' + r.slug + '" target="_blank" class="w-full bg-primary text-on-primary rounded-lg font-label-lg text-label-lg py-3 mb-2 flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95">' +
            '<span class="material-symbols-outlined text-[20px]">open_in_new</span>View Live Menu</a>' +
          '<a href="' + base + 'index.html" class="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-highest transition-all rounded-lg">' +
            '<span class="material-symbols-outlined">logout</span><span class="font-label-lg text-label-lg">Exit Console</span></a>' +
        "</div>";
    }

    var topbar = document.getElementById("ol-topbar");
    if (topbar) {
      topbar.className = "fixed top-0 w-full md:w-[calc(100%-280px)] z-30 flex justify-between items-center px-container-margin-mobile md:px-container-margin-desktop h-16 bg-surface/90 backdrop-blur border-b border-outline-variant";
      topbar.innerHTML =
        '<div class="flex items-center gap-3">' +
          '<button id="ol-nav-toggle" class="md:hidden p-2 hover:bg-surface-container-high rounded-full"><span class="material-symbols-outlined">menu</span></button>' +
          '<h2 class="font-headline-sm text-headline-sm text-on-surface">' + OL.escapeHtml(opts.title || "") + "</h2>" +
        "</div>" +
        '<div class="flex items-center gap-2">' +
          '<span id="ol-live-dot" class="hidden sm:flex items-center gap-2 text-label-md text-secondary mr-1"><span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>Live</span>' +
          '<div class="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-lg">' + (r.emoji || "🍽️") + "</div>" +
        "</div>";
    }

    // Mobile sidebar toggle
    var toggle = document.getElementById("ol-nav-toggle");
    if (toggle && sidebar) {
      toggle.addEventListener("click", function () {
        var open = sidebar.classList.toggle("flex");
        sidebar.classList.toggle("hidden");
        if (open) sidebar.classList.add("w-full", "inset-0");
        else sidebar.classList.remove("w-full", "inset-0");
      });
      sidebar.addEventListener("click", function (e) {
        if (e.target.closest("a") && global.innerWidth < 768) {
          sidebar.classList.add("hidden"); sidebar.classList.remove("flex", "w-full", "inset-0");
        }
      });
    }

    // Mobile bottom nav
    var bottom = document.getElementById("ol-bottomnav");
    if (bottom) {
      var items = [
        { key: "dashboard", icon: "dashboard", label: "Home", href: base + "pages/admin/dashboard.html" },
        { key: "orders", icon: "receipt_long", label: "Orders", href: base + "pages/admin/orders.html" },
        { key: "pos", icon: "point_of_sale", label: "POS", href: base + "pages/admin/pos.html" },
        { key: "menu", icon: "restaurant_menu", label: "Menu", href: base + "pages/admin/menu.html" }
      ];
      bottom.className = "fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 md:hidden bg-surface border-t border-outline-variant shadow-lg pb-safe";
      bottom.innerHTML = items.map(function (n) {
        var on = n.key === active;
        var cls = on
          ? "flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1"
          : "flex flex-col items-center justify-center text-on-surface-variant px-3 py-1";
        return '<a class="' + cls + '" href="' + n.href + '"><span class="material-symbols-outlined">' + n.icon + "</span><span class=\"font-label-sm text-[10px]\">" + n.label + "</span></a>";
      }).join("");
    }
  }

  OL.ui = {
    toast: toast,
    copy: copy,
    qrUrl: qrUrl,
    statusBadge: statusBadge,
    statusBadgeIcon: statusBadgeIcon,
    toneClasses: toneClasses,
    confirm: confirmDialog,
    mountAdminShell: mountAdminShell
  };
})(window);
