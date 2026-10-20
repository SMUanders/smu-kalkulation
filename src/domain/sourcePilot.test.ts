import { describe, expect, it } from "vitest";
import { beregnMateriale, beregnOpsamling } from "./beregning";
import { PROTOTYPE_REGELSAET } from "./konfiguration";
import { afgoerPilotpris, anvendSourcePilot, kostprisVedValg, SOURCE_PILOT, type SourceKontraktRaekke, type SourcePilotStatus } from "./sourcePilot";
import { kalkulation, materiale } from "./testfabrik";
import { erKalkulation, lavVersionsdata, PRISGRUNDLAG_V1, prisgrundlagFor, sammeIndhold } from "./versionsdata";
import { findMateriale, materialekatalog } from "../demo/materialekatalog";
import { materialeFraKatalog, skiftTilKatalog } from "../demo/linjefabrik";

// Kontraktsvar formet som LIVE 20. okt. 2026: 9 varer i 651 Farver 1260 med én
// gruppepris (Signcom, 42,3216 kr/lbm), plus naborækker der IKKE må påvirke piloten.
const PL = "c2e57821-0000-4000-8000-000000000001";
const SIGNCOM = "11111111-0000-4000-8000-000000000001";
function raekke(felter: Partial<SourceKontraktRaekke> = {}): SourceKontraktRaekke {
  return {
    vare_id: "v-1",
    aktiv: true,
    serie: "651",
    prisgruppe_navn: "Farver",
    bredde_mm: 1260,
    leverandoer_id: SIGNCOM,
    leverandoer_navn: "Signcom Denmark ApS",
    salgsenhed: "lbm",
    pris: 42.3216,
    prisenhed: "lbm",
    prisliste_id: PL,
    gyldig_fra: "2026-10-20",
    ...felter,
  };
}
const NI = Array.from({ length: 9 }, (_, i) => raekke({ vare_id: `farve-${i}` }));
const NABOER = [
  raekke({ vare_id: "sh-1", prisgruppe_navn: "Sort/hvid", pris: 32.0256, prisliste_id: "pl-sh" }),
  raekke({ vare_id: "076", prisgruppe_navn: null, pris: null, prisliste_id: null, leverandoer_id: null, salgsenhed: null, prisenhed: null, gyldig_fra: null }),
  raekke({ vare_id: "udgaaet", aktiv: false, pris: 99, prisliste_id: "pl-gammel" }),
];
const LIVE_SVAR = [...NI, ...NABOER];

const katalog = findMateriale(SOURCE_PILOT.katalogId)!;
const nyPilotlinje = (s: SourcePilotStatus | undefined) =>
  anvendSourcePilot(materialeFraKatalog(katalog, { netto: 10, grundlag: "tegnestue" }), s);

describe("pilotens katalogpost", () => {
  it("er Oracal 651 Farver i 1260 mm pr. lbm med prototypepris 35 kr (Scandraft)", () => {
    expect(katalog.navn).toMatch(/651/);
    expect(katalog.breddeMm).toBe(1260);
    expect(katalog.enhed).toBe("lbm");
    expect(katalog.kostPrEnhed).toBe(35);
    expect(katalog.leverandoer).toBe("Scandraft");
  });
});

describe("afgør Source-prisen", () => {
  it("én entydig pris: bruges med prisversion, gyldighed og leverandør", () => {
    const s = afgoerPilotpris(LIVE_SVAR);
    expect(s).toEqual({
      slags: "entydig",
      leverandoerNavn: "Signcom Denmark ApS",
      pris: { prislisteId: PL, gyldigFra: "2026-10-20", leverandoerId: SIGNCOM, pris: 42.3216, prisenhed: "lbm" },
    });
  });

  it("numeric som tekst fra API'et læses som tal", () => {
    const s = afgoerPilotpris(NI.map((r) => ({ ...r, pris: "42.3216" })));
    expect(s.slags === "entydig" && s.pris.pris).toBe(42.3216);
  });

  it("ingen pris: tomt svar, eller gruppen uden pris → ingen Source-pris", () => {
    expect(afgoerPilotpris([]).slags).toBe("ingen_entydig");
    expect(afgoerPilotpris(NABOER).slags).toBe("ingen_entydig");
    expect(afgoerPilotpris(NI.map((r) => ({ ...r, pris: null, prisliste_id: null }))).slags).toBe("ingen_entydig");
  });

  it("en vare i gruppen uden pris → ikke entydig", () => {
    const s = afgoerPilotpris([...NI.slice(1), raekke({ vare_id: "farve-0", pris: null, prisliste_id: null })]);
    expect(s).toMatchObject({ slags: "ingen_entydig", grund: expect.stringMatching(/ikke alle varer/) });
  });

  it("flere leverandørpriser for samme vare → ingen leverandørvalg, ikke entydig", () => {
    const s = afgoerPilotpris([...NI, raekke({ vare_id: "farve-3", leverandoer_id: "scandraft", prisliste_id: "pl-2", pris: 40 })]);
    expect(s.slags).toBe("ingen_entydig");
  });

  it("en vare med egen variantpris (anden prisversion) → ikke entydig for gruppen", () => {
    const s = afgoerPilotpris([...NI.slice(1), raekke({ vare_id: "farve-0", prisliste_id: "pl-variant", pris: 45 })]);
    expect(s.slags).toBe("ingen_entydig");
  });

  it("rullepris → forbliver manuel (ingen omregning)", () => {
    const s = afgoerPilotpris(NI.map((r) => ({ ...r, salgsenhed: "rulle", prisenhed: "rulle", pris: 1490 })));
    expect(s).toMatchObject({ slags: "ingen_entydig", grund: expect.stringMatching(/rulle/) });
  });

  it("naborækker (Sort/hvid, uklassificeret 076, udgåede varer) påvirker ikke piloten", () => {
    expect(afgoerPilotpris(LIVE_SVAR)).toEqual(afgoerPilotpris(NI));
  });
});

