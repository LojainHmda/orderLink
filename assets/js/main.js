/**
 * OrderLink Admin — shared UI interactions.
 *
 * Currently handles the mobile sidebar (off-canvas) toggle. Written
 * defensively so the same file can be dropped onto any page, whether or
 * not that page actually has a toggle button / sidebar.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var sidebar = document.querySelector("aside");
    var toggleBtn = document.querySelector("header button.md\\:hidden");

    if (!sidebar) return;

    // Open / close the off-canvas sidebar on mobile.
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        sidebar.classList.toggle("hidden");
        sidebar.classList.toggle("flex");
        sidebar.classList.add("w-full", "fixed", "inset-0");
      });
    }

    // Auto-close the sidebar after tapping a nav link on small screens.
    var navLinks = sidebar.querySelectorAll("nav a, .mt-auto a");
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth < 768) {
          sidebar.classList.add("hidden");
          sidebar.classList.remove("flex", "w-full", "fixed", "inset-0");
        }
      });
    });
  });
})();
