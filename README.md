# SMU Kalkulation

Signmeups kalkulationsværktøj. Selvstændig SMU-app efter **Small App First** og ejer af
kalkulationsdomænet (TR-053 i `smu-os-v2/PLANNING.md`).

> **Vælg en kendt materialeopbygning, tast forbrug og timer, og aflæs økonomien.**

Repoet starter fra den klikbare UX-prototype (v0.3.1). Første implementeringstrin har gjort
det til et udviklingsklart SMU-app-repo på platformens fælles fundament — **uden** database,
persistens eller Source-integration. Arbejdsfladen og prismotoren er bevaret uændret.

## Status lige nu

| Område | Status |
| --- | --- |
| Arbejdsflade (materialer, arbejde, øvrige, prisopsamling) | Prototypens UX, uændret |
| Prismotor | Ren TypeScript i `src/domain/`, Excel-verificeret 13/13, testet med Vitest |
| Beregningsregler | Lokalt typet regelsæt (`PROTOTYPE_REGELSAET`) |
| Login | Via SMU Hub og delt platform-session — ingen egen login-side |
| App-adgang | App-key `kalkulation` **live** med `bruger` (10) og `admin` (30), ingen `observatoer`. Ingen medarbejderadgange tildelt endnu |
| Platform-navigation | Canonical `platform-nav` fra Hub, AppSwitcher i topbjælken |
| Data | Kun lokale demo-data i hukommelsen. Intet gemmes |
| Kalkulationstabeller, persistens, RLS for kalkulationsdata | Ingen |
| Source-integration | Ingen. Materialekataloget er demo-data |
| Deploy | Ingen. `netlify.toml` findes, men appen er ikke deployet |
| Git-remote | `SMUanders/smu-kalkulation` |

**Implementeret:** repoet findes og er versionsstyret · app-key `kalkulation` findes live ·
rollerne `bruger` (10) og `admin` (30) findes · ingen observatørrolle · ingen medarbejderadgange endnu.

**Ikke implementeret:** deploy · Hub-katalogpost · Kalkulation-domænetabeller · persistens ·
Source-integration · RLS for kalkulationsdata.

## Start

```bash
npm install
```

```bash
npm run dev
```

Åbner på `http://localhost:5180`. Bygget til bred skærm (~1440 px eller mere); på smallere
skærme scroller tabellerne vandret i deres egen ramme.

| Kommando | Gør |
| --- | --- |
| `npm run dev` | Udviklingsserver |
| `npm run lint` | Typecheck (`tsc -b --noEmit`) |
| `npm test` | Vitest — prismotor, Excel-reference og adgangsregel |
| `npm run build` | Typecheck + produktionsbuild |

## Stack

Samme som de nyeste SMU-apps (SMU Source, SMU Assist): React 19, Vite 8, TypeScript 7
(`tsc -b`), Tailwind 4 med SMU-designtokens, react-router-dom 7, `@supabase/supabase-js` 2,
lucide-react og Vitest 4. Node 20 i `netlify.toml`.

**Tailwinds preflight er bevidst udeladt.** Kalkulationsfladens CSS er bygget og godkendt
oven på browserens standardværdier; preflight ville ændre den. Theme og utilities er med.
Genovervejes, når fladen flyttes over på `smu-*`-klasserne.

## Login og adgang

SMU Platform har ét login: **SMU Hub** (`smu.signmeup.dk`). Sessionen deles via
platform-cookien på `.smu.signmeup.dk` (`platform-nav/platformStorage.ts`). Appen har ingen
login-formular.

Adgangsgaten i `src/App.tsx` bruger den rene funktion `afgoerAdgang` i `src/auth/adgang.ts`:

| Situation | Resultat |
| --- | --- |
| Session afklares | Rolig ventetilstand |
| Ingen session | "Log ind på SMU Hub" med link til Hub |
| Session, men profilen er deaktiveret | Ingen adgang |
| Session + global super-admin | Adgang |
| Session + aktiv `app_adgange`-række for `kalkulation` med rolle `bruger`/`admin` | Adgang |
| Session uden adgang | Rolig "ingen adgang"-skærm med log ud |

Frontend-tjekket er UX. Den reelle grænse bliver RLS, når appen får data i databasen.

### Midlertidigt — skal løses i næste trin

- **App-key `kalkulation` og rollerne `bruger`/`admin` findes live** (TR-059,
  `20260915100001_kalkulation_app_roller.sql`), men **ingen medarbejder har fået en
  `app_adgange`-række**. I praksis kan derfor kun global super-admin åbne appen. Frontend fakes
  ingen adgang; når adgange tildeles, virker samme kode uden ændring.