describe("ny materialelinje", () => {
  const entydig = afgoerPilotpris(LIVE_SVAR);

  it("entydig: linjen får Source-prisen, leverandøren og prisversionen", () => {
    const l = nyPilotlinje(entydig);
    expect(l.kostPrEnhed).toBe(42.3216);
    expect(l.leverandoer).toBe("Signcom Denmark ApS");
    expect(l.sourcePris).toEqual({ prislisteId: PL, gyldigFra: "2026-10-20", leverandoerId: SIGNCOM, pris: 42.3216, prisenhed: "lbm" });
    expect(l.kostOverride).toBeNull();
  });

  it.each<[string, SourcePilotStatus | undefined]>([
    ["forbindelsesfejl", { slags: "fejl", besked: "Failed to fetch" }],
    ["stadig ved at hente", { slags: "henter" }],
    ["ingen entydig pris", { slags: "ingen_entydig", grund: "x" }],
    ["demo uden Source", undefined],
  ])("%s: prototypeprisen bruges som MANUEL — aldrig som Source-pris", (_, s) => {
    const l = nyPilotlinje(s);
    expect(l.kostPrEnhed).toBe(35);
    expect(l.leverandoer).toBe("Scandraft");
    expect(l.sourcePris).toBeNull();
  });

  it("andre katalogposter røres ikke (fx 651 Sort/hvid)", () => {
    const sh = materialeFraKatalog(findMateriale("oracal-651-sh")!);
    const l = anvendSourcePilot(sh, entydig);
    expect(l).toEqual(sh);
    expect("sourcePris" in l).toBe(false);
  });
});

describe("vælgerens prisvisning = den pris, linjen får", () => {
  const statusser: [string, SourcePilotStatus | undefined][] = [
    ["entydig", afgoerPilotpris(LIVE_SVAR)],
    ["fejl", { slags: "fejl", besked: "x" }],
    ["henter", { slags: "henter" }],
    ["ingen entydig", { slags: "ingen_entydig", grund: "x" }],
    ["demo", undefined],
  ];

  it.each(statusser)("%s: for HVER katalogpost viser vælgeren præcis linjens kostpris", (_, s) => {
    for (const k of materialekatalog) {
      expect(kostprisVedValg(k, s)).toBe(anvendSourcePilot(materialeFraKatalog(k), s).kostPrEnhed);
    }
  });

  it("entydig: 651 Farver vises med 42,3216; alle andre poster med uændret katalogpris", () => {
    const s = afgoerPilotpris(LIVE_SVAR);
    expect(kostprisVedValg(katalog, s)).toBe(42.3216);
    for (const k of materialekatalog.filter((m) => m.id !== SOURCE_PILOT.katalogId)) {
      expect(kostprisVedValg(k, s)).toBe(k.kostPrEnhed);
    }
  });

  it("manuel fallback: 651 Farver vises med prototypeprisen 35", () => {
    expect(kostprisVedValg(katalog, { slags: "fejl", besked: "x" })).toBe(35);
  });
});

