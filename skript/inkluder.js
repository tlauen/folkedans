(() => {
  // Endre denne når du har oppdatert topp/kolofon og vil tvinge refresh i Safari
  const INC_VERSJON = "2026-03-05-2";
  const DEV_NO_CACHE = false; // set true berre under testing
  const scriptSrc = document.currentScript?.src || "skript/inkluder.js";
  const scriptUrl = new URL(scriptSrc, window.location.href);
  const prosjektRot = scriptUrl.pathname.replace(/\/skript\/inkluder\.js$/, "").replace(/\/$/, "");
  const rotUtanSlash = prosjektRot.replace(/^\/+|\/+$/g, "");

  // make project root available globally for other scripts
  window.PROSJEKT_ROT = prosjektRot;

  function medProsjektRot(sti) {
    if (!sti.startsWith("/")) return `${prosjektRot}/${sti}`;
    return `${prosjektRot}${sti}`;
  }

  function cacheKey(url) {
    return `inc:${INC_VERSJON}:${url}`;
  }

  function ryddGamalIncludeCache() {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("inc:") && !k.startsWith(`inc:${INC_VERSJON}:`)) {
          sessionStorage.removeItem(k);
        }
      }
    } catch (e) {}
  }

  async function hentTekst(url) {
    // 1) sessionStorage (snøgt)
    if (!DEV_NO_CACHE) {
      const cached = sessionStorage.getItem(cacheKey(url));
      if (cached) return cached;
    }

    // 2) cache-buster i URL (styrer nettlesar + evt. mellomcache)
    const bustUrl = DEV_NO_CACHE
      ? `${url}?v=${Date.now()}`
      : `${url}?v=${encodeURIComponent(INC_VERSJON)}`;

    const res = await fetch(bustUrl, { cache: DEV_NO_CACHE ? "no-store" : "default" });
    if (!res.ok) throw new Error(`Klarte ikkje laste ${url} (HTTP ${res.status})`);

    const txt = await res.text();

    if (!DEV_NO_CACHE) {
      sessionStorage.setItem(cacheKey(url), txt);
    }

    return txt;
  }

  function merkAktivSide(container) {
    let path = window.location.pathname
      .replace(/^\/+/, "")
      .split("?")[0]
      .split("#")[0];

    if (rotUtanSlash && (path === rotUtanSlash || path.startsWith(`${rotUtanSlash}/`))) {
      path = path.slice(rotUtanSlash.length).replace(/^\/+/, "");
    }

    const lenkjer = container.querySelectorAll("nav a");
    lenkjer.forEach(a => a.removeAttribute("aria-current"));

    // URL-prefiks → data-nav i topp.html
    const reglar = [
      { prefix: "",        nav: "dans" },     // /
      { prefix: "index",   nav: "dans" },     // /index
      { prefix: "innhald", nav: "innhald" },  // /innhald
      { prefix: "song/",   nav: "innhald" },  // /song/...
      { prefix: "pdf/",    nav: "innhald" },  // /pdf/...
      { prefix: "kjelder", nav: "kjelder" },  // /kjelder
      { prefix: "om",      nav: "om" }        // /om  
    ];

    // Tom path = rota
    if (!path) {
      const a = Array.from(lenkjer).find(x => x.dataset.nav === "dans");
      if (a) a.setAttribute("aria-current", "page");
      return;
    }

    for (const r of reglar) {
      if (path === r.prefix || (r.prefix && path.startsWith(r.prefix))) {
        const a = Array.from(lenkjer).find(x => x.dataset.nav === r.nav);
        if (a) a.setAttribute("aria-current", "page");
        return;
      }
    }
  }

  async function lastInn(selector, fil, etterpå) {
    const mål = document.querySelector(selector);
    if (!mål) return;

    try {
      const html = await hentTekst(fil);
      mål.innerHTML = html;
      if (etterpå) etterpå(mål);
    } catch (e) {
      console.error(e);
      // Valfritt: vis ein liten feilmelding i DOM (utan å øydelegge sida)
      mål.innerHTML = "";
    }
  }

  // Helper: rewrite absolute-root links to include project root prefix
  function fixRootLinks() {
    // anchors
    const anchors = document.querySelectorAll('a[href^="/"]');
    anchors.forEach(a => {
      const h = a.getAttribute('href');
      if (!h || h.startsWith(prosjektRot + "/")) return;
      a.setAttribute('href', prosjektRot + h);
    });

    // canonical tags
    const canonicals = document.querySelectorAll('link[rel="canonical"]');
    canonicals.forEach(l => {
      const h = l.getAttribute('href');
      if (h && h.startsWith("/")) {
        l.setAttribute('href', prosjektRot + h);
      }
    });
  }

  // Køyre
  ryddGamalIncludeCache();

  Promise.all([
    lastInn("#topp-include", medProsjektRot("/delar/topp.html"), mål => {
      merkAktivSide(mål);
      fixRootLinks();
    }),
    lastInn("#kolofon-include", medProsjektRot("/delar/kolofon.html"))
  ]).then(() => {
    // also fix links outside of includes once DOM is ready
    document.addEventListener('DOMContentLoaded', fixRootLinks);
  });
})();
