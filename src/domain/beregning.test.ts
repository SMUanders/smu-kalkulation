// Mellemresultater i prismotoren — det, slut-totalen alene ikke kan afsløre.

import { describe, expect, it } from "vitest";
import {
  avanceAfDg,
  beregnArbejde,
  beregnMateriale,
  beregnOevrig,
  beregnOpsamling,
  dgAfSalgspris,
  salgsprisAfDg,
} from "./beregning";
import { DG_STANDARD, PROTOTYPE_REGELSAET } from "./konfiguration";
import { findProces } from "./processer";
import { arbejde, kalkulation, komponent, materiale, oevrig } from "./testfabrik";

describe("dækningsgrad, ikke påslag", () => {
  it("1.020 kr ved 40 % DG giver 1.700 kr", () => {
    expect(salgsprisAfDg(1020, 40)).toBeCloseTo(1700, 10);
    expect(avanceAfDg(1020, 40)).toBeCloseTo(680, 10);
    expect(dgAfSalgspris(1020, 1700)).toBeCloseTo(40, 10);
  });

  it("50 % DG fordobler kostprisen", () => {
    expect(salgsprisAfDg(550, 50)).toBeCloseTo(1100, 10);
  });

  it("ugyldig DG på 100 % eller mere giver ingen avance", () => {
    expect(avanceAfDg(100, 100)).toBe(0);
  });

  it("salgspris 0 giver ingen dækningsgrad", () => {
    expect(dgAfSalgspris(100, 0)).toBeNull();
  });
});

describe("materialebuffer og afrunding", () => {
  const rulle = (netto: number) => beregnMateriale(materiale({ form: "rulle", netto, kostPrEnhed: 1 }));

  it.each([
    [22.5, 26],
    [2.025, 2.5],
    [0.37, 0.5],
    [8.0, 9.5],
    [20, 23],
  ])("rulle: %s lbm netto giver %s lbm kalkuleret", (netto, forventet) => {
    expect(rulle(netto).kalkuleretForbrug).toBeCloseTo(forventet, 10);
  });

  it("plader får ingen automatisk buffer", () => {
    const b = beregnMateriale(materiale({ form: "plade", netto: 2, kostPrEnhed: 160 }));
    expect(b.bufferPct).toBe(0);
    expect(b.kalkuleretForbrug).toBe(2);
    expect(b.kostTotal).toBe(320);
  });

  it("en overstyret buffer bruges i stedet for reglen", () => {
    const b = beregnMateriale(materiale({ netto: 22.5, bufferPct: 20, kostPrEnhed: 1 }));
    expect(b.kalkuleretForbrug).toBeCloseTo(27, 10);
  });

  it("overstyret forbrug vinder over netto og buffer", () => {
    const b = beregnMateriale(materiale({ netto: 22.5, overrideForbrug: 30, kostPrEnhed: 1 }));
    expect(b.kalkuleretForbrug).toBe(30);
    expect(b.erOverstyret).toBe(true);
  });

  it("manglende netto tæller 0 og markeres uafklaret", () => {
    const b = beregnMateriale(materiale({ netto: null, kostPrEnhed: 62 }));
    expect(b.uafklaret).toBe(true);
    expect(b.kostTotal).toBe(0);
  });
});

describe("komponentlinjer", () => {
  const laminat = komponent({ navn: "OraGuard 215G", kostPrEnhed: 30 });
  const ink = komponent({ navn: "Ink", kostPrEnhed: 20, prisErPrM2: true });

  it("3551 + 215G + ink ved 1370 mm giver 89,40 kr/lbm (Excel I49)", () => {
    const b = beregnMateriale(materiale({ breddeMm: 1370, kostPrEnhed: 32, netto: 5, komponenter: [laminat, ink] }));
    expect(b.komponentKost).toBeCloseTo(57.4, 10);
    expect(b.effektivKostPrEnhed).toBeCloseTo(89.4, 10);
    expect(b.kostTotal).toBeCloseTo(6 * 89.4, 10);
  });

  it("med ink slået fra giver det 62,00 kr/lbm (Excel I54)", () => {
    const b = beregnMateriale(
      materiale({ breddeMm: 1370, kostPrEnhed: 32, netto: 5, komponenter: [laminat, { ...ink, aktiv: false }] }),
    );
    expect(b.effektivKostPrEnhed).toBeCloseTo(62, 10);
  });

  it("ink uden kendt banebredde bidrager med 0", () => {
    const b = beregnMateriale(materiale({ breddeMm: null, kostPrEnhed: 32, netto: 5, komponenter: [ink] }));
    expect(b.komponentKost).toBe(0);
  });

  it("kostpris-override erstatter kun hovedmaterialets pris", () => {
    const b = beregnMateriale(materiale({ breddeMm: 1370, kostPrEnhed: 32, kostOverride: 25, netto: 5, komponenter: [laminat] }));
    expect(b.basisKost).toBe(25);
    expect(b.effektivKostPrEnhed).toBe(55);
    expect(b.kostErOverstyret).toBe(true);
  });
});

describe("arbejdslinjer", () => {
  it("fagligt estimat og risikotillæg lægges sammen", () => {
    const b = beregnArbejde(arbejde({ fagligtEstimat: 16, risikoTillaeg: 7.5 }));
    expect(b.kalkuleretTid).toBe(23.5);
    expect(b.kostPrTime).toBe(275);
    expect(b.kost).toBeCloseTo(6462.5, 10);
    expect(b.uafklaret).toBe(false);
  });

  it("kun risikotillæg er stadig fagligt uafklaret", () => {
    const b = beregnArbejde(arbejde({ risikoTillaeg: 7.5 }));
    expect(b.kalkuleretTid).toBe(7.5);
    expect(b.uafklaret).toBe(true);
  });

  it("timekost-override vinder over processens sats", () => {
    const b = beregnArbejde(arbejde({ fagligtEstimat: 1, kostPrTime: 370, kostOverride: 300 }));
    expect(b.kostPrTime).toBe(300);
  });
});

