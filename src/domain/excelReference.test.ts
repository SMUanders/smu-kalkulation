// ============================================================================
// Excel-reference — den automatiske gate for prismotoren.
//
// Case (lille og kontrollerbar), samme som docs/EXCEL_SAMMENLIGNING.md:
//   Orajet 3551 + OraGuard 215G, 1370 mm, 62 kr/lbm, 8,0 lbm netto → 9,5 lbm
//   Skærestue 2,0 t × 275 kr
//   Trucking gebyr 200 kr (fragt, ingen avance)
//   Fast opstart/fakturering 148 kr
//
// To uafhængige sider sammenlignes:
//   1. Excel-formlerne fra ark "Kalkulation", K121–K137, implementeret ordret her
//   2. prototypens egen beregnOpsamling()
// Og begge låses mod de kendte referencetal fra verifikationen.
// ============================================================================

import { describe, expect, it } from "vitest";
import { beregnOpsamling } from "./beregning";
import { arbejde, kalkulation, materiale, oevrig } from "./testfabrik";

/** Excel-arkets formler, ordret. Inputcellerne er arkets egne standardværdier. */
function excel(input: { vareforbrug: number; tidsforbrug: number; fragtOgFaste: number }) {
  const C122 = 50;
  const C125 = 2;
  const C126 = 40;
  const C129 = 25;
  const C132 = 30;

  const K121 = input.tidsforbrug;
  const K122 = (K121 / (100 - C122)) * 100 - K121;
  const K123 = K121 + K122;

  const K124 = input.vareforbrug;
  const K125 = (K124 * C125) / 100;
  const K126 = ((K124 + K125) / (100 - C126)) * 100 - (K124 + K125);
  const K127 = K124 + K125 + K126;

  const K128 = 0;
  const K129 = (K128 / (100 - C129)) * 100 - K128;
  const K131 = 0;
  const K132 = (K131 / (100 - C132)) * 100 - K131;

  // K134 = SUM(K117:K120) + K121 + K124 + K125 + K131 + K128
  const K134 = input.fragtOgFaste + K121 + K124 + K125 + K131 + K128;
  const K135 = K122 + K126 + K132 + K129;
  const K136 = (K134 + K135) * 0.1;
  const K137 = K134 + K135 + K136;

  return { K121, K122, K123, K124, K125, K126, K127, K134, K135, K136, K137 };
}

/** De kendte referencetal (2 decimaler) fra verifikationen mod arket. */
const REFERENCE = {
  materialekost: 589,
  emballage: 11.78,
  avanceVarer: 400.52,
  materialesalg: 1001.3,
  arbejdskost: 550,
  avanceTimer: 550,
  arbejdssalg: 1100,
  fragt: 200,
  fastOpstart: 148,
  samletKostpris: 1498.78,
  samletAvance: 950.52,
  energitillaeg: 244.93,
  totalSalgspris: 2694.23,
};

const kalk = kalkulation({
  materialer: [
    materiale({
      beskrivelse: "Orajet 3551 + OraGuard 215G",
      breddeMm: 1370,
      form: "rulle",
      netto: 8.0,
      enhed: "lbm",
      kostPrEnhed: 62,
    }),
  ],
  arbejde: [arbejde({ proces: "Skærestue", fagligtEstimat: 2, kostPrTime: 275 })],
  oevrige: [oevrig({ type: "fragt", beskrivelse: "Trucking gebyr", antal: 1, kostPrEnhed: 200 })],
});

const p = beregnOpsamling(kalk);
const e = excel({ vareforbrug: 9.5 * 62, tidsforbrug: 2 * 275, fragtOgFaste: 200 + 148 });

const poster: [string, number, number, number][] = [
  ["Materialekost (K124)", e.K124, p.materialekost, REFERENCE.materialekost],
  ["Emballagetillæg 2 % (K125)", e.K125, p.emballagetillaeg, REFERENCE.emballage],
  ["Avance varer 40 % (K126)", e.K126, p.materialeavance, REFERENCE.avanceVarer],
  ["Materialernes salgspris (K127)", e.K127, p.materialesalg, REFERENCE.materialesalg],
  ["Arbejdskost (K121)", e.K121, p.arbejdskost, REFERENCE.arbejdskost],
  ["Avance timer 50 % (K122)", e.K122, p.arbejdsavance, REFERENCE.avanceTimer],
  ["Arbejdets salgspris (K123)", e.K123, p.arbejdssalg, REFERENCE.arbejdssalg],
  ["Fragt uden avance (K118)", 200, p.fragtkost, REFERENCE.fragt],
  ["Fast opstart (K119)", 148, p.fastOpstart, REFERENCE.fastOpstart],
  ["Samlet kostpris (K134)", e.K134, p.samletKostpris, REFERENCE.samletKostpris],
  ["Samlet avance (K135)", e.K135, p.samletAvance, REFERENCE.samletAvance],
  ["Energitillæg 10 % (K136)", e.K136, p.energitillaeg, REFERENCE.energitillaeg],
  ["Total salgspris ex moms (K137)", e.K137, p.totalSalgspris, REFERENCE.totalSalgspris],
];

describe("Excel-reference: SMU Kalkulation Master.xlsm, K121–K137", () => {
  it("har præcis 13 verificerede poster", () => {
    expect(poster).toHaveLength(13);
  });

  it.each(poster)("%s — diff 0 mod Excel og mod referencen", (_navn, excelVaerdi, prototype, reference) => {
    expect(Math.abs(prototype - excelVaerdi)).toBeLessThan(0.005);
    expect(prototype).toBeCloseTo(reference, 2);
  });

  it("kalkuleret forbrug bag materialekosten er 9,5 lbm (8,0 + 15 %, op til 0,5)", () => {
    expect(p.materialekost / 62).toBeCloseTo(9.5, 10);
  });
});
