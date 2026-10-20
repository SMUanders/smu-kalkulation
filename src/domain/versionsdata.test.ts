import { describe, expect, it } from "vitest";
import { beregnOpsamling } from "./beregning";
import { PROTOTYPE_REGELSAET } from "./konfiguration";
import { arbejde, kalkulation, materiale } from "./testfabrik";
import { lavVersionsdata, nyKalkulation, PRISGRUNDLAG_V1, sammeIndhold } from "./versionsdata";
import { nytId } from "../demo/linjefabrik";

const sag = { smuNummer: "SMU-0002", kundeNavn: "Fiktiv Transport A/S", titel: "Bildekoration", tegningsNummer: "" };

describe("ny kalkulation til en OS-sag", () => {
  it("er tom, bruger standard-DG og viser sagens felter", () => {
    const k = nyKalkulation("id-1", sag);
    expect(k.id).toBe("id-1");
    expect(k.smuNr).toBe("SMU-0002");
    expect(k.materialer).toEqual([]);
    expect(k.daekningsgrader.timer).toBe(PROTOTYPE_REGELSAET.daekningsgrad.timer.standard);
    expect(k.kundevendtPrEnhed).toBeNull();
  });
});

describe("versionsdata", () => {
  const kalk = kalkulation({
    materialer: [materiale({ netto: 8, kostPrEnhed: 62 })],
    arbejde: [arbejde({ fagligtEstimat: 2, kostPrTime: 275 })],
  });

  it("bruger prismotoren uændret — nøgletallene er motorens tal", () => {
    const v = lavVersionsdata(kalk);
    const op = beregnOpsamling(kalk);
    expect(v.resultat).toEqual(op);
    expect(v.samlet_kostpris).toBeCloseTo(op.samletKostpris, 2);
    expect(v.total_salgspris).toBeCloseTo(op.totalSalgspris, 2);
  });

  it("kundevendt_samlet er den valgte kundevendte pris, når den er sat", () => {
    const v = lavVersionsdata({ ...kalk, kundevendtPrEnhed: 2000 });
    expect(v.kundevendt_samlet).toBe(2000);
    expect(v.forventet_dg).not.toBeNull();
  });

  it("uden valgt pris er kundevendt_samlet den beregnede total", () => {
    const v = lavVersionsdata(kalk);
    expect(v.kundevendt_samlet).toBeCloseTo(beregnOpsamling(kalk).totalSalgspris, 2);
  });

  it("markerer altid prisgrundlaget som manuelt, ikke Source", () => {
    const v = lavVersionsdata(kalk);
    expect(v.regelsaet.prisgrundlag).toEqual(PRISGRUNDLAG_V1);
    expect(PRISGRUNDLAG_V1.source).toBe(false);
    expect(v.regelsaet.id).toBe(PROTOTYPE_REGELSAET.id);
  });

  it("gemmer en urealistisk DG som null i stedet for at sprænge kolonnen", () => {
    const v = lavVersionsdata({ ...kalk, kundevendtPrEnhed: 0.01 });
    expect(v.forventet_dg).toBeNull();
  });

  it("indholdet kan gemmes som JSON og genåbnes uændret", () => {
    const v = lavVersionsdata(kalk);
    const genaabnet = JSON.parse(JSON.stringify(v.indhold));
    expect(sammeIndhold(genaabnet, kalk)).toBe(true);
    expect(beregnOpsamling(genaabnet)).toEqual(beregnOpsamling(kalk));
  });
});

describe("ikke gemte ændringer", () => {
  it("opdager en ændring og ignorerer en kopi", () => {
    const a = kalkulation({ materialer: [materiale({ netto: 8 })] });
    expect(sammeIndhold(a, JSON.parse(JSON.stringify(a)))).toBe(true);
    expect(sammeIndhold(a, { ...a, antalEnheder: 2 })).toBe(false);
  });
});

describe("linje-id'er", () => {
  it("er unikke på tværs af sideindlæsninger (ingen tæller, der starter forfra)", () => {
    const ider = new Set(Array.from({ length: 500 }, () => nytId("l")));
    expect(ider.size).toBe(500);
    expect(nytId("k")).toMatch(/^k-[0-9a-f-]{36}$/);
  });
});
