# SMU Kalkulation v0.3 — antagelser, uafklarede regler og fravalg

> **Historisk dokument (prototype v0.1–v0.3.1).** Dette er **ikke** platformsandhed.
> Produktbeslutningerne er truffet efter prototypen og står i `smu-os-v2/PLANNING.md`
> (TR-053..TR-062, 14. sep. 2026). Hvor noterne herunder er i konflikt med dem, gælder
> Truth Reset. Kilder, aflæsninger og uafklarede regler er stadig gyldige som reference.
>
> **Siden prototypen (første implementeringstrin):** filstier er ændret —
> `src/beregning.ts` → `src/domain/beregning.ts`, `regler.ts` → `domain/konfiguration.ts`,
> `typer.ts` → `domain/typer.ts`, `proceskatalog.ts` → `domain/processer.ts`, og
> `materialekatalog.ts`, `linjefabrik.ts`, `demodata.ts` → `src/demo/`. Prismotorens
> formler er uændrede. Se `README.md` for nuværende status.

Dokumentet var en ærlig liste over hvad der byggede på verificerede kilder, hvad der
stadig var uafklaret, og hvad der bevidst ikke var bygget.

---

## 0. Nyt i v0.3 — serier, standardbredde og farver

Prismotoren er **uændret** fra v0.2 (`src/beregning.ts` er ikke rørt) og matcher stadig
Excel 13/13. v0.3 er en ren UX-iteration på materialedelen.

### Standardbredder — verificeret

| Serie | Standardbredde | Kilde |
| --- | --- | --- |
| Oracal 751 | 1260 mm | Excel C8–C10 · Source-vare "Signmeups aktuelle driftsvare: 1260 mm" |
| Orajet 3551 | 1370 mm | Excel C56 · Source-varer 1050 og 1370 (Scandraft) |
| OraGuard 215G | 1370 mm | Excel C71 · Source-vare 1370 gloss |
| Avery Supreme | 1520 mm | Excel C20 |

Andre bredder (fx 3551 i 1520/1600) ligger som alternative varer og vælges kun via
`Mere → Skift bredde`. En bredde er altid en konkret katalogvare med egen pris.

### Farver — kun kendte koder

| Kode | Dansk etiket | ORAFOL-navn | Prisgruppe | Kilde |
| --- | --- | --- | --- | --- |
| 010 | hvid | White | Sort/hvid | Source `20260821100001_source_751c_farvenavne.sql` |
| 070 | sort | Black | Sort/hvid | Source (samme) |
| 050 | mørkeblå | Dark blue | Farver | Source (samme) |
| 063 | lysegrøn | Lime-tree green | Farver | Source (samme) |
| 932 | grafit metallic | Graphite metallic | Metallic | Source (samme) |
| CB152 | blå | Blue | Alle farver | Anders' Citan-case (Avery) |

Tre forhold er vigtige og **ikke løst** af prototypen:

1. **Source har ingen danske farvenavne.** Kun producentens officielle navn. De danske
   etiketter er visningstekst i prototypen. "lysegrøn" for *Lime-tree green* er en løs
   oversættelse.
2. **Prisgruppe ≠ Source-farvegruppe.** Excels prisgrupper (Sort/hvid, Farver, Metallic)
   er kommercielle. Source dokumenterer farvegruppe teknisk og kun hvor ORAFOL selv gør
   det: 010/070 = `sort_hvid`, 932 = `metallic`. **050 og 063 står som `ukendt` i Source.**
   At de kalkuleres i prisgruppen "Farver" er Excels logik, ikke Source-data.
3. **Farver ejes af SMU Color** (DOMAIN_MODEL: "Farvekatalog … SMU Color"), mens
   materialeidentitet ejes af SMU Source. Farvevalget i prototypen efterligner et
   fremtidigt opslag på tværs af de to.

Serien hedder `Oracal 751` i Excel og prototypen, men `ORACAL 751C` i Source.

### Komponenter ved skift af prisgruppe eller bredde

