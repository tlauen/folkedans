// skript/kjelder.js
(() => {
  const ORDLISTE = window.KJELDE_ORDLISTE || {};

  const el = {
    sok: document.getElementById("sokKjelde"),
    sorter: document.getElementById("sorterKjelder"),
    status: document.getElementById("kjeldeStatus"),
    liste: document.getElementById("kjeldeListe")
  };

  function escHtml(s){
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function norm(s){
    return (s ?? "").toString().trim().toLowerCase();
  }

  function parseÅr(tekst){
    const m = (tekst || "").match(/\((\d{4})\)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  // Heuristikk: alt før første parentes blir "forfattar(ar)"
  function parseForfattar(tekst){
    const t = (tekst || "").trim();
    if (!t) return "";
    return t.split("(")[0].trim();
  }

  function byggPost(forkorting, oppslag){
    const tittel = (oppslag?.tittel ?? "").toString().trim();
    const tekst  = (oppslag?.tekst  ?? "").toString().trim();
    const url    = (oppslag?.url    ?? "").toString().trim();

    const år = parseÅr(tekst);
    const forfattar = parseForfattar(tekst);

    return {
      forkorting,
      tittel: tittel || forkorting,
      tekst,
      url,
      år,
      forfattar
    };
  }

  const alle = Object.entries(ORDLISTE)
    .map(([forkorting, oppslag]) => byggPost(forkorting, oppslag));

  function sorterListe(sortType, liste){
    const arr = [...liste];

    if (sortType === "år") {
      // år stigande, men utan år alltid nedst (så tittel)
      arr.sort((a, b) => {
        const A = a.år, B = b.år;
        if (A == null && B == null) return a.tittel.localeCompare(b.tittel, "nb", { sensitivity: "base" });
        if (A == null) return 1;
        if (B == null) return -1;
        if (A !== B) return A - B;
        return a.tittel.localeCompare(b.tittel, "nb", { sensitivity: "base" });
      });
      return arr;
    }

    if (sortType === "forfattar") {
      // forfattar A-Å, tomt nedst, så tittel
      arr.sort((a, b) => {
        const A = (a.forfattar || "").trim();
        const B = (b.forfattar || "").trim();
        const Atom = !A;
        const Btom = !B;

        if (Atom && Btom) return a.tittel.localeCompare(b.tittel, "nb", { sensitivity: "base" });
        if (Atom) return 1;
        if (Btom) return -1;

        const c = A.localeCompare(B, "nb", { sensitivity: "base" });
        if (c !== 0) return c;

        return a.tittel.localeCompare(b.tittel, "nb", { sensitivity: "base" });
      });
      return arr;
    }

    // Standard: alfabetisk etter tittel, så forkorting
    arr.sort((a, b) => {
      const c = a.tittel.localeCompare(b.tittel, "nb", { sensitivity: "base" });
      if (c !== 0) return c;
      return a.forkorting.localeCompare(b.forkorting, "nb", { sensitivity: "base" });
    });

    return arr;
  }

  function filtrerListe(q, liste){
    const query = norm(q);
    if (!query) return liste;

    return liste.filter(k => {
      const hay = [
        k.forkorting,
        k.tittel,
        k.tekst,
        k.forfattar,
        k.år ?? "",
        k.url
      ].map(norm).join(" ");
      return hay.includes(query);
    });
  }

  function render(liste){
    if (!liste.length) {
      el.liste.innerHTML = "";
      el.status.textContent = "Ingen treff.";
      return;
    }

    el.liste.innerHTML = liste.map(k => {
      const urlbit = k.url
        ? `<div class="liste-meta"><a href="${escHtml(k.url)}" target="_blank" rel="noopener noreferrer">Opne lenkje</a></div>`
        : "";

      return `
        <article class="kjeldekort">
          <div class="kjeldekort-topp">
            <div class="kjeldekode">${escHtml(k.forkorting)}</div>
            <div class="kjeldetittel">${escHtml(k.tittel)}</div>
          </div>
          ${k.tekst ? `<div class="liste-meta">${escHtml(k.tekst)}</div>` : ""}
          ${urlbit}
        </article>
      `;
    }).join("");

    el.status.textContent = `${liste.length} kjelder`;
  }

  function oppdater(){
    const sortType = el.sorter?.value || "tittel";
    const q = el.sok?.value || "";

    const filtrert = filtrerListe(q, alle);
    const sortert = sorterListe(sortType, filtrert);

    render(sortert);
  }

  if (!alle.length) {
    el.status.innerHTML = `
      <strong>Ingen kjelder lasta.</strong><br>
      Sjekk at <code>skript/kjelder/kjelde-ordliste.js</code> blir lasta (Network → 200, ikkje 404).
    `;
    return;
  }

  el.sok?.addEventListener("input", oppdater);
  el.sorter?.addEventListener("change", oppdater);

  oppdater();
})();
