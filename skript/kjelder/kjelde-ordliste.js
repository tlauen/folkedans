// Ordliste: forkorting -> (tittel, tekst, url)
// Brukt for bobla når ein trykkjer på kjelde-forkortinga.

window.KJELDE_ORDLISTE = {
  "ANTUN": {
    tittel: "Vestlandsspringdans",
    tekst: "Antun, Markvard (1967)",
    url: "https://www.nb.no/items/ef698f1e3ce61df3c37e2955cf76bbe7",
    nb: "https://www.nb.no/items/ef698f1e3ce61df3c37e2955cf76bbe7",
    start: ""
  },
  "BARK": {
    tittel: "Balladearkivet",
    tekst: "Universitetet i Oslo, Institutt for kulturstudier",
    url: "https://www.dokpro.uio.no/ballader/lister/arkiv_gml.html",
    nb: "",
    start: ""
  },
  "DDL": {
    tittel: "Danse, danse, lett ut på foten : folkedansar og songdansar",
    tekst: "Bakka, Egil (1970)",
    url: "https://www.nb.no/items/7e9ac65479a3545bfcc06630900c8c9a",
    nb: "https://www.nb.no/items/7e9ac65479a3545bfcc06630900c8c9a",
    start: 2
  },
  "DDDM": {
    tittel: "Danse, danse dokka mi : songdansar - turdansar - ringleikar - turleikar : for born og ungdom",
    tekst: "Semb, Klara (1958)",
    url: "https://www.nb.no/items/34ae9cabf321fe4a06ee1820f506bd92",
    nb: "https://www.nb.no/items/34ae9cabf321fe4a06ee1820f506bd92",
    start: 2
  },
  "DMD": {
    tittel: "Danse mi dokke mæ du æ ung : 10 songdansar",
    tekst: "Stallvik, Tor (1982)",
    url: "pdf/Dansemidokke-Tor-Stallvik.pdf",
    nb: "",
    start: ""
  },
  "DT:F": {
    tittel: "Dansetradisjonar frå Finnmark",
    tekst: "Bakka, Egil; Seland, Brit; Vårdal, Dag (1986)",
    url: "https://www.nb.no/items/c786de2a23cb9f5c422f92ff31c6a08e",
    nb: "https://www.nb.no/items/c786de2a23cb9f5c422f92ff31c6a08e",
    start: 2
  },
  "DT:NT": {
    tittel: "Dansetradisjonar frå Nordland og Troms",
    tekst: "Bakka, Egil; Vårdal, Dag; Lunde, Tormod (1984)",
    url: "https://www.nb.no/items/e0428dd3c3e2605d31ef6b85fa7bfa60",
    nb: "https://www.nb.no/items/e0428dd3c3e2605d31ef6b85fa7bfa60",
    start: 6
  },
  "DT:VA": {
    tittel: "Dansetradisjonar frå Vest-Agder",
    tekst: "Bakka, Egil; Egeland, Ånon; Vårdal, Dag; Seland, Brit (1990)",
    url: "https://www.nb.no/items/URN:NBN:no-nb_digibok_2015062508077",
    nb: "https://www.nb.no/items/URN:NBN:no-nb_digibok_2015062508077",
    start: 2
  },
  "FD.com": {
    tittel: "Folkedans.com",
    tekst: "Nettstad kuratert av Vebjørn Bakken (d. 2024)",
    url: "https://folkedans.com",
    nb: "",
    start: ""
  },
  "FD.net": {
    tittel: "Folkedans.net",
    tekst: "Nettstad kuratert av Torbjørn Bergwitz Lauen",
    url: "https://folkedans.net",
    nb: "",
    start: ""
  },
  "Folkepedia": {
    tittel: "Folkepedia.no",
    tekst: "Formidlingsverktøy for folkedans utvikla av Noregs Ungdomslag.",
    url: "https://folkepedia.no",
    nb: "",
    start: ""
  },
  "GIF": {
    tittel: "Grunnbok i folkedans",
    tekst: "Bakka, Egil; Wikan, Arne (1996)",
    url: "https://www.nb.no/items/d17cd9d064011fb25db86b18f184035d",
    nb: "https://www.nb.no/items/d17cd9d064011fb25db86b18f184035d",
    start: 0
  },
  "HID": {
    tittel: "Haralds illustrerte danseviser",
    tekst: "Aadnevik, Harald (2002)",
    url: "https://folkedans.com",
    nb: "",
    start: ""
  },
  "HORD": {
    tittel: "Her e' me grannar og 11 andre danseviser frå Hordaland",
    tekst: "Bondeungdomslaget i Bergen (1995)",
    url: "",
    nb: "",
    start: ""
  },
  "KARI": {
    tittel: "Kari går i ringen : Songleikar, selskapsleikar, rim og regler frå Inn-Trøndelag",
    tekst: "Bjerkem, Berit Eldbjørg (1990)",
    url: "https://www.nb.no/maken/item/URN:NBN:no-nb_digibok_2018050848081",
    nb: "https://www.nb.no/maken/item/URN:NBN:no-nb_digibok_2018050848081",
    start: 0
  },
  "ND": {
    tittel: "Norske dansevisur",
    tekst: "Garborg, Hulda (1913)",
    url: "https://www.nb.no/items/5b4c39b69c7804615452aac4f29b0052",
    nb: "https://www.nb.no/items/5b4c39b69c7804615452aac4f29b0052",
    start: 4
  },
  "NF:S": {
    tittel: "Norske folkedansar: Songdansar",
    tekst: "Semb, Klara (1991)",
    url: "https://songdans.no",
    // Nb.no-lenke til boka. Brukast av lenker i tabellen "Rettleiing"
    // (page= blir rekna ut frå sidetal + start).
    nb: "https://www.nb.no/items/URN:NBN:no-nb_digibok_2007080604038",
    // Forskyving i sidetal før ein tek "oddetalsside" (page-param hos nb.no).
    // Form: pageParam = (sidetal + start) gjer om til odde tal.
    start: 0
  },
  "NF:T": {
    tittel: "Norske folkedansar: Songdansar",
    tekst: "Semb, Klara (1985)",
    url: "https://turdans.no",
    nb: "https://www.nb.no/items/URN:NBN:no-nb_digibok_2007111904027",
    start: 0
  },
  "NORD": {
    tittel: "No er katten døde – 40 sangdanser fra Nord-Norge",
    tekst: "Troms Ungdomsfylking (2006)",
    url: "",
    nb: "",
    start: ""
  },
  "NOBA": {
    tittel: "Norske Balladar",
    tekst: "Nasjonalbiblioteket",
    url: "https://www.nb.no/forskning/norske-ballader/",
    nb: "",
    start: ""
  },
  "PRØYSEN": {
    tittel: "D'er æiller fali for den som dæinse : Songdans til viser av Alf Prøysen",
    tekst: "Tuko, Ingrid Maurstad; Slapgård, Nils Steinar (2009)",
    url: "",
    nb: "",
    start: ""
  },
  "TRØND.": {
    tittel: "Trønderviser",
    tekst: "Larsen, Geir Egil (1984)",
    url: "",
    nb: "",
    start: ""
  },
  "ØSTF.": {
    tittel: "Songdans frå Østfold",
    tekst: "(2020)",
    url: "pdf/Songdans-fra-Ostfold.pdf",
    nb: "",
    start: ""
  }
};