describe("beregning med Source-prisen", () => {
  const entydig = afgoerPilotpris(LIVE_SVAR);

  it("materialelinjen regnes med 42,3216 kr/lbm + uændrede komponenter", () => {
    const kilde = nyPilotlinje(entydig);
    const manuel = nyPilotlinje({ slags: "fejl", besked: "x" });
    const bs = beregnMateriale(kilde);
    const bm = beregnMateriale(manuel);
    expect(bs.basisKost).toBe(42.3216);
    expect(bm.basisKost).toBe(35);
    expect(bs.komponentKost).toBe(bm.komponentKost);
    expect(bs.kalkuleretForbrug).toBe(bm.kalkuleretForbrug);
    expect(bs.kostTotal).toBeCloseTo((bs.kalkuleretForbrug as number) * (42.3216 + bs.komponentKost), 6);
    expect(bs.kostTotal - bm.kostTotal).toBeCloseTo((bs.kalkuleretForbrug as number) * (42.3216 - 35), 6);
    expect(bs.uafklaret).toBe(false);
  });

  it("override vinder stadig over Source-prisen, men Source-snapshottet bevares", () => {
    const l = { ...nyPilotlinje(entydig), kostOverride: 50 };
    expect(beregnMateriale(l).basisKost).toBe(50);
    expect(l.sourcePris?.pris).toBe(42.3216);
  });

  it("opsamlingens samlede kostpris flytter sig med prisforskellen + emballagetillægget (K134)", () => {
    const a = kalkulation({ materialer: [nyPilotlinje(entydig)] });
    const b = kalkulation({ materialer: [nyPilotlinje(undefined)] });
    const forbrug = beregnMateriale(a.materialer[0]).kalkuleretForbrug as number;
    const emballage = 1 + PROTOTYPE_REGELSAET.tillaeg.emballagePctAfMaterialekost / 100;
    expect(beregnOpsamling(a).samletKostpris - beregnOpsamling(b).samletKostpris).toBeCloseTo(
      forbrug * (42.3216 - 35) * emballage,
      6,
    );
  });
});

describe("snapshot i den gemte version", () => {
  const entydig = afgoerPilotpris(LIVE_SVAR);
  const manuelLinje = materiale({ id: "m-2", netto: 5, kostPrEnhed: 62 });

  it("gemmer pris, leverandør og Source-prisversion på linjen og tal der passer", () => {
    const k = kalkulation({ materialer: [nyPilotlinje(entydig), manuelLinje] });
    const v = lavVersionsdata(k);
    const l = v.indhold.materialer[0];
    expect(l.kostPrEnhed).toBe(42.3216);
    expect(l.leverandoer).toBe("Signcom Denmark ApS");
    expect(l.sourcePris?.prislisteId).toBe(PL);
    expect(v.samlet_kostpris).toBeCloseTo(beregnOpsamling(k).samletKostpris, 2);
  });

  it("versionens prisgrundlag siger Source for netop de linjer — ikke for resten", () => {
    const k = kalkulation({ materialer: [nyPilotlinje(entydig), manuelLinje] });
    expect(lavVersionsdata(k).regelsaet.prisgrundlag).toMatchObject({
      source: true, sourceLinjer: 1, manuelleLinjer: 1, sourcePrisversioner: [PL],
    });
  });

  it("fallback-linje giver uændret prisgrundlag: manuel, ikke Source", () => {
    const k = kalkulation({ materialer: [nyPilotlinje({ slags: "fejl", besked: "x" })] });
    expect(prisgrundlagFor(k)).toEqual(PRISGRUNDLAG_V1);
    expect(PRISGRUNDLAG_V1.source).toBe(false);
  });

  it("gemmes som JSON og genåbnes uændret — samme tal, samme snapshot", () => {
    const k = kalkulation({ materialer: [nyPilotlinje(entydig), manuelLinje] });
    const genaabnet = JSON.parse(JSON.stringify(lavVersionsdata(k).indhold));
    expect(erKalkulation(genaabnet)).toBe(true);
    expect(sammeIndhold(genaabnet, k)).toBe(true);
    expect(beregnOpsamling(genaabnet)).toEqual(beregnOpsamling(k));
  });
});

describe("eksisterende kalkulationer og skift", () => {
  it("en ældre gemt linje uden sourcePris er gyldig, uændret og manuel", () => {
    const gammel = materialeFraKatalog(katalog, { netto: 10 });
    delete (gammel as { sourcePris?: unknown }).sourcePris;
    const k = kalkulation({ materialer: [gammel] });
    const genaabnet = JSON.parse(JSON.stringify(k));
    expect(erKalkulation(genaabnet)).toBe(true);
    expect(genaabnet.materialer[0].kostPrEnhed).toBe(35);
    expect(prisgrundlagFor(genaabnet)).toEqual(PRISGRUNDLAG_V1);
  });

  it("et misdannet sourcePris-snapshot afvises af formkontrollen", () => {
    const l = nyPilotlinje(afgoerPilotpris(LIVE_SVAR));
    expect(erKalkulation(kalkulation({ materialer: [{ ...l, sourcePris: { ...l.sourcePris!, pris: 0 } }] }))).toBe(false);
    expect(erKalkulation(kalkulation({ materialer: [{ ...l, sourcePris: { pris: 42 } as never }] }))).toBe(false);
  });

  it("skift til anden prisgruppe nulstiller Source-markeringen og bruger prototypeprisen som manuel", () => {
    const l = nyPilotlinje(afgoerPilotpris(LIVE_SVAR));
    const sh = findMateriale("oracal-651-sh")!;
    const skiftet = { ...l, ...skiftTilKatalog(l, sh, false) };
    expect(skiftet.sourcePris).toBeNull();
    expect(skiftet.kostPrEnhed).toBe(sh.kostPrEnhed);
    expect(skiftet.leverandoer).toBe(sh.leverandoer);
  });
});
