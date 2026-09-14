# SMU Kalkulation — v1-audit og implementeringsplan

**Dato:** 14. september 2026
**Status:** UNDERSØGELSESGRUNDLAG — **ikke Truth Reset.**

> Denne fil er et dateret øjebliksbillede af en read-only undersøgelse. Den er ikke vedtaget
> platformsandhed og overtrumfer ikke de seks Truth Reset-filer i `smu-os-v2`.
> Anbefalinger og datamodelforslag herunder er **forslag**, ikke beslutninger.
>
> Rækkefølgen er aftalt: først produktbeslutningerne F1–F7, derefter en eksplicit Reality Sync af
> de relevante Truth Reset-filer, og først derefter fortsætter implementeringen.

## Undersøgelsesmetode

Alt er verificeret read-only. Der er ikke ændret kode, database, migrationer eller andre apps.

- **Kode og migrationer:** læst i `smu-kalkulation`, `smu-source`, `smu-os-v2`, `smu-hub` og `smu-esg`.
- **Live rækketal:** `supabase inspect db table-stats --linked`. Tallene er Postgres' egne estimater.
- **Migrationsstatus:** tørkørsel af `node scripts/db-apply.mjs` uden `--yes`.
- **Grænse:** live-schema på kolonneniveau er ikke læst, fordi Supabase-connectoren ikke var autoriseret
  i sessionen. Påstande om kolonner bygger derfor på migrationer, kode og post-guards.

**Kort konklusion:** Før der bygges noget, skal det besluttes, hvem der ejer kalkulationsdomænet.
Truth Reset siger i dag, at det er SMU OS, og at det er FASTLAGT. Derudover har SMU Source i dag kun få
af de materialer og priser, prototypen regner med.

---

## A. Verificeret nuværende virkelighed

### Kalkulation-prototypen

- **Ikke et git-repo.** Stakken er React 18, Vite 5, uden router, Tailwind, Supabase eller tests. Det
  afviger fra `SMU_APP_STANDARD.md` (React 19, Vite 8, Tailwind 4, react-router 7, Vitest, platform-nav).
- **State:** alt ligger i `useState` i `KalkulationSide`. "Senest brugte" materialer og farver ligger i
  variabler på modulniveau.
- **Hardcodede data:** `materialekatalog.ts` (965 linjer, aflæst fra Excel inkl. serier og farver),
  `proceskatalog.ts`, `regler.ts` og `demodata.ts`.

