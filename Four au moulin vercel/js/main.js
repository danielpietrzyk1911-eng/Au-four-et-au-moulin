/* =================================================================
   AU FOUR ET AU MOULIN — interactions & animations
   Vanilla JS, no dependencies.
   ================================================================= */
(function () {
  "use strict";
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var supportsIO = "IntersectionObserver" in window;

  /* ---------- Année ---------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Nav : état au scroll ---------- */
  var nav = document.querySelector("[data-nav]");
  var navTick = false;
  function onScrollNav() {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 40);
    navTick = false;
  }
  window.addEventListener("scroll", function () {
    if (!navTick) { requestAnimationFrame(onScrollNav); navTick = true; }
  }, { passive: true });
  onScrollNav();

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector("[data-menu-toggle]");
  var mobileMenu = document.querySelector("[data-mobile-menu]");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    }
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (toggle && mobileMenu) {
    toggle.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
  });

  /* ---------- Révélation au scroll (+ stagger) ---------- */
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    var items = group.querySelectorAll(":scope > [data-reveal]");
    items.forEach(function (el, i) { el.style.setProperty("--rd", (i * 0.09) + "s"); });
  });

  var revealEls = document.querySelectorAll("[data-reveal]");
  if (prefersReduced || !supportsIO) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { revObs.observe(el); });
  }

  /* ---------- Lien de navigation actif ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav__links a"));
  if (supportsIO && navLinks.length) {
    var navH = (nav ? nav.offsetHeight : 72);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var link = navLinks.find(function (a) { return a.getAttribute("href") === "#" + e.target.id; });
          if (link) {
            navLinks.forEach(function (a) { a.classList.remove("is-active"); });
            link.classList.add("is-active");
          }
        }
      });
    }, { rootMargin: "-" + (navH + 12) + "px 0px -55% 0px", threshold: 0 });
    document.querySelectorAll("main section[id]").forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Onglets de la carte ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (tabs) {
    var btns = Array.prototype.slice.call(tabs.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(tabs.querySelectorAll('[role="tabpanel"]'));
    function activate(i) {
      btns.forEach(function (b, bi) {
        var on = bi === i;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, pi) { p.hidden = pi !== i; });
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { activate(i); });
      b.addEventListener("keydown", function (e) {
        var ni;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") ni = (i + 1) % btns.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") ni = (i - 1 + btns.length) % btns.length;
        else if (e.key === "Home") ni = 0;
        else if (e.key === "End") ni = btns.length - 1;
        else return;
        e.preventDefault();
        activate(ni);
        btns[ni].focus();
      });
    });
  });

  /* ---------- Compteurs animés ---------- */
  function animateCount(el) {
    var target = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.decimals || "0", 10);
    var suffix = el.dataset.suffix || "";
    function fmt(v) { return v.toFixed(dec).replace(".", ","); }
    if (prefersReduced) { el.textContent = fmt(target) + suffix; return; }
    var dur = 1500, start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target) + suffix;
    }
    requestAnimationFrame(tick);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if (!supportsIO) {
      counters.forEach(animateCount);
    } else {
      var cObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateCount(e.target); cObs.unobserve(e.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (c) { cObs.observe(c); });
    }
  }

  /* ---------- Parallaxe (bandeau citation) ---------- */
  var parallax = document.querySelector("[data-parallax]");
  if (parallax && !prefersReduced) {
    var pTick = false;
    function updateParallax() {
      var host = parallax.parentElement;
      var rect = host.getBoundingClientRect();
      var vh = window.innerHeight;
      if (rect.bottom > 0 && rect.top < vh) {
        var progress = (rect.top - vh) / (rect.height + vh); // ~ -1 → 0
        parallax.style.transform = "translate3d(0," + (progress * 55) + "px,0)";
      }
      pTick = false;
    }
    window.addEventListener("scroll", function () {
      if (!pTick) { requestAnimationFrame(updateParallax); pTick = true; }
    }, { passive: true });
    window.addEventListener("resize", updateParallax, { passive: true });
    updateParallax();
  }

  /* ---------- Lightbox (galerie) ---------- */
  var lb = document.querySelector("[data-lightbox-modal]");
  if (lb) {
    var lbImg = lb.querySelector(".lightbox__img");
    var lbClose = lb.querySelector(".lightbox__close");
    var lastFocus = null;
    function openLB(src, alt) {
      lbImg.src = src; lbImg.alt = alt || "";
      lb.classList.add("is-open");
      lastFocus = document.activeElement;
      document.body.style.overflow = "hidden";
      lbClose.focus();
    }
    function closeLB() {
      lb.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(function () { lbImg.src = ""; }, 300);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    document.querySelectorAll("[data-lightbox]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var img = btn.querySelector("img");
        if (img) openLB(img.currentSrc || img.src, img.alt);
      });
    });
    lbClose.addEventListener("click", closeLB);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLB(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("is-open")) closeLB();
    });
  }

  /* ---------- Hero à défilement (clip-path reveal) ---------- */
  var sh = document.querySelector("[data-scrollhero]");
  if (sh && !prefersReduced) {
    var shFrame = sh.querySelector("[data-scrollhero-frame]");
    var shBg = sh.querySelector("[data-scrollhero-bg]");
    var shInit = 25, shFinal = 75, shTick = false;
    function updateScrollHero() {
      var rect = sh.getBoundingClientRect();
      var range = sh.offsetHeight - window.innerHeight;
      var p = range > 0 ? Math.min(Math.max(-rect.top / range, 0), 1) : 0;
      var cs = shInit * (1 - p);              // 25% -> 0%
      var ce = shFinal + (100 - shFinal) * p; // 75% -> 100%
      shFrame.style.clipPath =
        "polygon(" + cs + "% " + cs + "%, " + ce + "% " + cs + "%, " + ce + "% " + ce + "%, " + cs + "% " + ce + "%)";
      shBg.style.transform = "scale(" + (1.15 - 0.15 * p) + ")"; // 1.15 -> 1.0 (zoom out)
      shTick = false;
    }
    window.addEventListener("scroll", function () {
      if (!shTick) { requestAnimationFrame(updateScrollHero); shTick = true; }
    }, { passive: true });
    window.addEventListener("resize", updateScrollHero, { passive: true });
    updateScrollHero();
  }
})();
