(() => {
  // Markdown-songar: rediger tekst.md i same mappe som index.html.
  //
  // Vers: tom linje mellom versa. Linjeskift inne i verset blir <br>.
  // Omkved: blokk der kvar linje startar med >
  // Mellomtittel: ## tekst (startar versnummereringa på nytt)
  // Merknad: :::merknad ... :::   eller :::merknad-inline ... :::
  // Kursiv: *tekst*    Lenkje: [tekst](url)
  const VERSJON = "1";
  const rotEl = document.getElementById("song-side");
  if (!rotEl) return;

  const YT_IKON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M21 12s0-3.2-.4-4.6c-.2-.8-.9-1.5-1.7-1.7C17.5 5.3 12 5.3 12 5.3s-5.5 0-6.9.4c-.8.2-1.5.9-1.7 1.7C3 8.8 3 12 3 12s0 3.2.4 4.6c.2.8.9 1.5 1.7 1.7 1.4.4 6.9.4 6.9.4s5.5 0 6.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.4.4-4.6.4-4.6Z" stroke="currentColor" stroke-width="2"/><path d="M10.5 9.5v5l5-2.5-5-2.5Z" fill="currentColor"/></svg>`;
  const SC_IKON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M7 14.5c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1s1 .4 1 1v2c0 .6-.4 1-1 1Z" fill="currentColor"/><path d="M10 14.5c-.6 0-1-.4-1-1V9.8c0-.6.4-1 1-1s1 .4 1 1v3.7c0 .6-.4 1-1 1Z" fill="currentColor"/><path d="M13 14.5c-.6 0-1-.4-1-1V8.2c0-.6.4-1 1-1s1 .4 1 1v5.3c0 .6-.4 1-1 1Z" fill="currentColor"/><path d="M16.5 14.5H15.5c-.6 0-1-.4-1-1V7.5c0-.6.4-1 1-1s1 .4 1 1v.1c.5-.4 1.1-.6 1.8-.6 1.8 0 3.2 1.4 3.2 3.2s-1.4 3.3-3.8 3.3Z" fill="currentColor"/></svg>`;

  function esc(s){
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function sann(v){
    const s = String(v ?? "").trim().toLowerCase();
    return s === "ja" || s === "true" || s === "1" || s === "yes";
  }

  function inlineMd(rå){
    const bits = [];
    const s = String(rå ?? "");
    const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    let i = 0;
    let m;
    while ((m = re.exec(s))) {
      if (m.index > i) bits.push(esc(s.slice(i, m.index)));
      if (m[1] != null) {
        bits.push(`<a href="${esc(m[2])}">${inlineMd(m[1])}</a>`);
      } else if (m[3] != null) {
        bits.push(`<strong>${inlineMd(m[3])}</strong>`);
      } else {
        bits.push(`<em>${inlineMd(m[4])}</em>`);
      }
      i = m.index + m[0].length;
    }
    if (i < s.length) bits.push(esc(s.slice(i)));
    return bits.join("");
  }

  function linjerTilHtml(tekst){
    return String(tekst)
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.replace(/[ \t]+$/, ""))
      .join("\n")
      .split("\n")
      .map((l) => inlineMd(l))
      .join("<br>\n");
  }

  function avsnitt(tekst){
    return String(tekst ?? "")
      .replace(/\r\n/g, "\n")
      .trim()
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  function avsnittHtml(tekst){
    return avsnitt(tekst).map((p) => `<p>${inlineMd(p.replace(/\n/g, " "))}</p>`).join("\n");
  }

  function stripSitat(linje){
    return linje.replace(/^>\s?/, "");
  }

  function erSitatBlokk(tekst){
    const linjer = tekst.split("\n").filter((l) => l.trim() !== "");
    return linjer.length > 0 && linjer.every((l) => l.startsWith(">"));
  }

  function lesYamlLite(yaml){
    const linjer = yaml.replace(/\r\n/g, "\n").split("\n");
    const meta = {};
    let i = 0;

    function blokkTekst(startInnrykk, råLinjer){
      const minInn = Math.min(
        ...råLinjer
          .filter((l) => l.trim() !== "")
          .map((l) => l.match(/^ */)[0].length)
      );
      const basis = Number.isFinite(minInn) ? minInn : startInnrykk + 2;
      return råLinjer.map((l) => (l.length >= basis ? l.slice(basis) : l.trimStart())).join("\n").replace(/\n+$/, "");
    }

    function lesObjekt(innrykk){
      const obj = {};
      while (i < linjer.length) {
        const rå = linjer[i];
        if (rå.trim() === "" || rå.trim().startsWith("#")) {
          i++;
          continue;
        }
        const denne = rå.match(/^ */)[0].length;
        if (denne < innrykk) break;
        if (denne > innrykk && innrykk > 0) break;

        const m = rå.trim().match(/^([^:#\s][^:]*)\s*:\s*(.*)$/);
        if (!m) {
          i++;
          continue;
        }
        i++;
        const nøkkel = m[1].trim();
        const rest = m[2];

        if (rest === "|" || rest === ">" || rest === "|-" || rest === ">-") {
          const start = i;
          const inn = [];
          while (i < linjer.length) {
            const l = linjer[i];
            if (l.trim() === "") {
              inn.push(l);
              i++;
              continue;
            }
            const innr = l.match(/^ */)[0].length;
            if (innr <= denne) break;
            inn.push(l);
            i++;
          }
          obj[nøkkel] = blokkTekst(denne, inn);
          if (start === i && inn.length === 0) obj[nøkkel] = "";
        } else if (rest === "") {
          // liste eller nest
          if (i < linjer.length && linjer[i].trim().startsWith("- ")) {
            obj[nøkkel] = lesListe(denne);
          } else {
            obj[nøkkel] = "";
          }
        } else {
          obj[nøkkel] = avsiter(rest);
        }
      }
      return obj;
    }

    function lesListe(forelderInnrykk){
      const lista = [];
      while (i < linjer.length) {
        const rå = linjer[i];
        if (rå.trim() === "" || rå.trim().startsWith("#")) {
          i++;
          continue;
        }
        const denne = rå.match(/^ */)[0].length;
        if (denne <= forelderInnrykk) break;
        const t = rå.trim();
        if (!t.startsWith("- ")) break;
        i++;
        const etter = t.slice(2);
        const feltMatch = etter.match(/^([^:#\s][^:]*)\s*:\s*(.*)$/);
        if (feltMatch) {
          const item = {};
          item[feltMatch[1].trim()] = avsiter(feltMatch[2]);
          // etterfølgjande nøkkel: verdi på same innrykk som innhaldet
          const barnInn = denne + 2;
          while (i < linjer.length) {
            const l = linjer[i];
            if (l.trim() === "") { i++; continue; }
            const innr = l.match(/^ */)[0].length;
            if (innr < barnInn) break;
            if (l.trim().startsWith("- ")) break;
            const km = l.trim().match(/^([^:#\s][^:]*)\s*:\s*(.*)$/);
            if (!km) { i++; continue; }
            i++;
            item[km[1].trim()] = avsiter(km[2]);
          }
          lista.push(item);
        } else {
          lista.push(avsiter(etter));
        }
      }
      return lista;
    }

    function avsiter(v){
      const s = String(v ?? "").trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
      }
      return s;
    }

    Object.assign(meta, lesObjekt(0));
    return meta;
  }

  function lesFrontMatter(rå){
    const t = String(rå ?? "").replace(/^\uFEFF/, "");
    const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) return { meta: {}, kropp: t };
    return { meta: lesYamlLite(m[1]), kropp: m[2] };
  }

  function kroppTilHtml(kropp){
    const tekst = String(kropp ?? "").replace(/\r\n/g, "\n").replace(/^\n+/, "").replace(/\n+$/, "");
    const bitar = [];
    let i = 0;

    while (i < tekst.length) {
      if (tekst.startsWith(":::", i)) {
        const hovud = tekst.slice(i).match(/^:::([a-z0-9-]+)[ \t]*\n/);
        if (hovud) {
          const namn = hovud[1];
          const start = i + hovud[0].length;
          const slutt = tekst.indexOf("\n:::", start);
          const innhald = slutt === -1 ? tekst.slice(start) : tekst.slice(start, slutt);
          bitar.push(`<p class="${esc(namn)}">${linjerTilHtml(innhald.trim())}</p>`);
          i = slutt === -1 ? tekst.length : slutt + "\n:::".length;
          while (i < tekst.length && tekst[i] !== "\n") i++;
          if (tekst[i] === "\n") i++;
          while (tekst[i] === "\n") i++;
          continue;
        }
      }

      let slutt = tekst.indexOf("\n\n", i);
      if (slutt === -1) slutt = tekst.length;
      const blokk = tekst.slice(i, slutt).trim();
      i = slutt;
      while (tekst[i] === "\n") i++;
      if (!blokk) continue;

      const mellomtittel = blokk.match(/^##[ \t]+([^\n]+)$/);
      if (mellomtittel) {
        bitar.push(`<h2>${inlineMd(mellomtittel[1])}</h2>`);
      } else if (erSitatBlokk(blokk)) {
        const innhald = blokk.split("\n").map(stripSitat).join("\n").trim();
        bitar.push(`<p class="omkved">${linjerTilHtml(innhald)}</p>`);
      } else {
        bitar.push(`<p>${linjerTilHtml(blokk)}</p>`);
      }
    }

    return bitar.join("\n\n");
  }

  function ikonForUrl(url){
    const u = String(url ?? "").toLowerCase();
    if (u.includes("youtu")) return YT_IKON;
    if (u.includes("soundcloud")) return SC_IKON;
    return "";
  }

  function lenkjerHtml(lenkjer){
    if (!Array.isArray(lenkjer) || !lenkjer.length) return "";
    const knappar = lenkjer.map((l) => {
      const namn = l.namn || l.tittel || "Lenkje";
      const url = l.url || l.href || "";
      const ikon = ikonForUrl(url);
      return `<a class="lenkeknapp" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
        ${ikon ? `<span class="lenkje-ikon">${ikon}</span>` : ""}
        <span class="lenkje-tekst">${esc(namn)}</span>
      </a>`;
    }).join("\n");
    return `<section class="songlenkjer">\n${knappar}\n</section>`;
  }

  function omVisaHtml(meta){
    const tekst = meta.om_visa || meta.omvisa || "";
    if (!String(tekst).trim()) return "";
    const data = avsnitt(tekst).join(" ");
    return `<section class="om-visa" id="om-visa" data-om-visa="${esc(data)}" aria-label="Om visa">
      <h2>Om visa</h2>
      ${avsnittHtml(tekst)}
    </section>`;
  }

  function songboksHtml(meta){
    const rader = [
      ["Tekst", meta.tekst],
      ["Melodi", meta.melodi],
      ["Kjelde", meta.kjelde]
    ].filter(([, v]) => String(v ?? "").trim());
    if (!rader.length) return "";
    const kjelde = String(meta.kjelde ?? "").trim();
    const dl = rader.map(([dt, dd]) =>
      `<div><dt>${esc(dt)}</dt><dd>${inlineMd(dd)}</dd></div>`
    ).join("\n        ");
    return `<section class="songboks" id="kjelde" data-kjelde="${esc(kjelde)}" aria-label="Info og kjelde">
      <dl class="songinfo">
        ${dl}
      </dl>
    </section>`;
  }

  function tilbakeHtml(meta){
    const href = meta.tilbake || "";
    if (!String(href).trim()) return "";
    const merkelapp = meta.tilbake_tekst || "← Tilbake til Bilbokvædi";
    return `<p class="muted" style="margin-top: 14px;">
  <a href="${esc(href)}">${esc(merkelapp)}</a>
</p>`;
  }

  function songMappe(){
    const u = new URL(window.location.href);
    let p = u.pathname;
    if (p.endsWith("index.html")) p = p.slice(0, -"index.html".length);
    else if (!p.endsWith("/")) p += "/";
    return new URL(p, u.origin);
  }

  function visFeil(melding){
    rotEl.innerHTML = `<p class="muted">${esc(melding)}</p>`;
  }

  async function last(){
    const fil = rotEl.getAttribute("data-songtekst") || "tekst.md";
    const url = new URL(fil, songMappe());
    url.searchParams.set("v", VERSJON);
    let rå;
    try {
      const res = await fetch(url.href, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      rå = await res.text();
    } catch {
      visFeil("Kunne ikkje laste songteksten.");
      return;
    }

    const { meta, kropp } = lesFrontMatter(rå);
    const tittel = meta.tittel || "";
    const sidetittel = meta.sidetittel || tittel;
    if (sidetittel) document.title = sidetittel;

    const breidd = meta.breidd || "30rem";
    const nummer = sann(meta.nummer);
    const klassar = nummer ? "songtekst nummer" : "songtekst";

    rotEl.innerHTML = `
    <article class="${klassar}" style="--songtekst-breidd: ${esc(breidd)}">
      <h1>${esc(tittel)}</h1>
      ${kroppTilHtml(kropp)}
    </article>
    ${lenkjerHtml(meta.lenkjer)}
    ${omVisaHtml(meta)}
    ${songboksHtml(meta)}
    ${tilbakeHtml(meta)}
    `;
  }

  last();
})();
