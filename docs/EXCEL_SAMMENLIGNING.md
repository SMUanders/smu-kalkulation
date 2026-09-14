# Excel vs. prototype — kontrolleret sammenligning

**Reference:** `SMU Kalkulation Master.xlsm`, ark `Kalkulation`
(OneDrive – Signmeup A S, senest ændret 3. juli 2026, 144.294 bytes).
Ingen skjulte rækker eller kolonner. Excel er **ikke** ændret.

## Den aflæste prismotor

Formlerne herunder er læst direkte ud af arket, ikke gengivet fra hukommelsen.

| Række | Etiket | Formel |
| --- | --- | --- |
| K121 | Tidsforbrug i kr. | `SUM(K98:K112)` |
| K122 | Avance timer | `K121/(100-C122)*100-K121` · C122 = 50 |
| K123 | Timer salgspris | `SUM(K121:K122)` |
| K124 | Vareforbrug | `SUM(K3:K95)` |
| K125 | Emballagetillæg 2 % | `K124*C125/100` · C125 = 2 |
| K126 | Avance varer | `(K124+K125)/(100-C126)*100-(K124+K125)` · C126 = 40 |
| K127 | Varer salgspris | `SUM(K124:K126)` |
| K128 | Presenninger | `SUM(K115)` |
| K129 | Avance varer (25 %) | `K128/(100-C129)*100-K128` · C129 = 25 |
| K131 | Eksternt arbejde | `SUM(K114:K114)` |
| K132 | Avance eksterne | `K131/(100-C132)*100-K131` · C132 = **30** |
| K134 | Samlet kostpris | `SUM(K117:K120)+K121+K124+K125+K131+K128` |
| K135 | Samlet avance | `K122+K126+K132+K129` |
| K136 | Energitillæg 10 % | `SUM(K134:K135)*0,1` |
| K137 | Total salgspris ex moms | `SUM(K134:K136)` |

Fire ting falder i øjnene, og de er alle bygget ind i prototypen:

1. **Emballagetillægget er en omkostning.** Det ligger både i kostprisen (K134)
   og i DG-grundlaget (K126) — ikke som et gebyr oven på salgsprisen.
2. **Fast opstart/fakturering (148 kr, K119) ligger i kostgrundlaget** og får
   ingen avance.
3. **Fragt ligger også i kostgrundlaget** uden avance — men får energitillæg,
   fordi energitillægget rammer sluttotalen.
4. **Dækningsgrad regnes pr. kategori**, ikke pr. linje.

## Testcasen

Lille og kontrollerbar:

| Post | Grundlag | Beløb |
| --- | --- | --- |
| Orajet 3551 + OraGuard 215G, 1370 mm, Scandraft | 8,0 lbm netto → +15 % = 9,2 → op til 9,5 lbm × 62 kr | 589,00 |
| Skærestue | 2,0 t × 275 kr | 550,00 |
| Trucking gebyr (fragt) | 1 × 200 kr | 200,00 |
| Fast opstart/fakturering | fast | 148,00 |

## Resultat

```
post                             Excel        Prototype    diff
------------------------------------------------------------------------
Materialekost           (K124)          589          589        0
Emballagetillæg 2 %     (K125)        11.78        11.78        0
Avance varer 40 %       (K126)       400.52       400.52        0
Materialernes salgspris (K127)       1001.3       1001.3        0
Arbejdskost             (K121)          550          550        0
Avance timer 50 %       (K122)          550          550        0
Arbejdets salgspris     (K123)         1100         1100        0
Fragt uden avance       (K118)          200          200        0
Fast opstart            (K119)          148          148        0
Samlet kostpris         (K134)      1498.78      1498.78        0
Samlet avance           (K135)       950.52       950.52        0
Energitillæg 10 %       (K136)       244.93       244.93        0
Total salgspris ex moms (K137)      2694.23      2694.23        0
------------------------------------------------------------------------
RESULTAT: alle poster er identiske.
```

## Den automatiske gate: Vitest

Sammenligningen køres nu som en del af testsuiten:

```bash
npm test
```

[`src/domain/excelReference.test.ts`](../src/domain/excelReference.test.ts) implementerer
Excel-formlerne ordret, kalder `beregnOpsamling()` og kræver diff 0 på alle 13 poster —
både mod formlerne og mod de frosne referencetal i tabellen ovenfor. Mellemresultaterne
(buffer, komponenter, ink-omregning, avancegrupper, serie, energitillæg) testes i
[`src/domain/beregning.test.ts`](../src/domain/beregning.test.ts).

## Historisk: det oprindelige ad hoc-script

Den første sammenligning blev lavet med [`excel-vs-prototype.mjs`](excel-vs-prototype.mjs).
Venstre side implementerer Excel-formlerne ordret; højre side kalder prototypens egen
`beregnOpsamling()`. De to sider deler ingen kode.

Scriptet er bevaret uændret som historik. Det importerer den gamle flade struktur
(`./beregning.js`, `./regler.js` …) fra dengang, hvor `src/` blev kompileret til `build/`.
Efter omlægningen til `src/domain/` og `src/demo/` kører det kun med tilrettede importstier;
det blev kørt sådan ved omlægningen med samme resultat, 13/13 diff 0.

## Sidekontrol: materialekombinationer

Excel har færdige kombinationslinjer med egne formler. Prototypen når frem til
de samme priser ad to veje:

| Excel | Formel i arket | Excel-pris | Prototype |
| --- | --- | --- | --- |
| Orajet 3551 + 215 (I54) | `I71+I56` = 30 + 32 | 62,00 | 62,00 (3551 med foreslået laminat, ink slået fra) |
| Orajet 3551, 215G og ink (I49) | `I56+I71+(G90*1,37)` = 32 + 30 + 27,40 | 89,40 | 89,40 (både som færdig kombination og som 3551 + begge forslag) |
| Oracal 751 med TP-160 (I4) | `I9+I87` = 65 + 7 | 72,00 | 72,00 (færdig kombination i kataloget) |

Ink-omregningen `pris pr. m² × banebredde i meter` er taget med, fordi arket
selv regner sådan.
