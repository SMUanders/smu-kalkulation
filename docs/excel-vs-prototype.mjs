// ============================================================================
// Excel vs. prototype — kontrolleret sammenligning.
//
// VENSTRE SIDE: Excel-formlerne implementeret ORDRET som de er aflæst fra
//   "SMU Kalkulation Master.xlsm", ark "Kalkulation", rækkerne 121-137.
// HØJRE SIDE:  prototypens egen beregnOpsamling().
//
// Begge sider fodres med den samme lille case. Hvis tallene ikke er ens,
// er prismotoren forkert.
// ============================================================================

import { beregnOpsamling } from "./beregning.js";
import { materialeFraKatalog, arbejdeFraKatalog, tomOevrig } from "./linjefabrik.js";
import { findMateriale } from "./materialekatalog.js";
import { DG_STANDARD } from "./regler.js";

// ---------------------------------------------------------------------------
// EXCEL-SIDEN — formlerne ordret
// ---------------------------------------------------------------------------
function excel({ vareforbrug, tidsforbrug, fragtOgFaste, eksternt = 0, presenning = 0 }) {
  const C122 = 50, C125 = 2, C126 = 40, C129 = 25, C132 = 30;

  const K121 = tidsforbrug;
  const K122 = (K121 / (100 - C122)) * 100 - K121;
  const K123 = K121 + K122;

  const K124 = vareforbrug;
  const K125 = (K124 * C125) / 100;
  const K126 = ((K124 + K125) / (100 - C126)) * 100 - (K124 + K125);
  const K127 = K124 + K125 + K126;

  const K128 = presenning;
  const K129 = (K128 / (100 - C129)) * 100 - K128;

  const K131 = eksternt;
  const K132 = (K131 / (100 - C132)) * 100 - K131;

  // K134 = SUM(K117:K120) + K121 + K124 + K125 + K131 + K128
  const K134 = fragtOgFaste + K121 + K124 + K125 + K131 + K128;
  const K135 = K122 + K126 + K132 + K129;
  const K136 = (K134 + K135) * 0.1;
  const K137 = K134 + K135 + K136;

  return { K121, K122, K123, K124, K125, K126, K127, K128, K129, K131, K132, K134, K135, K136, K137 };
}

// ---------------------------------------------------------------------------
// CASEN — lille og kontrollerbar
// ---------------------------------------------------------------------------
// Materiale: Orajet 3551 + OraGuard 215G (1370 mm), Scandraft, 62 kr/lbm
//            nettoforbrug 8,0 lbm → +15 % = 9,2 → rundet op til 9,5 lbm
//            9,5 × 62 = 589,00
// Arbejde:   Skærestue 2,0 t × 275 = 550,00
// Fragt:     Trucking gebyr 200,00 (ingen avance)
// Fast:      Opstart/fakturering 148,00 (ingen avance, i kostgrundlaget)

const kalk = {
  id: "test",
  smuNr: "SMU-0001",
  kunde: "Testkunde",
  sag: "Kontroltest",
  tegningsNr: "10900",
  antalEnheder: 1,
  enhedsnavn: "stk",
  daekningsgrader: { ...DG_STANDARD },
  kundevendtPrEnhed: null,
  materialer: [
    materialeFraKatalog(findMateriale("orajet-3551-215g"), {
      grundlag: "tegnestue",
      netto: 8.0,
      // Kombinationen foreslår ink; den slås fra her, så casen er ren folie+laminat
      komponenter: [],
    }),
  ],
  arbejde: [arbejdeFraKatalog("skaerestue", { fagligtEstimat: 2 })],
  oevrige: [
    tomOevrig({ type: "fragt", beskrivelse: "Trucking gebyr", antal: 1, kostPrEnhed: 200 }),
  ],
};

const p = beregnOpsamling(kalk);

// De tal Excel ville have fået i sine inputceller
const e = excel({
  vareforbrug: 9.5 * 62,      // F/H × pris → K-kolonnen
  tidsforbrug: 2 * 275,
  fragtOgFaste: 200 + 148,    // K118 trucking + K119 fast opstart
});

// ---------------------------------------------------------------------------
// SAMMENLIGNING
// ---------------------------------------------------------------------------
const r2 = (v) => Math.round(v * 100) / 100;
const raekker = [
  ["Materialekost           (K124)", e.K124, p.materialekost],
  ["Emballagetillæg 2 %     (K125)", e.K125, p.emballagetillaeg],
  ["Avance varer 40 %       (K126)", e.K126, p.materialeavance],
  ["Materialernes salgspris (K127)", e.K127, p.materialesalg],
  ["Arbejdskost             (K121)", e.K121, p.arbejdskost],
  ["Avance timer 50 %       (K122)", e.K122, p.arbejdsavance],
  ["Arbejdets salgspris     (K123)", e.K123, p.arbejdssalg],
  ["Fragt uden avance       (K118)", 200, p.fragtkost],
  ["Fast opstart            (K119)", 148, p.fastOpstart],
  ["Samlet kostpris         (K134)", e.K134, p.samletKostpris],
  ["Samlet avance           (K135)", e.K135, p.samletAvance],
  ["Energitillæg 10 %       (K136)", e.K136, p.energitillaeg],
  ["Total salgspris ex moms (K137)", e.K137, p.totalSalgspris],
];

let alleEns = true;
console.log("post                             Excel        Prototype    diff");
console.log("-".repeat(72));
for (const [navn, ex, pr] of raekker) {
  const d = r2(pr - ex);
  if (Math.abs(d) > 0.005) alleEns = false;
  console.log(
    navn.padEnd(32) +
      String(r2(ex)).padStart(11) +
      String(r2(pr)).padStart(13) +
      String(d).padStart(9) +
      (Math.abs(d) > 0.005 ? "   ← AFVIGER" : ""),
  );
}
console.log("-".repeat(72));
console.log(alleEns ? "RESULTAT: alle poster er identiske." : "RESULTAT: der er afvigelser.");
process.exit(alleEns ? 0 : 1);