| Klasse | Filer |
|---|---|
| **A – kan genbruges næsten direkte** | `beregning.ts` (ren prismotor, 13/13 mod Excel) · formlerne i `regler.ts` · dansk tal-parsing og indtastning i `Celler.tsx` · Excel-testen (skal flyttes til Vitest) |
| **B – bør tilpasses** | `typer.ts` (skal have id'er, snapshots og DB-mapping) · `linjefabrik.ts` (katalogopslag skal gå mod Source) · alle tabeller, `Prisopsamling` og `KalkulationSide` (UI kan genbruges, men skal have datalag og designsystem) · de to vælgere (skal have ny datakilde) · `proceskatalog.ts` (skal være konfiguration) |
| **C – prototype-only** | `demodata.ts` · de hardcodede varer, serier og farver i `materialekatalog.ts` · senest-brugt-state på modulniveau · nulstil demo og `erAendret` · de deaktiverede fremtidsknapper · egne CSS-tokens · `docs/tsconfig.test.json` |

### SMU Source

Tabellerne findes: producent → produkt → variant → vare → leverandørvare → pris, plus dokumenter,
egenskaber og holdbarhed. View'et `source_aktuelle_priser` giver gældende pris.

Live (estimeret): 3 produkter, 120 varianter, 9 varer, 2 leverandører og **4 priser**.

| Materiale | Hvad findes faktisk |
|---|---|
| **ORACAL 751C** | 117 varianter. 116 har ORAFOL's engelske farvenavn. Farvegruppe er kun dokumenteret for 010/070 (`sort_hvid`), 930 (`gold_l`) og 932 (`metallic`), resten står som `ukendt`. **5 varer, alle 1260 mm/lbm:** 090 og 930 hos Signcom, 010, 070 og 050 hos Scandraft. **2 priser:** 090 Signcom 75,96 kr/lbm og 010 Scandraft 88,85 kr/lbm, begge fakturaverificerede. **Ingen pris på 050, 070 og 930.** |
| **ORAJET 3551** | 1 variant (white/glossy). 2 varer: 1050×50 m og 1370×50 m med `basis_enhed = stk`. **2 priser pr. rulle:** 1.350 og 1.490 kr. |
| **ORAGUARD 215** | 2 varianter på finish (gloss og semi-gloss). 2 varer (semi-gloss 1050 og gloss 1370). **0 priser** – bevidst, fordi der er en rapporteret datakonflikt. |
| **TP-160** | Findes ikke. Kategorien `transfertape` findes, men uden produkter. |
| **Avery Supreme** | Findes ikke. |
| **Ink og plader** | Findes ikke. Kategorierne `ink`, `blaek` og `plade` er udtrykkeligt **ikke godkendt**. |

Det findes ikke i Source:

- **Prisgruppe:** kun den tekniske `farvegruppe`. `SOURCE_SCHEMA_DESIGN.md` §9.3 kalder det et åbent gap
  med tre retninger, hvor ingen er valgt.
- **Standardbredde.**
- **Standardleverandør:** `foretrukken` findes som felt, men er bevidst altid false.
- **Relationer mellem materialer (BOM):** udtrykkeligt ikke bygget.
- **Prisstaffel.**

**Adgang:** Source-tabellerne kræver `har_app_adgang('source')`, men `source_priser` kræver
**`source/redaktoer`**. Source står som "på vej", og kun super-admin har adgang.

### SMU OS

- **Tabeller:** `losninger` (sag_id), `kalkulationsversioner` (låst), `kalkulationssektioner`,
  `kalkulationslinjer` (type-enum med beskrivelse, antal, enhed, kostpris, salgspris og auto_beregnet),
  `tilbud` (version_id), skabeloner (72 linjer, alle med `prislinje_id`), `prisbibliotek` (46) og
  `prislinje_historik` (19).
- **Låsning:** triggere blokerer ændring af linjer og sektioner i en låst version. Versionen låses, når
  der oprettes tilbud (`Losning.tsx:535`).
- **RLS:** alle kalkulationstabeller læses med `har_app_adgang('os')` og skrives med
  `har_app_rolle('os','bruger')`. `prisbibliotek` skrives kun af admin. De brede fase3-policies er
  erstattet dynamisk i `20260817190001_os_enforcement_del1`.
- **UI og beregning:** `/sager/:sagId/losninger/:losningId` → `Losning.tsx` (1.217 linjer) plus
  `opretLosningMedSkabelon.ts`. Motoren er en anden end Excels: margin_pct pr. linje fra prisbiblioteket,
  energitillæg på salgsprisen, intet emballagetillæg, og 148 kr ligger som en fragtlinje.
- **Brug:** koden kører i produktion, men **losninger, versioner, sektioner, linjer og tilbud har 0
  rækker**. Der blev nulstillet 14.08.2026, og siden er modulet ikke brugt.
- **Schema-drift:** `kalkulationssektioner`, `kalkulationslinjer.sektion_id`,
  `kalkulationsversioner.energitillaeg_pct` og `losninger.losningstype_id/skabelon_id` har ingen CREATE
  eller ADD COLUMN i hubben og står ikke i `DATABASE_SCHEMA_BASELINE.md`. For sektioner og `sektion_id` er
  det bevist, at de findes live, fordi senere migrationers post-guards har kørt. De tre andre bruges i
  koden, men det er ikke verificeret, at de findes live.

### Auth og app-adgang

- Delt Supabase Auth med `profiler` (aktiv, er_super_admin, login_alias).
- `app_adgange` har én række pr. bruger og app og peger på `app_roller` (app, rolle, niveau).
- `har_app_adgang` og `har_app_rolle` kræver `profiler.aktiv`, og global super-admin kommer altid igennem.
- **Login sker kun i Hub.** Sessionen deles via en cookie på `.smu.signmeup.dk` (platform-nav
  `platformStorage`), og OS har ikke længere sit eget login.
- **Nyeste mønster (ESG og Source):** `AuthContext` henter `profiler` og brugerens egen
  `app_adgange`-række. Frontend-flags styrer kun UI, RLS er den reelle grænse. ESG læser Source, og
  brugeren skal derfor have adgang til begge apps.
- Hub-kataloget har **ingen `kalkulation`-post**.

### Migrationer

Tørkørsel af gaten 14.09.2026: **alt grønt.**

- 99 versioner, 0 pending og 0 remote-only.
- `migrations/` er committed, og `migrations_kladde/` er tom.

Et senere apply kan planlægges, men gaten skal køres igen på selve dagen.

---

## B. Reelle konflikter

1. **Ejerskab.** DOMAIN_MODEL siger: *"Kalkulation | SMU OS | Løsning, version, sektioner, linjer,
   kost/salg og snapshots | FASTLAGT"*. Det samme gælder kalkulationsregler og margin. En selvstændig app,
   der ejer kalkulationer, går direkte imod det og kræver en beslutning og en Truth Reset-opdatering.
2. **Prototypen antager noget, Source ikke har:** prisgruppe, standardbredde, danske farvenavne,
   standardleverandør og komponentrelationer.
3. **Materialedækning:** Source mangler Avery, TP-160, ink og plader. 751C har kun 2 priser, 215 har 0, og
   3551 er prissat pr. rulle, så den skal omregnes via `laengde_m`.
4. **Prisadgang:** kun `source/redaktoer` kan læse indkøbspriser, og Source er ikke frigivet. En kalkulator
   kan ikke se kostpriser i dag.
5. **Excel og Source er uenige om priserne:**
   - 751 Sort/hvid hos Scandraft: Excel 58 kr, Source 88,85 kr/lbm (faktura 29.06.2026).
   - 3551 1370: Excel 32 kr, Source 29,80 kr/lbm (1.490 kr pr. 50 m-rulle).
6. **To prismotorer:** OS' motor og Excel-motoren giver forskellige resultater. De må ikke begge skrive til
   de samme rækker.
7. **Snapshot for tyndt:** `kalkulationslinjer` har ingen Source-reference, netto, buffer, komponenter eller
   regelsæt.
8. **Standard-doc er forældet:** `SMU_APP_STANDARD.md` §4 beskriver login med email og password pr. app,
   men live er login kun i Hub (TR-051). Live vinder.

---

## C. Anbefalet v1-arkitektur (forslag)

**Anbefaling:** SMU Kalkulation bliver en selvstændig app med app-key `kalkulation` og egne
`kalk_*`-tabeller. Den ejer nye kalkulationer, mens OS fortsat ejer sag. OS' nuværende kalkulationstabeller
(0 rækker) forbliver urørte.

Hvorfor ikke de to alternativer:

- **Ny UI oven på OS' tabeller:** to apps ville skrive de samme rækker med to forskellige motorer.
- **Ombygge `Losning.tsx`:** stor risiko i en live app og imod Small App First.

**Relationer (forslag, ikke DDL):**

- `kalk_kalkulationer` har `sag_id`, som er påkrævet afhængigt af F3. Den læses fra OS og skrives aldrig.
  Den kan have `os_losning_id` (nullable) og en titel.
- `kalk_versioner` har version_nr, låst, antal enheder, kundevendt pris, et snapshot af regelsættet og et
  snapshot af resultatet ved låsning.
- Linjetabeller: `kalk_materialelinjer`, `kalk_komponentlinjer` (bundet til en materialelinje),
  `kalk_arbejdslinjer` og `kalk_oevrige_linjer`.
- Konfiguration: `kalk_regelsaet` og `kalk_komponentregler`.

**Snapshot – minimum, udledt af Source-schemaet:**

- **Source-referencer:** `source_vare_id`, `source_leverandoervare_id` og `source_pris_id`.
- **Materialets identitet:** produkt- og producentnavn, serie, variantkode og -navn, finish, `bredde_mm`,
  `laengde_m` og `basis_enhed`.
- **Prisgrundlag:** leverandørnavn og -varenummer, pris som registreret, `prisenhed` (fx rulle), valuta,
  `gyldig_fra`, `kilde`, omregnet kostpris pr. kalkulationsenhed og omregningsgrundlaget.
- **Kalkulationens egne data:** grundlag, netto, den gældende buffer og afrunding (ikke "brug standard"),
  beregnet forbrug og kost-override med originalpris.
- **Komponenter:** samme felter plus reference til forælderlinjen, `pris_er_pr_m2`, aktiv og
  auto_foreslaaet.

**Komponentregler ejes af Kalkulation (B).** Producentens dokumenterede kompatibilitet er et faktum og hører
i Source, og Source har allerede planlagt det som relation. "Vi bruger 215G gloss 1370 på 3551" og
"ink = m² × bredde" er derimod Signmeups kalkulationsstandard. Ink findes slet ikke som kategori i Source.

**Prisregler:**

- **Kode:** DG-formlen, Excel-kæden (K121–K137), emballage før varernes DG, energitillæg på kost + avance,
  bufferafrunding, ink-omregning, omregning fra rulle til lbm og gentagelse.
- **Konfiguration** (versioneret og snapshottet): 275/370/600 kr/t, overarbejde ×1,5/×1,75, DG 50/40,
  40/30 og 25, emballage 2 %, opstart 148 kr, energi 10 %, bufferregler og komponentregler.
- **Stamdata (Source):** pris, prisenhed, bredde, leverandør og varenummer.
- **Uafklaret:** ekstern DG 20/30/min. 15, prisgruppemodellen (§9.3), leverandørvalg, forskellen mellem
  Excel- og Source-priser, placering af fast salgspris samt Laminering og Wrap som processer.

**Auth:** følg ESG/Source-mønstret med Hub-login, `platformAuthStorage` og en `AuthContext` for
`kalkulation`. Opret ingen ny auth-model.

**RLS:**

- **Roller:** genbrug det eksisterende ordforråd: `observatoer`(5), `bruger`(10) og `admin`(30).
- **Kalkulationstabeller:** SELECT med `har_app_adgang('kalkulation') and not slettet`, INSERT og UPDATE med
  `bruger`. Ingen DELETE-policy og en låsetrigger efter OS' mønster.
- **Regelsæt:** kun admin kan skrive.
- **Sager:** brugeren skal have OS-adgang, samme princip som ESG→Source.
- **Priser fra Source:** kræver en ny, Source-ejet læse-policy for `har_app_rolle('kalkulation','bruger')`.
  Det er Source-ejerens beslutning, ikke Kalkulations.

**Historik og genbrug** kræver ikke et skabelonsystem. Kopiering = ny kalkulation fra snapshot-linjerne.
Fordi Source-id'erne bevares, kan man ved kopiering vælge mellem "behold snapshotpris" og "opdatér til
aktuel pris". Søgning kan bygge på sag, snapshotfelter og `pg_trgm`.

**Hensyn, så senere funktioner ikke blokeres:**

- **SMU Tid:** stabile id'er på arbejdslinjer og en `proces_kode`.
- **CorelDraw:** `grundlag` skal kunne udvides.
- **Tilbud:** OS' `tilbud.version_id` peger på OS-versioner og kan ikke pege på `kalk_versioner`. Det kræver
  en kontrakt senere.

---

## D. Hvad kan genbruges fra prototypen

Hele A-klassen og UX'en: flowet med standardvalg først og undtagelser bagefter, komponentlinjerne,
forbrugsvisningen og prisopsamlingen. Excel-testen bliver acceptkriterium.

## E. Hvad skal ændres før rigtig v1

- Stakken skal følge SMU_APP_STANDARD, og projektet skal i git.
- Datalaget skal have id'er, snapshots og persistens.
- Kataloget skal væk fra hardcoding og over på Source (og Color for farver).
- Regler skal være versioneret konfiguration.
- Omregning fra rulle til lbm skal på plads.
- Materialer uden Source-pris skal have en bevidst håndtering.
- OS-driften (sektioner m.fl.) bør baselines, før noget rører de tabeller.

---

## F. Åbne produktbeslutninger

1. **Ejerskab:** Skal kalkulationsdomænet flyttes fra OS til SMU Kalkulation, så DOMAIN_MODEL ændres? Og skal
   OS' kalkulationsmodul (0 rækker) fryses i UI, når v1 er i brug? Anbefaling: ja til begge, og intet slettes.
2. **Løsning:** Er "løsning" (alternativ) en Kalkulation-ting, eller skal OS oprette den først?
3. **Uden sag:** Skal man kunne kalkulere, før der findes en sag?
4. **Kostpris i v1:** Excel-priser eller fakturaverificerede Source-priser? Og hvad gøres med materialer,
   Source ikke har: en fri linje med manuel kostpris som bevidst undtagelse, eller udbygge Source først?
5. **Prisgruppe:** Må den ejes som en Kalkulation- og leverandørkontrakt (Source §9.3, retning 3)? Det
   kræver også Source-ejerens ja.
6. **Synlighed:** Hvem må se kostpris og DG – alle kalkulatorer, og også observatører?
7. **Leverandørvalg,** når en vare findes hos flere leverandører.

## G. Foreslået implementeringsrækkefølge

Alt følger gaten, og migrationer ligger i kladde, til de er klar.

0. Beslutning på F1–F7 og Reality Sync af DOMAIN_MODEL og PLANNING (kun docs).
1. Repo-fundament uden DB – se H.
2. App-key `kalkulation`, roller, første adgang til super-admin og en "på vej"-post i Hub.
3. `kalk_regelsaet` med seed af Excel-værdier, hvor ekstern DG er markeret uafklaret.
4. `kalk_*`-tabellerne med RLS og låsetrigger, uden data.
5. Læsekontrakter: sager fra OS og en Source-ejet læse-policy på priser.
6. Rigtig gem og indlæs samt låsning af version.
7. Materialevælgeren på Source-data med den håndtering af huller, der besluttes i F4.
8. Komponentregler.
9. Historik, søgning og kopiering.
10. Pilotfrigivelse i Hub.

## H. Første implementeringstrin (efter godkendelse og Reality Sync)

**Repo-fundament, uden database og uden deploy:**

- `git init` i smu-kalkulation på SMU_APP_STANDARD-stakken med platform-nav kopieret ind og `supabase.ts`
  med `platformAuthStorage`.
- `AuthContext` for app-key `kalkulation`. Den virker allerede for super-admin og kræver ingen migration.
- `beregning.ts` og reglerne flyttes over som typet konfiguration, og Excel-testen bliver Vitest.

**Acceptkriterier:** 13/13 mod Excel, `tsc`, `build` og `test` er grønne, og der er 0 migrationer.

Trinnet er værdifuldt uanset udfaldet af F1–F7, men giver kun fuld mening, hvis F1 lander på selvstændig app.