- **SMU Kalkulation står ikke i Hub-kataloget** (`platformApps.ts`) og vises derfor ikke i
  app-skifteren. Kataloget ændres i Hub, ikke her.
- **Lokal udvikling uden nøgler.** Uden `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` kører
  `npm run dev` uden login på demo-data og viser mærkatet `Lokal dev`. Det er forsvarligt,
  fordi appen i dette trin intet læser eller skriver i databasen (SMU_APP_STANDARD §4).
  Et produktionsbuild nægter at starte uden nøgler. Tilstanden fjernes, når kalkulationer
  persisteres.
- **Med nøgler på localhost** findes ingen delt session (cookien gælder kun
  `*.smu.signmeup.dk`), så appen viser "Log ind på SMU Hub".
- **Ingen favicon.** SMU Kalkulation har ingen officiel app-identitet endnu; et nyt app-ikon
  kræver en designbeslutning.

## Kodens opbygning

```
src/
  domain/            Kalkulationsdomænet — ingen React, intet netværk
    typer.ts           kalkulationslinjer og kalkulationsdokument
    resultat.ts        beregningsresultat
    konfiguration.ts   beregningsregler som typet regelsæt
    processer.ts       arbejdsprocesser og timesatser
    beregning.ts       prismotoren (Excel K121–K137)
    *.test.ts          Vitest: Excel-reference og mellemresultater
  demo/              Prototype-data — erstattes, ikke udbygges
    materialekatalog.ts  materialer, serier, farver (erstattes af Source-opslag, TR-057/058)
    linjefabrik.ts       bygger linjer fra demokataloget
    demodata.ts          tre demo-kalkulationer
  auth/adgang.ts     adgangsreglen (ren funktion + test)
  context/           AuthContext
  lib/               supabase-klient, talformatering
  platform-nav/      canonical kopi fra smu-hub — ret aldrig her
  komponenter/       arbejdsfladen, Hub-login og ingen adgang
```

`domain/` er ikke et databaseschema. Persistens, Source-referencer og snapshotfelter designes
i næste trin.

## Prismotoren

Prismotoren spejler `SMU Kalkulation Master.xlsm` række for række (K121–K137).

- Dækningsgrad, ikke påslag: `salgspris = kost / (1 − DG)`
- DG **pr. kategori**: timer 50 % (min. 40), varer 40 % (min. 30), presenning 25 %
- Eksternt arbejde: **uafklaret**. Excel siger både 20 %, 30 % og minimum 15 %. Der regnes med
  30 som markeret placeholder — ikke som beslutning
- Emballagetillæg 2 % af materialekost — før varernes DG og med i kostprisen
- Fast opstart/fakturering 148 kr i kostgrundlaget uden avance
- Fragt uden avance, men med i grundlaget for energitillægget
- Energitillæg 10 % af `(samlet kostpris + samlet avance)`
- Buffer: rulle 15 % rundet op til 0,5 lbm; plade, stk og andet 0 %
- Timekost 275 kr; Lay-out 370; Projektering 600; overarbejde montering × 1,5 og × 1,75

**Gaten er `npm test`.** `src/domain/excelReference.test.ts` sammenligner de 13 poster mod
Excel-formlerne implementeret ordret og mod de frosne referencetal. Den oprindelige
sammenligning er dokumenteret i [`docs/EXCEL_SAMMENLIGNING.md`](docs/EXCEL_SAMMENLIGNING.md).

## Demo-cases

Vælges i topbjælken. `Nulstil demo` gendanner hele casen fra en frisk kopi af demodata.

1. **SMU-0187 · Mercedes Citan** — folie + print kombi. Primær UX-case.
2. **SMU-0193 · Facadeskiltning** — pladeløsning, indkøbte bogstaver, lift, efter regning.
3. **SMU-0204 · Trailerdekoration** — 75 enheder, serie-logik.

## Læs også

- `smu-os-v2/PLANNING.md` (TR-053..TR-062) og `NEXT_STEPS.md` — de vedtagne beslutninger
- [`docs/KALKULATION_V1_AUDIT_2026-09-14.md`](docs/KALKULATION_V1_AUDIT_2026-09-14.md) — undersøgelsesgrundlag
- [`PROTOTYPE_NOTER.md`](PROTOTYPE_NOTER.md) — prototypens historik, kilder og aflæsninger
- [`docs/EXCEL_SAMMENLIGNING.md`](docs/EXCEL_SAMMENLIGNING.md) — talsammenligningen mod Excel
