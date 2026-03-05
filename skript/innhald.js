(() => {
  const ORDLISTE = window.KJELDE_ORDLISTE || {};

  // Endre denne når du vil tvinge nettlesaren til å hente ferske filer
  const VERSJON = "16";

  const el = {
    songListe: document.getElementById("songListe"),
    pdfListe: document.getElementById("pdfListe"),
    songStatus: document.getElementById("songStatus"),
    pdfStatus: document.getElementById("pdfStatus"),
    sokSong: document.getElementById("sokSong"),
    sokPdf: document.getElementById("sokPdf")
  };

  function escHtml(s){
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escMedLinjeskift(s){
  return escHtml(String(s ?? "")
    .replace(/\\n/g, "\n")   // ← gjer tekst "\n" om til ekte linjeskift
  ).replace(/\n/g, "<br>");
}

  function norm(s){
    return (s ?? "").toString().trim().toLowerCase();
  }

  function harKjeldeOppslag(forkorting){
    const f = (forkorting || "").trim();
    return !!(f && ORDLISTE[f]);
  }

  function lagKjeldeKnapp(forkorting){
    const f = (forkorting || "").trim();
    if (!f) return "";

    const oppslag = ORDLISTE[f];
    if (!oppslag) return `<span>${escHtml(f)}</span>`;

    return `<button class="kjeldeknapp" type="button"
      data-forkorting="${escHtml(f)}"
      data-tittel="${escHtml(oppslag.tittel || f)}"
      data-tekst="${escHtml(oppslag.tekst || "")}"
      data-url="${escHtml(oppslag.url || "")}"
    >${escHtml(f)}</button>`;
  }

  // Pen URL for klikk i lista (utan .html)
  function penUrl(fil){
    if (typeof fil !== "string") return fil;
    return fil.replace(/\.html$/i, "");
  }

  // Faktisk HTML-fil når me skal parse (pretty URLs: song/namen -> song/namen/index.html)
  function tilHtmlFil(fil){
    if (typeof fil !== "string") return fil;
    if (/\.html$/i.test(fil)) return fil;
    return `${fil}/index.html`;
  }

  // Hent kjelde frå songtekstfil (best-effort, med caching)
  async function hentKjeldeFråSongtekst(fil) {
    try {
      const url = `${tilHtmlFil(fil)}?v=${encodeURIComponent(VERSJON)}`;
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return "";

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const el1 = doc.querySelector('#kjelde[data-kjelde]');
      if (el1?.dataset?.kjelde) return el1.dataset.kjelde.trim();

      const el2 = doc.querySelector("#kjelde");
      if (el2) {
        const t = (el2.textContent || "").replace(/\s+/g, " ").trim();
        return t.replace(/^Kjelde:\s*/i, "").trim();
      }

      return "";
    } catch {
      return "";
    }
  }

  function lagSongElement(item){
    const tittel = item?.tittel || "Utan tittel";
    const fil = item?.fil || "#";
    const merknad = item?.merknad || "";
    const kjelde = (item?.kjelde || "").trim();
    const omr = (item?.tradisjonsomrade || "").trim();

    const bitar = [];
    if (omr) bitar.push(escHtml(omr));

    if (kjelde) {
      if (harKjeldeOppslag(kjelde)) bitar.push(`Kjelde: ${lagKjeldeKnapp(kjelde)}`);
      else bitar.push(`Kjelde: ${escHtml(kjelde)}`);
    }

    if (merknad) bitar.push(escHtml(merknad));

    const metaHtml = bitar.length ? bitar.join(" · ") : "";

    return `
      <li class="liste-rad">
        <a class="liste-lenkje" href="${escHtml(penUrl(fil))}">${escHtml(tittel)}</a>
        ${metaHtml ? `<div class="liste-meta">${metaHtml}</div>` : ""}
      </li>
    `;
  }

  function lagPdfElement(item){
    const tittel = item?.tittel || "Utan tittel";
    const fil = item?.fil || "#";
    const merknad = item?.merknad || "";
    const kjelde = (item?.kjelde || "").trim();

    const bitar = [];
    if (kjelde) {
      if (harKjeldeOppslag(kjelde)) bitar.push(`Kjelde: ${lagKjeldeKnapp(kjelde)}`);
      else bitar.push(`Kjelde: ${escHtml(kjelde)}`);
    }
    if (merknad) bitar.push(escHtml(merknad));

    const metaHtml = bitar.length ? bitar.join(" · ") : "";

    return `
      <li class="liste-rad">
        <a class="liste-lenkje" href="${escHtml(fil)}" target="_blank" rel="noopener noreferrer">${escHtml(tittel)}</a>
        ${metaHtml ? `<div class="liste-meta">${metaHtml}</div>` : ""}
      </li>
    `;
  }

  function renderListe(container, items, renderFn, statusEl, tomTekst){
    if (!items || !items.length){
      statusEl.textContent = tomTekst;
      container.innerHTML = "";
      return;
    }
    statusEl.textContent = `${items.length} oppføringar`;
    container.innerHTML = items.map(renderFn).join("");
  }

  function filtrer(items, q, felt){
    const query = norm(q);
    if (!query) return items;

    return items.filter(it => {
      const hay = felt.map(k => norm(it?.[k])).join(" ");
      return hay.includes(query);
    });
  }

  // --- Boble-popup (same opplevinga som på dansetabellen) ---
  let bobleEl = null;
  let sistAnker = null;

  function lukkBoble(){
    if (bobleEl) bobleEl.remove();
    bobleEl = null;
    sistAnker = null;
  }

  function opneBoble(ankerEl, forkorting, tittel, tekst, url){
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

  // --- Last og bygg innhald ---
  async function lastInnhald(){
    try{
      const res = await fetch(`/innhald/innhald.json?v=${encodeURIComponent(VERSJON)}`, { cache: "force-cache" });
      if (!res.ok) throw new Error(`Kunne ikkje hente innhald.json (HTTP ${res.status})`);
      const data = await res.json();

      const song = Array.isArray(data.songtekstar) ? data.songtekstar : [];
      const pdf  = Array.isArray(data.pdfar) ? data.pdfar : [];

      // Fyll inn kjelde for songar der det manglar (best-effort)
      await Promise.all(song.map(async (s) => {
        try{
          if (!s || !s.fil) return;
          const harKjelde = typeof s.kjelde === "string" && s.kjelde.trim().length > 0;
          if (harKjelde) return;

          const k = await hentKjeldeFråSongtekst(s.fil);
          if (k) s.kjelde = k;
        } catch {}
      }));

      renderListe(el.songListe, song, lagSongElement, el.songStatus, "Ingen songar enno.");
      renderListe(el.pdfListe, pdf, lagPdfElement, el.pdfStatus, "Ingen PDF-ar enno.");

      el.sokSong?.addEventListener("input", () => {
        const filtrert = filtrer(song, el.sokSong.value, ["tittel", "merknad", "kjelde", "fil"]);
        renderListe(el.songListe, filtrert, lagSongElement, el.songStatus, "Ingen treff.");
      });

      el.sokPdf?.addEventListener("input", () => {
        const filtrert = filtrer(pdf, el.sokPdf.value, ["tittel", "kjelde", "merknad", "fil"]);
        renderListe(el.pdfListe, filtrert, lagPdfElement, el.pdfStatus, "Ingen treff.");
      });

    } catch (e){
      console.error(e);
      el.songStatus.textContent = "Feil ved lasting av innhald.";
      el.pdfStatus.textContent = "Feil ved lasting av innhald.";
    }
  }

  lastInnhald();
})();