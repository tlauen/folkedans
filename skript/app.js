/* global Papa, DataTable, jQuery */

/*
  folkedans.net – app.js (rask førstegongvising)
  - Lastar berre aktiv kategori (hash) ved start
  - Cache av CSV i localStorage (TTL)
  - DataTables: paging + deferRender → byggjer berre 25 rader i DOM først
  - “Last inn alle” under fanene → viser alle rader med eitt klikk
  - Tal-sort: numerisk, tomt alltid nederst
  - Kjelde-boble med knappar
*/

(() => {
  const KJELDER = window.KJELDER || [];
  const ORDLISTE = window.KJELDE_ORDLISTE || {};

  // fix any absolute-root links that may already be in the DOM or generated later
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (typeof window.fixRootLinks === "function") window.fixRootLinks();
    });
  } else {
    if (typeof window.fixRootLinks === "function") window.fixRootLinks();
  }

  // Endre for å nullstille cache ved store endringar
  const VERSJON = "3";

  // Cache-levetid (12 timar)
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

  // Standard: vis berre 25 rader (raskt). “Last inn alle” viser resten.
  const SIDE_LENGD = 25;

  // Kolonnenamn i CSV (Google Sheets)
  const KOLONNE = {
    namn: "Namn",
    kategori: "Kategori",
    underkategori: "Underkategori",
    tradisjon: "Tradisjonsområde",
    kjelde: "Kjelde",
    sidetal: "Sidetal",
    rettleiing: "Rettleiing",
    lyd: "Lydopptak",
    film: "Film",
    vers: "Vers",
    brigde: "Brigde"
  };

  // indeksar i tabellen: 0 Namn, 1 Kategori, 2 Underkategori, 3 Tradisjonsområde, 4 Kjelde, 5 Sidetal, 6 Lenker, 7 Vers, 8 Brigde
  const KAN_SKJULAST = [1, 2, 3, 7, 8];

  const el = {
    faner: document.getElementById("faner"),
    aktivNamn: document.getElementById("aktivNamn"),
    radTal: document.getElementById("radTal"),
    status: document.getElementById("status"),
    tabell: document.getElementById("dansTabell")
  };

  let tabell = null;
  let aktivIndeks = 0;
  let aktivLastToken = 0;

  // Minnecache: url -> { csvText, rader }
  const minneCache = new Map();

  // UI for “Last inn alle”
  let lastInnAlleKnapp = null;
  let lastInnAlleInfo = null;

  function setStatus(melding, feil = false) {
    if (!el.status) return;
    el.status.textContent = melding;
    el.status.className = "status" + (feil ? " feil" : "");
  }

  function escHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escAttr(s) {
    return String(s ?? "").replace(/"/g, "&quot;");
  }

  // ----------------------------------------
  // DataTables sort: numerisk + tomt alltid nederst
  // ----------------------------------------
  (function registrerTalTomtNedstSort() {
    if (!window.jQuery || !jQuery.fn?.dataTable?.ext?.type?.order) return;

    function parseTal(val) {
      const s = (val ?? "").toString().replace(/<[^>]*>/g, "").trim();
      if (!s) return { tom: true, tal: 0 };

      const m = s.match(/-?\d+(\.\d+)?/);
      if (!m) return { tom: true, tal: 0 };

      const n = Number(m[0]);
      if (!Number.isFinite(n)) return { tom: true, tal: 0 };

      return { tom: false, tal: n };
    }

    jQuery.extend(jQuery.fn.dataTable.ext.type.order, {
      "tal-tomt-nedst-asc": function (a, b) {
        const A = parseTal(a), B = parseTal(b);
        if (A.tom !== B.tom) return A.tom ? 1 : -1;
        return A.tal - B.tal;
      },
      "tal-tomt-nedst-desc": function (a, b) {
        const A = parseTal(a), B = parseTal(b);
        if (A.tom !== B.tom) return A.tom ? 1 : -1;
        return B.tal - A.tal;
      }
    });
  })();

  // ----------------------------------------
  // Rendering
  // ----------------------------------------
  function renderKjeldeCelle(kort) {
    const f = (kort || "").trim();
    if (!f) return `<span class="muted">–</span>`;

    const oppslag = ORDLISTE[f];
    if (!oppslag) return escHtml(f);

    return `<button class="kjeldeknapp" type="button"
      data-forkorting="${escHtml(f)}"
      data-tittel="${escHtml(oppslag.tittel || f)}"
      data-tekst="${escHtml(oppslag.tekst || "")}"
      data-url="${escHtml(oppslag.url || "")}"
    >${escHtml(f)}</button>`;
  }

  // Støttar fleire lenker per celle:
  // - linjeskift (tilrådd)
  // - eller "url1, url2" (komma før URL)
  function lagLinkknappar(verdi, etikett) {
    if (!verdi) return "";
    return verdi
      .toString()
      .split(/\r?\n|,\s*(?=https?:\/\/)/)
      .map(v => v.trim())
      .filter(Boolean)
      .map(url => `<a class="linkknapp" href="${escAttr(url)}" target="_blank" rel="noopener noreferrer">${etikett}</a>`)
      .join("");
  }

  function parseFørsteHeltal(verdi) {
    const m = (verdi ?? "").toString().match(/-?\d+/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  function tilOddTal(n) {
    if (!Number.isFinite(n)) return null;
    const x = Math.trunc(n);
    return x % 2 === 0 ? x + 1 : x;
  }

  function finnRettleiingNbMeta(verdi) {
    const s = (verdi ?? "").toString().trim();
    if (!s) return null;

    function finnUrn(str) {
      return str.match(/URN:[^\/?#]+/i)?.[0] || null;
    }

    // Vanleg tilfelle: CSV inneheld forkorting (t.d. "NF:S")
    const direkte = ORDLISTE[s];
    if (direkte?.nb) return direkte;

    // Alternativ: CSV inneheld nb.no-URL (evt utan/med page=...)
    // Støttar både /items/... og /maken/item/... (og evt andre nb.no-mønster)
    if (!s.includes("nb.no")) return null;
    const urn = finnUrn(s);
    if (!urn) return null;

    for (const v of Object.values(ORDLISTE)) {
      if (v?.nb && v.nb.includes(urn)) return v;
    }
    return null;
  }

  function lagNbUrlMedPage(nbBaseUrl, pageParam) {
    if (!nbBaseUrl || !Number.isFinite(pageParam)) return null;

    // Prøv robust v1: URL() med searchParams (støttar berre absolute URL).
    try {
      const u = new URL(nbBaseUrl);
      u.searchParams.set("page", String(pageParam));
      return u.toString();
    } catch {
      // Fallback: streng-basert
      const utanPage = nbBaseUrl.replace(/([?&])page=\-?\d+/i, "$1").replace(/[?&]$/, "");
      const sep = nbBaseUrl.includes("?") ? "&" : "?";
      return `${utanPage}${sep}page=${pageParam}`;
    }
  }

  function finnNbUrlForRettleiing(rwRettleiingVerdi, sidetal) {
    const raw = (rwRettleiingVerdi ?? "").toString();
    if (!raw.trim()) return null;

    const sidetalNum = parseFørsteHeltal(sidetal);
    if (!Number.isFinite(sidetalNum)) return null;

    const delar = raw
      .split(/\r?\n|,\s*(?=https?:\/\/)/)
      .map(v => v.trim())
      .filter(Boolean);

    function finnUrn(str) {
      return (str ?? "").toString().match(/URN:[^\/?#]+/i)?.[0] || null;
    }

    for (const seg of delar) {
      const meta = finnRettleiingNbMeta(seg);
      if (meta?.nb) {
        const start = Number(meta.start ?? 0);
        const pageParam = tilOddTal(sidetalNum + start);
        const nbUrl = lagNbUrlMedPage(meta.nb, pageParam);
        if (nbUrl) return nbUrl;
      }

      // Dersom CSV brukar ein kjelde-/forkortingskode (t.d. "DT:F") i Rettleiing,
      // så kan vi framleis lage page-param basert på ORDLISTE[seg].url (dersom den
      // peikar til nb.no-items).
      const direkte = ORDLISTE[seg];
      if (direkte?.url && direkte.url.includes("nb.no") && (direkte.url.includes("/items/") || direkte.url.includes("/maken/item/"))) {
        const start = Number(direkte.start ?? 0);
        const pageParam = tilOddTal(sidetalNum + start);
        const nbUrl = lagNbUrlMedPage(direkte.url, pageParam);
        if (nbUrl) return nbUrl;
      }

      // Fallback: dersom CSV inneheld ei nb.no-URL som har URN,
      // rekne ut page= (start=0) sjølv om vi manglar mapping.
      if (seg.includes("nb.no") && finnUrn(seg)) {
        const pageParam = tilOddTal(sidetalNum);
        const nbUrl = lagNbUrlMedPage(seg, pageParam);
        if (nbUrl) return nbUrl;
      }

      // Fallback v2: nb.no-URL utan URN (t.d. /items/<id>) — legg på page basert på sidetal.
      if (seg.includes("nb.no") && (seg.includes("/items/") || seg.includes("/maken/item/"))) {
        const pageParam = tilOddTal(sidetalNum);
        const nbUrl = lagNbUrlMedPage(seg, pageParam);
        if (nbUrl) return nbUrl;
      }
    }
    return null;
  }

  function finnNbUrlForKjelde(kjeldeVerdi, sidetal) {
    const code = (kjeldeVerdi ?? "").toString().trim();
    if (!code) return null;

    const meta = ORDLISTE[code];
    if (!meta) return null;

    const sidetalNum = parseFørsteHeltal(sidetal);
    if (!Number.isFinite(sidetalNum)) return null;

    // Regelen din: vi brukar berre nb-feltet i ordlista.
    const nbBaseUrl = (meta.nb ?? "").toString().trim();
    if (!nbBaseUrl) return null;

    const start = Number(meta.start ?? 0);
    const pageParam = tilOddTal(sidetalNum + start);
    return lagNbUrlMedPage(nbBaseUrl, pageParam);
  }

  function lagRettleiingAndreLenker(verdi) {
    const raw = (verdi ?? "").toString();
    if (!raw.trim()) return "";

    const delar = raw
      .split(/\r?\n|,\s*(?=https?:\/\/)/)
      .map(v => v.trim())
      .filter(Boolean);

    const lenkjer = [];

    for (const seg of delar) {
      // Hopp over nb.no-lenker; desse blir flytta til Sidetal-lenka.
      if (seg.includes("nb.no")) continue;
      const direkte = ORDLISTE[seg];
      if (direkte?.url?.includes("nb.no")) continue;

      const oppslag = ORDLISTE[seg];
      if (oppslag?.url) {
        lenkjer.push(
          `<a class="linkknapp" href="${escAttr(oppslag.url)}" target="_blank" rel="noopener noreferrer">Rettleiing</a>`
        );
        continue;
      }

      // Dersom CSV inneheld URL direkte, bruk den (dersom den ikkje var nb.no).
      if (/^https?:\/\//i.test(seg)) {
        lenkjer.push(
          `<a class="linkknapp" href="${escAttr(seg)}" target="_blank" rel="noopener noreferrer">Rettleiing</a>`
        );
      }
    }

    return lenkjer.join("");
  }

  function renderLenkjer(rad, kjeldeHarNb) {
    const rettleiingAndre = kjeldeHarNb ? "" : lagRettleiingAndreLenker(rad[KOLONNE.rettleiing]);
    const lyd = lagLinkknappar(rad[KOLONNE.lyd], "Lyd");
    const film = lagLinkknappar(rad[KOLONNE.film], "Film");
    const alle = [rettleiingAndre, lyd, film].filter(Boolean).join("");
    return alle || `<span class="muted">–</span>`;
  }

  function renderBrigde(verdi) {
    const v = (verdi || "").toString().trim().toLowerCase();
    if (v === "ja") return `<span class="ikon-ja" aria-label="Brigde">✔</span>`;
    return `<span class="muted">–</span>`;
  }

  // ----------------------------------------
  // Dataklargjering
  // ----------------------------------------
  function normaliserRad(rad) {
    const hent = (k) => (rad?.[k] ?? "").toString().trim();
    return {
      namn: hent(KOLONNE.namn),
      kategori: hent(KOLONNE.kategori),
      underkategori: hent(KOLONNE.underkategori),
      tradisjon: hent(KOLONNE.tradisjon),
      kjelde: hent(KOLONNE.kjelde),
      sidetal: hent(KOLONNE.sidetal),
      vers: hent(KOLONNE.vers),
      brigde: hent(KOLONNE.brigde),
      _rå: rad
    };
  }

  function parseCsvTilRader(csvText) {
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    return (parsed.data || [])
      .map(normaliserRad)
      .filter(r => r.namn);
  }

  // ----------------------------------------
  // Faner + hash
  // ----------------------------------------
  function byggFaner() {
    if (!el.faner) return;
    el.faner.innerHTML = "";

    KJELDER.forEach((k, idx) => {
      const btn = document.createElement("button");
      btn.className = "faneknapp";
      btn.type = "button";
      btn.role = "tab";
      btn.textContent = k.namn;
      btn.setAttribute("aria-selected", idx === aktivIndeks ? "true" : "false");

      btn.addEventListener("click", () => {
        if (k.key) history.replaceState(null, "", `#${k.key}`);
        lastKategori(idx);
      });

      el.faner.appendChild(btn);
    });
  }

  function setAktivFane(idx) {
    aktivIndeks = idx;
    const knappar = el.faner?.querySelectorAll("button") || [];
    [...knappar].forEach((b, i) => b.setAttribute("aria-selected", i === idx ? "true" : "false"));
    if (el.aktivNamn) el.aktivNamn.textContent = KJELDER[idx]?.namn || "–";
  }

  function idxFråHash() {
    const hash = window.location.hash.replace("#", "").trim();
    if (!hash) return -1;
    return KJELDER.findIndex(k => k.key === hash);
  }

  function bindHashChange() {
    window.addEventListener("hashchange", () => {
      const idx = idxFråHash();
      if (idx >= 0) lastKategori(idx);
    });
  }

  // ----------------------------------------
  // CSV cache (localStorage)
  // ----------------------------------------
  function cacheKey(url) {
    return `folkedans:csv:${VERSJON}:${url}`;
  }

  function lesCache(url) {
    try {
      const raw = localStorage.getItem(cacheKey(url));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.text !== "string" || typeof obj.t !== "number") return null;
      if (Date.now() - obj.t > CACHE_TTL_MS) return null;
      return obj.text;
    } catch {
      return null;
    }
  }

  function skrivCache(url, text) {
    try {
      localStorage.setItem(cacheKey(url), JSON.stringify({ t: Date.now(), text }));
    } catch {
      // ignore (kvote / privat modus)
    }
  }

  async function hentCSV(url, { tillatCache = true } = {}) {
    if (tillatCache) {
      const cached = lesCache(url);
      if (cached) return { text: cached, fråCache: true };
    }

    // Browser cache kan framleis hjelpe
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Kunne ikkje hente CSV (HTTP ${res.status}).`);

    const text = await res.text();
    skrivCache(url, text);
    return { text, fråCache: false };
  }

  // ----------------------------------------
  // “Last inn alle” – under fanene, over tabellen
  // ----------------------------------------
  function byggLastInnAlleKontroll() {
    if (lastInnAlleKnapp) return; // alt laga

    if (!el.faner) return;

    const wrap = document.createElement("div");
    wrap.className = "kontrollar";
    wrap.style.margin = "6px 0 10px";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "faneknapp";
    btn.id = "lastInnAlle";
    btn.textContent = "Last inn alle";
    btn.title = "Vis alle oppføringar (kan bli tungt ved store lister)";

    const info = document.createElement("span");
    info.className = "muted";
    info.id = "lastInnAlleInfo";
    info.textContent = "";

    btn.addEventListener("click", () => {
      if (!tabell) return;
      tabell.page.len(-1).page(0).draw(false);
      oppdaterLastInnAlleUI();
    });

    wrap.appendChild(btn);
    wrap.appendChild(info);

    // Sett inn direkte etter fanene
    el.faner.insertAdjacentElement("afterend", wrap);

    lastInnAlleKnapp = btn;
    lastInnAlleInfo = info;
  }

  function oppdaterLastInnAlleUI() {
    if (!tabell || !lastInnAlleKnapp || !lastInnAlleInfo) return;

    const i = tabell.page.info(); // {start,end,recordsDisplay,length,...}
    const viserAlle = i.length === -1;

    if (viserAlle) {
      lastInnAlleInfo.textContent = `Viser alle ${i.recordsDisplay} oppføringar.`;
      lastInnAlleKnapp.style.display = "none";
    } else {
      lastInnAlleInfo.textContent = `Viser ${Math.min(i.end, i.recordsDisplay)} av ${i.recordsDisplay}.`;
      lastInnAlleKnapp.style.display = "inline-flex";
    }
  }

  // ----------------------------------------
  // Tabell (paging + deferRender)
  // ----------------------------------------
  function skjulTommeKolonnar(rader) {
    if (!tabell) return;

    const feltForKolonne = {
      1: "kategori",
      2: "underkategori",
      3: "tradisjon",
      7: "vers",
      8: "brigde"
    };

    KAN_SKJULAST.forEach((kolIdx) => {
      const felt = feltForKolonne[kolIdx];
      const harNoko = rader.some(r => (r[felt] || "").trim().length > 0);
      tabell.column(kolIdx).visible(harNoko);
    });

    tabell.columns.adjust().draw(false);
  }

  function initEllerOppdaterTabell(rader) {
    const data = rader.map(r => ({
      namn: r.namn || "",
      kategori: r.kategori || "",
      underkategori: r.underkategori || "",
      tradisjon: r.tradisjon || "",
      kjelde_html: renderKjeldeCelle(r.kjelde),
      _kjeldeHarNb: Boolean((ORDLISTE[r.kjelde]?.nb ?? "").toString().trim()),
      sidetal_vis: (() => {
        const nbUrl = r._rå && r._rå[KOLONNE.kjelde] ? finnNbUrlForKjelde(r.kjelde, r.sidetal) : finnNbUrlForKjelde(r.kjelde, r.sidetal);
        if (!nbUrl) return r.sidetal || "";
        const sid = escHtml(r.sidetal || "");
        return `<a
          class="linkknapp sidetal-link"
          href="${escAttr(nbUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          title="Opne rettleiing på nb.no"
          aria-label="Opne rettleiing på nb.no for sidetal ${sid}"
        >${sid}</a>`;
      })(),
      lenkjer_html: renderLenkjer(r._rå, Boolean((ORDLISTE[r.kjelde]?.nb ?? "").toString().trim())),
      vers_vis: r.vers || "",
      brigde: renderBrigde(r.brigde)
    }));

    // Sørg for at kontrollen finst (uansett om tabellen blir init eller oppdatert)
    byggLastInnAlleKontroll();

    if (tabell) {
      tabell.clear();
      tabell.rows.add(data);

      // Gå tilbake til “rask modus” ved fane-bytte / ny lasting
      tabell.page.len(SIDE_LENGD);
      tabell.page(0).draw(false);

      skjulTommeKolonnar(rader);
      oppdaterLastInnAlleUI();
      return;
    }

    tabell = new DataTable("#dansTabell", {
      data,
      columns: [
        { title: "Namn", data: "namn" },
        { title: "Kategori", data: "kategori" },
        { title: "Underkategori", data: "underkategori" },
        { title: "Tradisjonsområde", data: "tradisjon" },
        { title: "Kjelde", data: "kjelde_html" },
        { title: "Sidetal", data: "sidetal_vis" },
        { title: "Lenker", data: "lenkjer_html", orderable: false, searchable: false },
        { title: "Vers", data: "vers_vis" },
        { title: "Brigde", data: "brigde" }
      ],
      columnDefs: [
        { targets: [4, 5, 6], render: (d) => d },     // HTML
        { targets: [5, 7], type: "tal-tomt-nedst" }   // numerisk + tomt nederst
      ],

      // Ytelse:
      paging: true,
      pageLength: SIDE_LENGD,
      deferRender: true,

      // UI (du skjuler mykje med CSS, det er OK):
      info: false,
      lengthChange: false,

      order: [[0, "asc"]],
      language: {
        search: "Søk:",
        zeroRecords: "Ingen treff"
      }
    });

    // Når søk/sortering/draw skjer → oppdater “Last inn alle”-info
    tabell.on("draw", () => oppdaterLastInnAlleUI());

    skjulTommeKolonnar(rader);
    oppdaterLastInnAlleUI();
  }

  // ----------------------------------------
  // Last kategori
  // ----------------------------------------
  async function lastKategori(idx) {
    if (!KJELDER.length) return;

    setAktivFane(idx);

    const kjelde = KJELDER[idx];
    const url = kjelde?.csv;
    if (!url) return;

    const token = ++aktivLastToken;

    try {
      // 1) Minnecache (snøggast)
      const iMinne = minneCache.get(url);
      if (iMinne?.rader) {
        initEllerOppdaterTabell(iMinne.rader);
        if (el.radTal) el.radTal.textContent = `${iMinne.rader.length} oppføringar`;
        setStatus("Klar.");
        if (kjelde.key) history.replaceState(null, "", `#${kjelde.key}`);
        return;
      }

      // 2) Hent (med localStorage-cache)
      setStatus("Lastar data …");
      const { text, fråCache } = await hentCSV(url, { tillatCache: true });
      if (token !== aktivLastToken) return;

      // La nettlesaren få teikne UI før parse (litt betre oppleving)
      await new Promise(requestAnimationFrame);

      const rader = parseCsvTilRader(text);
      minneCache.set(url, { csvText: text, rader });

      initEllerOppdaterTabell(rader);
      if (el.radTal) el.radTal.textContent = `${rader.length} oppføringar`;

      if (kjelde.key) history.replaceState(null, "", `#${kjelde.key}`);

      setStatus(fråCache ? "Klar." : "Klar.");

    } catch (e) {
      console.error(e);
      setStatus(`Feil: ${e.message}`, true);
      initEllerOppdaterTabell([]);
      if (el.radTal) el.radTal.textContent = "0 oppføringar";
    }
  }

  // ----------------------------------------
  // Kjelde-boble (same logikk som du kjenner frå før)
  // ----------------------------------------
  let bobleEl = null;
  let sistAnker = null;

  function lukkBoble() {
    if (bobleEl) bobleEl.remove();
    bobleEl = null;
    sistAnker = null;
  }

  function opneBoble(ankerEl, forkorting, tittel, tekst, url) {
    if (sistAnker === ankerEl && bobleEl) { lukkBoble(); return; }
    lukkBoble();

    const rect = ankerEl.getBoundingClientRect();
    const tryggUrl = (url || "").trim();

    const lenkjeHtml = tryggUrl
      ? `<a href="${escHtml(tryggUrl)}" target="_blank" rel="noopener noreferrer">Opne kjelde</a>`
      : "";

    bobleEl = document.createElement("div");
    bobleEl.className = "boble";
    bobleEl.innerHTML = `
      <div class="tittel">${escHtml(forkorting)} – ${escHtml(tittel)}</div>
      ${tekst ? `<div class="tekst">${escHtml(tekst)}</div>` : ""}
      ${lenkjeHtml}
    `;
    document.body.appendChild(bobleEl);

    const pad = 10;
    const bobRect = bobleEl.getBoundingClientRect();

    let left = rect.left;
    let top = rect.bottom + 10;

    if (left + bobRect.width > window.innerWidth - pad) left = window.innerWidth - pad - bobRect.width;
    if (left < pad) left = pad;

    if (top + bobRect.height > window.innerHeight - pad) top = rect.top - 10 - bobRect.height;
    if (top < pad) top = pad;

    bobleEl.style.left = `${Math.round(left)}px`;
    bobleEl.style.top = `${Math.round(top)}px`;

    sistAnker = ankerEl;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".kjeldeknapp");
    if (btn) {
      e.stopPropagation();
      opneBoble(
        btn,
        btn.getAttribute("data-forkorting") || "",
        btn.getAttribute("data-tittel") || "",
        btn.getAttribute("data-tekst") || "",
        btn.getAttribute("data-url") || ""
      );
      return;
    }
    if (bobleEl) lukkBoble();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bobleEl) lukkBoble();
  });

  window.addEventListener("scroll", () => { if (bobleEl) lukkBoble(); }, { passive: true });
  window.addEventListener("resize", () => { if (bobleEl) lukkBoble(); });

  // Skjul «skroll til høgre»-hint når brukar skroller meny eller tabell
  const skrollHint = document.getElementById("skrollHint");
  if (skrollHint) {
    const skjulHint = () => skrollHint.classList.add("skjult");
    el.faner?.addEventListener("scroll", skjulHint, { passive: true });
    document.querySelector(".tabellwrap")?.addEventListener("scroll", skjulHint, { passive: true });
  }

  // ----------------------------------------
  // Start
  // ----------------------------------------
  byggFaner();
  bindHashChange();

  const idx = idxFråHash();
  if (idx >= 0) lastKategori(idx);
  else lastKategori(0);
})();