// ============================================================================
// Linjefabrik — bygger kalkulationslinjer ud fra katalogerne.
// Både materialevælgeren i UI og demodata går gennem de samme funktioner,
// så demo og daglig brug altid giver identisk struktur.
// ============================================================================

import { findMateriale, visningsnavn, type Katalogmateriale } from "./materialekatalog";
import { findProces, STANDARD_KOST_PR_TIME } from "../domain/processer";
import type { Arbejdslinje, Komponentlinje, Materialelinje, Oevriglinje } from "../domain/typer";

let taeller = 0;
export function nytId(praefiks = "l"): string {
  taeller += 1;
  return `${praefiks}${taeller}`;
}

/** Byg en komponentlinje ud fra et katalogmateriale. */
export function komponentFraKatalog(
  katalogId: string,
  autoForeslaaet: boolean,
): Komponentlinje | null {
  const k = findMateriale(katalogId);
  if (!k) return null;
  return {
    id: nytId("k"),
    katalogId: k.id,
    navn: visningsnavn(k),
    leverandoer: k.leverandoer,
    kostPrEnhed: k.kostPrEnhed,
    prisErPrM2: k.prisErPrM2 === true,
    aktiv: true,
    autoForeslaaet,
  };
}

/**
 * Byg en materialelinje ud fra et katalogvalg.
 * Sikre materialeafhængigheder fra `foreslaar` tilføjes som AKTIVE
 * komponenter på linjen — ikke som selvstændige hovedlinjer. Det er det,
 * der forhindrer dobbeltoptælling, når brugeren i stedet vælger en
 * færdig kombination hvor laminat og ink allerede er i prisen.
 */
export function materialeFraKatalog(
  k: Katalogmateriale,
  felter: Partial<Materialelinje> = {},
): Materialelinje {
  const komponenter = (k.foreslaar ?? [])
    .map((id) => komponentFraKatalog(id, true))
    .filter((x): x is Komponentlinje => x !== null);

  return {
    id: nytId("m"),
    katalogId: k.id,
    beskrivelse: k.navn,
    prisgruppe: k.prisgruppe,
    farvekode: "",
    farvenavn: "",
    breddeMm: k.breddeMm,
    form: k.form,
    grundlag: "uafklaret",
    netto: null,
    bufferPct: null,
    overrideForbrug: null,
    enhed: k.enhed,
    leverandoer: k.leverandoer,
    kostPrEnhed: k.kostPrEnhed,
    kostOverride: null,
    komponenter,
    gentagelse: "engang",
    note: "",
    ...felter,
  };
}

/**
 * Flyt en eksisterende linje til en anden katalogvare — ved skift af
 * prisgruppe eller bredde. Forbrug, grundlag, note, serie og overrides
 * bevares. Foreslåede komponenter genberegnes til den nye vare (fx 215G i
 * den nye bredde), men deres til/fra-status bevares pr. kategori. Har
 * brugeren selv skiftet en komponent i en kategori, foreslås der ikke en
 * ny i samme kategori — ellers kunne applikationsfolie komme med to gange.
 */
export function skiftTilKatalog(
  linje: Materialelinje,
  ny: Katalogmateriale,
  beholdFarve: boolean,
): Partial<Materialelinje> {
  const kategori = (katalogId: string) => findMateriale(katalogId)?.kategori;
  const manuelle = linje.komponenter.filter((k) => !k.autoForeslaaet);
  const manuelleKategorier = new Set(manuelle.map((k) => kategori(k.katalogId)));

  const foreslaaede = (ny.foreslaar ?? [])
    .map((id) => komponentFraKatalog(id, true))
    .filter((k): k is Komponentlinje => k !== null)
    .filter((k) => !manuelleKategorier.has(kategori(k.katalogId)))
    .map((k) => {
      const gammel = linje.komponenter.find(
        (g) => g.autoForeslaaet && kategori(g.katalogId) === kategori(k.katalogId),
      );
      return gammel ? { ...k, aktiv: gammel.aktiv } : k;
    });

  return {
    katalogId: ny.id,
    beskrivelse: ny.navn,
    prisgruppe: ny.prisgruppe,
    breddeMm: ny.breddeMm,
    form: ny.form,
    enhed: ny.enhed,
    leverandoer: ny.leverandoer,
    kostPrEnhed: ny.kostPrEnhed,
    komponenter: [...foreslaaede, ...manuelle],
    ...(beholdFarve ? {} : { farvekode: "", farvenavn: "" }),
  };
}

/** Materialelinje uden katalogtilknytning — bruges kun når intet passer. */
export function friMaterialelinje(): Materialelinje {
  return {
    id: nytId("m"),
    katalogId: "",
    beskrivelse: "",
    prisgruppe: "",
    farvekode: "",
    farvenavn: "",
    breddeMm: null,
    form: "rulle",
    grundlag: "uafklaret",
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
  };
}

export function arbejdeFraKatalog(
  katalogId: string,
  felter: Partial<Arbejdslinje> = {},
): Arbejdslinje {
  const p = findProces(katalogId);
  return {
    id: nytId("a"),
    katalogId: p ? p.id : "",
    proces: p ? p.navn : "",
    fagligtEstimat: null,
    risikoTillaeg: null,
    kostPrTime: p ? p.kostPrTime : STANDARD_KOST_PR_TIME,
    kostOverride: null,
    gentagelse: "engang",
    note: "",
    ...felter,
  };
}

export function friArbejdslinje(): Arbejdslinje {
  return {
    id: nytId("a"),
    katalogId: "",
    proces: "",
    fagligtEstimat: null,
    risikoTillaeg: null,
    kostPrTime: STANDARD_KOST_PR_TIME,
    kostOverride: null,
    gentagelse: "engang",
    note: "",
  };
}

export function tomOevrig(felter: Partial<Oevriglinje> = {}): Oevriglinje {
  return {
    id: nytId("o"),
    type: "ekstern_vare",
    beskrivelse: "",
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