Foreslåede komponenter genberegnes til den nye vare (fx 215G i den nye bredde), men
deres til/fra-status bevares. Har brugeren selv skiftet en komponent i en kategori,
foreslås der ikke en ny i samme kategori — ellers kunne applikationsfolie komme med to
gange.

### v0.3.1 — roligere materialeliste

- **Grundlag** er flyttet ud af listen og ind under `Mere`. I listen vises det kun ved
  forbrugsfeltet: `est.` ved estimat, `mangler` når der ikke er taget stilling.
  "Fra tegnestue" og "Manuelt" giver ingen markering.
- **Komponenter** er egne, indrykkede linjer under hovedmaterialet — ikke chips. De har
  intet eget forbrugsfelt: forbruget følger hovedmaterialets kalkulerede forbrug, og ink
  omregnes til m² med banebredden. Hovedlinjens kost er nu kun hovedmaterialet; summen af
  de synlige linjer er præcis den materialekost, prismotoren regner.
- **Datamodellen er uændret.** Komponenterne ligger fortsat på hovedlinjen
  (`Materialelinje.komponenter`), så relationen og dobbeltoptællings-beskyttelsen er
  den samme som i v0.3. Prismotoren (`beregning.ts`, `regler.ts`) er ikke rørt.
- **Materialevælgeren** har fået et valgfrit sidste trin med nettoforbrug.

---

## 1. Hvad der nu er verificeret mod kilder

Prismotoren og katalogerne er ikke længere antagelser. De er aflæst fra
`SMU Kalkulation Master.xlsm` (OneDrive, 3. juli 2026) — se
[`docs/EXCEL_SAMMENLIGNING.md`](docs/EXCEL_SAMMENLIGNING.md) for formler og talsammenligning.

| Emne | Værdi | Kilde |
| --- | --- | --- |
| Standard timekost | **275 kr** | Excel K103–K112 (Skærestue, Print, Fræs, Vask, Montering, Kørsel) |
| Lay-out | 370 kr/t | Excel G98 |
| Projektering | 600 kr/t | Excel G99 |
| Overarbejde | 412,50 / 481,25 kr/t | Excel G110/G111 (`montering × 1,5` / `× 1,75`) |
| DG timer | 50 % (min. 40) | Excel C122 + etiket B122 |
| DG varer | 40 % (min. 30) | Excel C126 + etiket B126 |
| DG presenning | 25 % | Excel C129 |
| Emballagetillæg | 2 % af materialekost, før DG, i kostprisen | Excel K125 + K126 + K134 |
| Fast opstart/fakturering | 148 kr, i kostgrundlaget, ingen avance | Excel K119 → K134 |
| Energitillæg | 10 % af `(kostpris + avance)` | Excel K136 |
| Materialepriser og bredder | alle | Excel B3–K95 |
| Ink-omregning | `pris pr. m² × banebredde i meter` | Excel I49 = `I56+I71+(G90*1,37)` |

**De tidligere 240 kr/t er droppet.** Den sats stammer fra `prisbibliotek` i smu-os-v2
og er ældre end Excel. Excel er den aktuelle driftsreference.

---

## 2. Stadig uafklaret

### 2.1 Dækningsgrad på eksternt arbejde — Excel er selv i konflikt

Arket modsiger sig selv i samme række:

- **etiketten** B132 siger `Avance eksterne (Normalt 20% min. 15%)`
- **inputcellen** C132 står på `30`

Prototypen regner med **30**, fordi det er den værdi arket faktisk bruger, og markerer
den som uafklaret i UI (mærkat på sektionen, mærkat i prisopsamlingen, advarsel i
dækningsgrad-panelet). Det er en placeholder, ikke en beslutning. Konflikten kan ikke
løses fra arket — den skal afgøres.

### 2.2 Procesnavne der ikke findes i Excel

Tre navne fra opgavebeskrivelsen findes ikke som selvstændige timeposter i arket:

| Ønsket | Findes i Excel | Håndtering i v0.2 |
| --- | --- | --- |
| `Laminering` | nej | Ligger under **Print** (275 kr/t), noteret på processen |
| `Montage` | nej — posten hedder **Montering** | `Montering` bruges; `Montage:` er kun en sektionsoverskrift i arket |
| `Wrap` | nej | Oprettet som fri linje i Citan-demoen på standardsatsen 275 kr/t |

