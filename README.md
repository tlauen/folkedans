# folkedans

Statisk nettside for `folkedans.net` med songar, innhaldssider og eit interaktivt oppslag (framsida).

Denne README-en er skriven for at nokon utanfor prosjektet skal forstå korleis nettsida heng saman, kvar innhaldet ligg, og korleis ein kan oppdatere det.

## Kva nettsida består av

1. **Statiske HTML-sider** (ingen byggesteg)
2. **Interaktiv framside** som fyller inn tabellen dynamisk frå CSV-kjelder (Google Sheets)
3. **Ordliste/metadata** for forkortingar som visast som knappar/bobler i tabellen

## Kva som driv framsida (`index.html`)

`/index.html` inneheld ikkje selve innhaldet i tabellen. I staden:

- Faner og tabell-liste startar i JS (`skript/app.js`)
- Tabellrader blir henta frå **CSV-filer** definert i `skript/kjelder/kjelde-lister.js`
- Forkortingar/“kjelde-koder” blir slått opp i `skript/kjelder/kjelde-ordliste.js`

Kort sagt:

- `window.KJELDER` (i `skript/kjelder/kjelde-lister.js`) definerer kva “kategoriar” fanene viser, og kvar CSV-en for kvar kategori ligg
- `app.js` lastar CSV (med lokal `localStorage`-cache for fart), parse-r den med PapaParse, og byggjer ein DataTables-tabell
- “Kjelder”/lenker og “Rettleiing”-lenker blir genererte basert på ordlista (ordliste-mappinga)

## Kvar innhaldet ligg

- `index.html`: framside (tabell + faner)
- `song/`: kvar song har si eiga mappe (t.d. `song/bilbokvad-ii/index.html`)
- `innhald/`, `kjelder/`, `om/`: statiske innhaldssider
- `delar/`: gjenbrukbare HTML-inkluderingar (topp/kolofon)
- `skript/`:
  - `app.js`: byggjer tabellen og eigne lenkeknappar/bobler
  - `inkluder.js`: lastar inn HTML-delar og set “active side”-markering
  - `kjelder/`:
    - `kjelde-lister.js`: lista over CSV-kjelder (faner/kategoriar)
    - `kjelde-ordliste.js`: ordliste som gjer at forkortingar blir til tittel/tekst/url/nb-link

## Slik oppdaterer ein innhald (typisk arbeidsflyt)

1. **Legg til/endre rader (songdans-datatabellen)**
   - Oppdater Google Sheets-arket som ligg bak CSV-URL-ane i `skript/kjelder/kjelde-lister.js`
   - Sørg for at CSV-formatet har kolonnenamn som `app.js` forventar (t.d. `Namn`, `Kategori`, `Kjelde`, `Sidetal`, `Rettleiing`, `Vers`, `Brigde`).

2. **Endre metadata/lookup for forkortingar**
   - Oppdater `skript/kjelder/kjelde-ordliste.js` for å endre mappingar som blir brukt til å lage lenkeknappar/bobler og nb.no-lenker.

3. **Legg til ny kategori/fane**
   - Legg til ei ny oppføring i `window.KJELDER` i `skript/kjelder/kjelde-lister.js`
   - Set `key` (som styrer URL-hash), `namn` (visningsnamn) og `csv` (Google Sheets CSV-lenke)

4. **Oppdatere individuelle songsider**
   - Endre relevant `song/<slug>/index.html` (statiske sider)

## Lokal utvikling

Fordi dette er statisk, kan du køyre ein enkel webserver frå repo-rota:

```bash
python3 -m http.server 8000
```

Opne:

- `http://localhost:8000/`
- `http://localhost:8000/tiptap-editor.html` (dersom du bruker editoren)

## Publisering

Repoet er sett opp for **GitHub Pages**.

- Når du pushar til riktig branch, blir nettsida publisert
- Custom domene blir styrt av `CNAME`

## Lisens

Sjå [LICENSE](LICENSE).
