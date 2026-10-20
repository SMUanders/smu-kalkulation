# SMU Kalkulation

Signmeups kalkulationsværktøj — **intern beta** på `https://kalkulation.smu.signmeup.dk`.
Selvstændig SMU-app efter **Small App First** og ejer af
kalkulationsdomænet (TR-053 i `smu-os-v2/PLANNING.md`).

> **Vælg en kendt materialeopbygning, tast forbrug og timer, og aflæs økonomien.**

Repoet startede fra den klikbare UX-prototype (v0.3.1). Siden 20. okt. 2026 gemmes kalkulationer på en
rigtig OS-sag (persistens v1, TR-093). Source-integration findes endnu ikke — kostpriser er manuelle.
Arbejdsfladen og prismotoren er bevaret uændret.

## Status lige nu

| Område | Status |
| --- | --- |
| Arbejdsflade (materialer, arbejde, øvrige, prisopsamling) | Prototypens UX, uændret |
| Prismotor | Ren TypeScript i `src/domain/`, Excel-verificeret 13/13, testet med Vitest |
| Beregningsregler | Lokalt typet regelsæt (`PROTOTYPE_REGELSAET`) |
| Login | Via SMU Hub og delt platform-session — ingen egen login-side |
| App-adgang | App-key `kalkulation` **live** med `bruger` (10) og `admin` (30), ingen `observatoer`. Tre aktive adgange (super-admin + to medarbejdere) |
| Platform-navigation | Canonical `platform-nav` fra Hub, AppSwitcher i topbjælken |
| Data | `/sag/:sagId`: kalkulationer gemmes i `kalk_kalkulationer`/`kalk_versioner` (RLS). `/`: demo, intet gemmes |
| Sag | Læses via OS' read-contract `kalkulation_sag(uuid)` — kopieres ikke. `sag_id` obligatorisk, `losning_id` nullable i v1 |
| Versioner | Gem kladde, genåbn, lås (intern godkendelse — låst version er uforanderlig), ny version |
| Fra OS | Sagssiden i OS har "Åbn kalkulation" → `/sag/<sag-id>` |
| Source-integration | Ingen. Materialekataloget er prototype-data; kostpriser er manuelle og markeret i hver version |
| Pris tilbage til OS | Ikke bygget. `kundevendt_samlet` er det tal, OS senere skal bruge |
| Deploy | **Intern beta** på `https://kalkulation.smu.signmeup.dk` (Netlify-site `smu-kalkulation`, TLS + tvungen HTTPS) |
| Git-remote | `SMUanders/smu-kalkulation` |

**Implementeret:** intern beta deployet · app-key og roller live · Hub-katalogpost · persistens v1
(gem/genåbn/lås/versionering på en OS-sag, RLS) · deep link fra OS.

**Ikke implementeret:** Source-integration · pris/resultat tilbage til OS · Løsning-kobling ·
tilbud/faktura · officielt app-ikon.

## Intern beta

Appen kører som **intern beta** på `https://kalkulation.smu.signmeup.dk` — deployet 16. sep. 2026
efter samme mønster som SMU Source og SMU Arkiv: Netlify-site `smu-kalkulation`, custom domain,
Let's Encrypt-certifikat og tvungen HTTPS. Den tidligere adresse `smu-kalkulation.netlify.app`
svarer stadig, men deler ikke platform-cookien og må ikke linkes.

- **Hvem kan komme ind:** kun brugere med en aktiv `app_adgange`-række for `kalkulation`. Pr. 20. okt.
  2026 er der tre: global super-admin som `admin` og to medarbejdere som `bruger`.
- **Hub-katalogpost:** appen står i platformens katalog (`frigivet` + `discoverable`) med et midlertidigt
  neutralt ikon. Synligheden følger `app_adgange`, så kortet ses kun af dem, der har adgang.
- **Beta-markering i appen:** en tynd stribe under topbjælken — *Intern beta · materialer/priser er
  endnu ikke koblet til SMU Source*. Den fjernes, når varer og priser kommer fra Source (TR-057).
- **Deploy sker gennem Git.** Se afsnittet *Deploy* nedenfor.

## Deploy

**Produktion bygges af Netlify, ikke lokalt.**

```
push til main  →  Netlify bygger (npm run build)  →  sitets egne production-env-vars  →  production
```

Netlify-sitet `smu-kalkulation` (id `d504ff35-70b3-4c92-8f5b-556a861c0375`) er koblet til
`SMUanders/smu-kalkulation`, branch `main`, med `netlify.toml` som build-konfiguration. Sitet har selv
`VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY`; de findes **kun** dér og hverken i Git eller i en lokal fil.

**Lokale production-deploys er ikke releasevejen.** Kør aldrig `netlify deploy --prod` med en lokalt bygget
`dist`. Et lokalt build uden Netlifys env-vars giver en bundle, hvor env-guarden i
[`src/lib/supabase.ts`](src/lib/supabase.ts) med rette stopper appen — og den bundle må aldrig nå produktion.
Det skete 7. okt. 2026, dengang sitet ikke var Git-koblet; produktionen blev gendannet via Netlifys restore,
og Git-koblingen lukkede hullet.

Guarden skal blive: den er beskyttelsen mod en produktion uden nøgler. Problemet var deploymetoden.

Virker noget ikke, så ret det i koden, commit og push — og lad Netlify bygge.

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

Frontend-tjekket er UX. Den reelle grænse er RLS på `kalk_*`-tabellerne og adgangstjekket inde i
OS-kontrakten `kalkulation_sag`.

### Lokal udvikling

- **Uden nøgler** kører `npm run dev` kun demoen på `/` og viser mærkatet `Lokal dev`; `/sag/...`
  kan ikke gemme. Et produktionsbuild nægter at starte uden nøgler.
- **Med DEV-nøgler** (`.env.local`, gitignored) viser login-skærmen et **DEV-login**, fordi den delte
  platform-cookie kun gælder `*.smu.signmeup.dk`. DEV-login findes kun når `import.meta.env.DEV` og
  projekt-ref'en ikke er LIVE — det er fjernet fra ethvert produktionsbuild.
- Peg aldrig en lokal opsætning mod LIVE for at teste gem. Databaseændringer går DEV → rapport → LIVE
  via `smu-os`-hubben (se `smu-os/CLAUDE.md`).
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
    versionsdata.ts    hvad en gemt version indeholder (dokument, regelsæt-snapshot, nøgletal)
  lib/               supabase-klient, datalag (kalkulationApi.ts), talformatering
  platform-nav/      canonical kopi fra smu-hub — ret aldrig her
  komponenter/       arbejdsfladen, Hub-login og ingen adgang
```

`domain/` er ikke et databaseschema. Tabellerne ejes af migrationen
`20261020235910_kalkulation_persistens.sql` i `smu-os`-hubben. Source-referencer i snapshot designes
sammen med Source-integrationen.

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