`Montering` stemmer i øvrigt med `prisbibliotek` i smu-os-v2 — de to kilder er enige.
Jeg har ikke opfundet nye timeposter.

### 2.3 Manuelt fastsat salgspris findes ikke i Excel-modellen

Excel har ingen "fast salgspris"-post. Prototypen lægger den oven på den beregnede
salgspris, efter energitillægget. Det er et valg, ikke en aflæsning, og det er markeret
i prisopsamlingen som *uden for Excel-modellen*.

### 2.4 Poster uden pris i prisbiblioteket

Facadebogstaver (18.400 kr), lift (2.200 kr/dag) og monteringsbeslag er ikke i Excel og
er demoværdier. Ibond-plader og Vikuprop-kanalplader **er** i Excel (160 / 225 kr).

### 2.5 Buffer-reglen

15 % + oprunding til 0,5 lbm gælder **kun** rullematerialer. Plader, styksvarer og
indkøbte komponenter får 0 %. Reglen er knyttet til materialets form via katalogvalget,
ikke til kalkulationen som helhed. Selve de 15 % er stadig praksis, ikke noget arket
dokumenterer — Excel har ingen bufferkolonne.

---

## 3. Produktbeslutninger truffet i v0.2

**Prisgruppe kan alene være prisgrundlag.** En linje må stå som
`Oracal 751 – alle flader · Farver · 1260 mm` uden farvekode. Farvekoden er et valgfrit
felt i linjedetaljer og er produktionsinformation, ikke prisgrundlag. Det afspejler
arket, hvor priserne netop er sat pr. prisgruppe (Sort/hvid, Farver, Metallic).

**Kostpris er låst.** Den kommer fra materialevalget og kan ikke redigeres i
normalvisning. Override kræver en eksplicit handling i linjedetaljer, viser en advarsel
om at ændringen kun gælder denne kalkulation og at stamdata ikke ændres, viser den
oprindelige pris, og markerer linjen med `kostpris overstyret` bagefter.

**DG flyttet fra linje til kategori.** I v0.1 havde hver linje sin egen DG. Excel regner
pr. kategori, og linje-DG kunne derfor ikke matche arket. DG-panelet er foldet sammen
som standard.

**"Realiseret DG" er omdøbt** til *Forventet DG ved valgt salgspris*. Vi har ingen
faktiske omkostninger. Egentlig realiseret DG kræver faktisk tid fra SMU Tid, faktisk
materialeforbrug, faktisk faktureret pris og øvrige faktiske omkostninger.

**Serie er skjult indtil den bruges.** Ved 1 enhed vises kun en `Slå serie til`-knap, og
gentagelsesvalget ligger i linjedetaljer.

**Grænsen for automatik er skarp.** JA til sikre materialeafhængigheder (laminat, ink,
applikationsfolie). NEJ til automatisk montagetid, skærestuetid og risikobuffer. Ingen
tid udfyldes nogensinde ud fra et materialevalg.

---

## 4. Bevidst ikke bygget

Database, Supabase, auth, RLS, persistens, Source-integration, CorelDraw-integration,
SMU Tid-integration, tilbudsgenerator, versionslåsning, produktionsdeploy, avanceret
reparationsmotor, AI-estimering og nesting.

Kartotek, kopiér tidligere, favoritter, tegningsvisning og CorelDraw-import står som
deaktiverede knapper i topbjælken, så retningen er synlig.

Der var ingen tests i prototypen ud over Excel-sammenligningen i `docs/`.

*Siden:* login via SMU Hub, AuthContext, platform-nav og Vitest-tests er tilføjet i første
implementeringstrin. Database, RLS, persistens og Source-integration er fortsat ikke bygget.

---

## 5. Platformkonsistens

Demo-data følger platformens eksisterende konventioner — verificeret mod smu-os-v2:

