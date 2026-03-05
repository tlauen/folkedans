# folkedans

Statisk nettside for `folkedans.net` med songar, kjelder, innhaldssider og enkel redigeringsstøtte via Tiptap.

## Kva nettsida er

`folkedans` er hovudrepoet for den publiserte folkedans-sida. Innhaldet er handtert som statiske HTML-filer, med eigne undersider for songar og temaseksjonar.

## Teknologi

- Statisk HTML/CSS/JavaScript
- Ingen byggesteg nødvendig for visning
- Publisering via GitHub Pages (custom domene)

## Viktige mapper/filer

- `index.html`: framside
- `song/`: songsider
- `stilar/`: CSS
- `skript/`: JavaScript
- `delar/`: gjenbrukbare HTML-delar
- `innhald/`, `kjelder/`, `om/`: innhaldssider
- `tiptap-editor.html`: editor for å produsere HTML-innhald
- `CNAME`: domeneoppsett for GitHub Pages

## Lokal utvikling

Køyr ein enkel lokal webserver frå repo-rota:

```bash
python3 -m http.server 8000
```

Opne:

- `http://localhost:8000/`
- `http://localhost:8000/tiptap-editor.html`

## Publisering

Repoet er meint for deploy på GitHub Pages. Ved custom domene må `CNAME` peike til riktig host.

## Lisens

Sjå [LICENSE](LICENSE).