describe("øvrige poster og avancegrupper", () => {
  it("fragt har ingen avance", () => {
    expect(beregnOevrig(oevrig({ type: "fragt", antal: 1, kostPrEnhed: 200 })).gruppe).toBe("ingen");
  });

  it("efter regning uden estimat tæller 0 og er uafklaret", () => {
    const b = beregnOevrig(oevrig({ type: "efter_regning", antal: null, kostPrEnhed: null }));
    expect(b.kost).toBe(0);
    expect(b.uafklaret).toBe(true);
    expect(b.efterRegningUdenEstimat).toBe(true);
  });

  it("ekstern vare og efter regning med estimat regnes som eksternt arbejde", () => {
    expect(beregnOevrig(oevrig({ type: "ekstern_vare", antal: 2, kostPrEnhed: 2200 })).gruppe).toBe("eksternt");
    expect(beregnOevrig(oevrig({ type: "efter_regning_estimat", antal: 1, kostPrEnhed: 1 })).gruppe).toBe("eksternt");
  });
});

describe("prisopsamling", () => {
  it("energitillægget ligger på sluttotalen og rammer derfor også fragt", () => {
    const p = beregnOpsamling(kalkulation({ oevrige: [oevrig({ type: "fragt", antal: 1, kostPrEnhed: 200 })] }));
    expect(p.samletKostpris).toBe(348);
    expect(p.samletAvance).toBe(0);
    expect(p.energitillaeg).toBeCloseTo(34.8, 10);
    expect(p.totalSalgspris).toBeCloseTo(382.8, 10);
  });

  it("eksternt arbejde regnes med den markerede placeholder, og presenning med 25 %", () => {
    const p = beregnOpsamling(
      kalkulation({
        oevrige: [
          oevrig({ type: "ekstern_ydelse", antal: 1, kostPrEnhed: 700 }),
          oevrig({ type: "presenning", antal: 1, kostPrEnhed: 750 }),
        ],
      }),
    );
    expect(p.eksternavance).toBeCloseTo(300, 10);
    expect(p.presenningavance).toBeCloseTo(250, 10);
  });

  it("serie: poster pr. enhed ganges op, én-gangs-poster og fast opstart gør ikke", () => {
    const p = beregnOpsamling(
      kalkulation({
        antalEnheder: 75,
        materialer: [materiale({ netto: 8, kostPrEnhed: 62, gentagelse: "pr_enhed" })],
        arbejde: [arbejde({ fagligtEstimat: 6, kostPrTime: 370, gentagelse: "engang" })],
      }),
    );
    expect(p.materialekost).toBeCloseTo(75 * 9.5 * 62, 10);
    expect(p.arbejdskost).toBe(2220);
    expect(p.fastOpstart).toBe(148);
    expect(p.totalPrEnhed).toBeCloseTo(p.totalSalgspris / 75, 10);
  });

  it("valgt kundevendt pris giver forventet DG ved den pris", () => {
    const p = beregnOpsamling(
      kalkulation({ kundevendtPrEnhed: 1000, oevrige: [oevrig({ type: "fragt", antal: 1, kostPrEnhed: 452 })] }),
    );
    expect(p.samletKostpris).toBe(600);
    expect(p.valgtDg).toBeCloseTo(40, 10);
    expect(p.erManueltPrissat).toBe(true);
  });

  it("manglende stillingtagen tælles op på tværs af linjetyper", () => {
    const p = beregnOpsamling(
      kalkulation({
        materialer: [materiale({ netto: null, kostPrEnhed: 62 })],
        arbejde: [arbejde({ fagligtEstimat: null })],
        oevrige: [oevrig({ type: "efter_regning", antal: null, kostPrEnhed: null })],
      }),
    );
    expect(p.antalUafklarede).toBe(3);
  });
});

describe("regelsættet", () => {
  const R = PROTOTYPE_REGELSAET;

  it("svarer til Excel-arkets inputceller", () => {
    expect(R.timekost.standard).toBe(275);
    expect(R.timekost.layout).toBe(370);
    expect(R.timekost.projektering).toBe(600);
    expect(R.daekningsgrad.timer).toEqual({ standard: 50, minimum: 40 });
    expect(R.daekningsgrad.varer).toEqual({ standard: 40, minimum: 30 });
    expect(R.daekningsgrad.presenning.standard).toBe(25);
    expect(R.tillaeg).toEqual({ emballagePctAfMaterialekost: 2, fastOpstartFakturering: 148, energiPct: 10 });
  });

  it("DG på eksternt arbejde er fortsat markeret uafklaret", () => {
    expect(R.daekningsgrad.eksterntArbejde.status).toBe("uafklaret");
    expect(DG_STANDARD.eksternt).toBe(R.daekningsgrad.eksterntArbejde.placeholder);
  });

  it("overarbejde afledes af montering × 1,5 og × 1,75", () => {
    expect(findProces("overarbejde")?.kostPrTime).toBe(412.5);
    expect(findProces("overarbejde-weekend")?.kostPrTime).toBe(481.25);
    expect(findProces("lay-out")?.kostPrTime).toBe(370);
  });

  it("er frosset, så en kalkulation ikke kan ændre de fælles regler", () => {
    expect(Object.isFrozen(R)).toBe(true);
  });
});
