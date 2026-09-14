// Små fabrikker til testene. Bruges kun af *.test.ts og bygger linjer direkte
// med eksplicitte tal — testene afhænger ikke af prototype-kataloget.

import { DG_STANDARD } from "./konfiguration";
import type { Arbejdslinje, Kalkulation, Komponentlinje, Materialelinje, Oevriglinje } from "./typer";

export function materiale(felter: Partial<Materialelinje> = {}): Materialelinje {
  return {
    id: "m",
    katalogId: "",
    beskrivelse: "Testmateriale",
    prisgruppe: "",
    farvekode: "",
    farvenavn: "",
    breddeMm: null,
    form: "rulle",
    grundlag: "tegnestue",
    netto: null,
    bufferPct: null,
    overrideForbrug: null,
    enhed: "lbm",
    leverandoer: "",
    kostPrEnhed: null,
    kostOverride: null,
    komponenter: [],
    gentagelse: "engang",
    note: "",
    ...felter,
  };
}

export function komponent(felter: Partial<Komponentlinje> = {}): Komponentlinje {
  return {
    id: "k",
    katalogId: "",
    navn: "Testkomponent",
    leverandoer: "",
    kostPrEnhed: 0,
    prisErPrM2: false,
    aktiv: true,
    autoForeslaaet: true,
    ...felter,
  };
}

export function arbejde(felter: Partial<Arbejdslinje> = {}): Arbejdslinje {
  return {
    id: "a",
    katalogId: "",
    proces: "Testproces",
    fagligtEstimat: null,
    risikoTillaeg: null,
    kostPrTime: null,
    kostOverride: null,
    gentagelse: "engang",
    note: "",
    ...felter,
  };
}

export function oevrig(felter: Partial<Oevriglinje> = {}): Oevriglinje {
  return {
    id: "o",
    type: "ekstern_vare",
    beskrivelse: "Testpost",
    leverandoer: "",
    antal: 1,
    enhed: "stk",
    kostPrEnhed: null,
    fastSalgspris: null,
    gentagelse: "engang",
    note: "",
    ...felter,
  };
}

export function kalkulation(felter: Partial<Kalkulation> = {}): Kalkulation {
  return {
    id: "test",
    smuNr: "",
    kunde: "",
    sag: "",
    tegningsNr: "",
    antalEnheder: 1,
    enhedsnavn: "stk",
    daekningsgrader: { ...DG_STANDARD },
    kundevendtPrEnhed: null,
    materialer: [],
    arbejde: [],
    oevrige: [],
    ...felter,
  };
}