| Felt | Konvention | Kilde |
| --- | --- | --- |
| SMU-nummer | `SMU-0187` (`SMU-` + 4 cifre) | `generer_smu_nummer()`, `src/lib/sagsmappe.ts` |
| Tegningsnummer | `10917` (heltal, sekvens fra 10900) | `tegninger.hoved_nummer` |
| Løsningstype | `Folie + print kombi`, `Pladeløsning` | `losningstyper` (12 rækker) |
| Enheder | `lbm`, `m²`, `stk`, `liter` | `prisbibliotek.enhed`, `source_varer_basis_enhed_check`, Excel kolonne E |
| Leverandører | Signcom, Scandraft, Vink, ProFlex, Veidec, Transotape, Vikiallo | Excel kolonne D |
| Producent ≠ leverandør | ORAFOL fremstiller; Signcom/Scandraft forhandler | `source_pakke_a_schema.sql:115` |
| Kunder | realistiske danske firmanavne | `opret_testdata_kunder_brands.sql` |

Katalogets `producent`-felt er holdt adskilt fra `leverandoer` netop for ikke at gentage
den sammenblanding, platformen har dokumenteret.

---

## 6. Forholdet til SMU OS' eksisterende kalkulation

> **Afgjort siden:** SMU Kalkulation er selvstændig ejer af kalkulationsdomænet (TR-053);
> OS ejer Sag, Løsning og tilbud, og en Løsning har 1..n kalkulationer (TR-054, TR-055).
> Den eksisterende OS-kalkulation slettes ikke (TR-061). Punkt 1 herunder er derfor
> historik; de øvrige er fortsat relevante observationer.

SMU OS har allerede kalkulation i drift (`kalkulationsskabeloner` → `-sektioner` →
`-linjer`, `Losning.tsx`, `prisbibliotek`, version-låsning via DB-trigger). Prototypen
er bygget ved siden af og rører den ikke, men retningerne adskiller sig:

1. **Skabelonmotor kontra fri bygger.** OS bygger på skabeloner og løsningstyper.
   v0.2 er en fri bygger med katalogopslag. Om v1 er erstatning, supplement eller nyt
   domæne er ikke besluttet.
2. **Linjemodellen.** OS' snapshot-linjer bærer `beskrivelse/antal/enhed/kostpris/salgspris`.
   Selve kalkulationsgrundlaget — nettoforbrug, buffer, bredde, prisgruppe, fagligt
   estimat, risikotillæg, komponenter — findes ikke i OS i dag.
3. **`margin_pct` kontra dækningsgrad.** `prisbibliotek.salgslogik` bruger `margin_pct`.
   Excel og prototypen regner dækningsgrad. Tallene er de samme (40/50), men det bør
   afklares, om OS' `margin_pct` i praksis allerede *er* dækningsgrad.
4. **Version-låsning.** OS låser en version ved tilbudsoprettelse. Prototypen har intet
   versionsbegreb.
5. **Prisbibliotekets priser er ældre end Excel.** Fx Oracal 751 Sort/hvid: prisbiblioteket
   har 62, Excel har 58 (Scandraft) / 68 (Signcom). Timesatsen 240 mod 275. Når de to
   kilder skal forenes, er Excel den nyeste.

---

## 7. Hvad der bør besluttes før v1

> **Status 14. sep. 2026:** punkt 4 er afgjort (TR-053..TR-055, TR-061), og retningen for
> punkt 6 er afgjort (Source ejer vare-, pris- og prisgruppegrundlag, TR-057/TR-058).
> Adgangsmodellen er `bruger`/`admin` + super-admin uden observatør (TR-059); hvem der
> ser kostpris og DG inden for den, står som åbent spørgsmål i `PLANNING.md`.
> **Punkt 1 er fortsat uafklaret.** Den aktuelle liste over åbne spørgsmål er `PLANNING.md`.

1. Dækningsgrad på eksternt arbejde (20 / 30 / minimum 15).
2. Om `Laminering` og `Wrap` skal være selvstændige timeposter.
3. Om manuelt fastsat salgspris skal ind i prismodellen, og i så fald hvor.
4. Forholdet til SMU OS' eksisterende kalkulation.
5. Hvem må se kostpris og dækningsgrad.
6. Hvordan materialekataloget overgår til SMU Source.
