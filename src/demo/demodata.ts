// ============================================================================
// SMU Kalkulation — demodata (prototype v0.3)
// ----------------------------------------------------------------------------
// Materialer og processer hentes fra katalogerne, som igen er aflæst fra
// "SMU Kalkulation Master.xlsm". Demodata opfinder derfor hverken priser,
// leverandører eller procesnavne.
//
// Platformkonventioner (verificeret mod smu-os-v2):
//   SMU-nummer   "SMU-" + 4 cifre   → generer_smu_nummer(), src/lib/sagsmappe.ts
//   Tegningsnr.  rent heltal        → tegninger.hoved_nummer (sekvens fra 10900)
//   Løsningstype fra losningstyper  → Folie + print kombi, Pladeløsning, …
//   Kunder       testdata-stil      → realistiske danske firmanavne
// ============================================================================

import { findMateriale } from "./materialekatalog";
import {
  arbejdeFraKatalog,
  friArbejdslinje,
  materialeFraKatalog,
  nytId,
  tomOevrig,
} from "./linjefabrik";
import { DG_STANDARD } from "../domain/konfiguration";
import type { Kalkulation, Materialelinje } from "../domain/typer";

/** Hjælper: byg demo-materialelinje fra katalog-id. */
function mat(katalogId: string, felter: Partial<Materialelinje>): Materialelinje {
  const k = findMateriale(katalogId);
  if (!k) throw new Error(`Ukendt katalogmateriale i demodata: ${katalogId}`);
  return materialeFraKatalog(k, felter);
}

// ---------------------------------------------------------------------------
// Case 1 — Mercedes Citan (primær UX-case)
// ---------------------------------------------------------------------------

const citan: Kalkulation = {
  id: "citan",
  smuNr: "SMU-0187",
  kunde: "Dalsgaard Maskiner ApS",
  sag: "Mercedes Citan — folie + print kombi",
  tegningsNr: "10917",
  antalEnheder: 1,
  enhedsnavn: "bil",
  daekningsgrader: { ...DG_STANDARD },
  kundevendtPrEnhed: null,
  materialer: [
    // Wrap — estimeret forbrug, ingen applikationsfolie foreslået
    mat("avery-supreme", {
      farvekode: "CB152",
      farvenavn: "blå",
      grundlag: "estimat",
      netto: 22.5,
      note: "Forbrug foreløbig estimeret — ikke opmålt på tegning endnu",
    }),
    // Skærefolie med prisgruppe som prisgrundlag + kendt farvekode
    mat("oracal-751-sh", {
      farvekode: "010",
      farvenavn: "hvid",
      grundlag: "tegnestue",
      netto: 2.025,
    }),
    mat("oracal-751-farver", {
      farvekode: "063",
      farvenavn: "lysegrøn",
      grundlag: "tegnestue",
      netto: 0.37,
    }),
    // Færdig print-kombination: laminat OG ink er med i prisen
    mat("orajet-3551-215g-ink", {
      grundlag: "uafklaret",
      netto: null,
      note: "Bagdøre — afventer printmål fra tegnestue",
    }),
  ],
  arbejde: [
    arbejdeFraKatalog("lay-out"),
    arbejdeFraKatalog("print"),
    arbejdeFraKatalog("skaerestue", {
      fagligtEstimat: 1,
      note: "Marie vurderede konkret opgaven til 1 time",
    }),
    arbejdeFraKatalog("montering", {
      proces: "Montering — tekst/logo",
      fagligtEstimat: 2.5,
    }),
    arbejdeFraKatalog("montering", {
      proces: "Montering — print bagdøre",
      fagligtEstimat: 1.5,
    }),
    friArbejdslinje(),
  ],
  oevrige: [
    tomOevrig({
      type: "fragt",
      beskrivelse: "Fragt uden avance",
      leverandoer: "Scandraft",
      antal: 1,
      enhed: "stk",
      kostPrEnhed: 275,
      note: "Fragtpris indhentes fra leverandør og tastes manuelt",
    }),
  ],
};

// Wrap findes ikke som timepost i Excel — den bygges som fri linje.
citan.arbejde[5] = {
  ...citan.arbejde[5],
  id: nytId("a"),
  proces: "Wrap",
  fagligtEstimat: 16,
  risikoTillaeg: 7.5,
  note: "Fagligt estimat 16 t + separat risikotillæg 7,5 t = 23,5 t",
};

// ---------------------------------------------------------------------------
// Case 2 — Facadeskiltning (pladeløsning)
// ---------------------------------------------------------------------------

const facade: Kalkulation = {
  id: "facade",
  smuNr: "SMU-0193",
  kunde: "Ibsen Entreprise A/S",
  sag: "Facadeskiltning — pladeløsning",
  tegningsNr: "10924",
  antalEnheder: 1,
  enhedsnavn: "facade",
  daekningsgrader: { ...DG_STANDARD },
  kundevendtPrEnhed: null,
  materialer: [
    mat("ibond-3mm", {
      grundlag: "tegnestue",
      netto: 2,
      note: "Plader får ikke automatisk materialebuffer",
    }),
    mat("oracal-751-sh", {
      farvekode: "070",
      farvenavn: "sort",
      grundlag: "tegnestue",
      netto: 4.8,
    }),
  ],
  arbejde: [
    arbejdeFraKatalog("lay-out", {
      fagligtEstimat: 3.5,
      note: "Godkendelsesrunde med kunde forventes",
    }),
    arbejdeFraKatalog("fraes", { fagligtEstimat: 1.5 }),
    arbejdeFraKatalog("skaerestue", { fagligtEstimat: 2 }),
    arbejdeFraKatalog("montering", {
      proces: "Montering — on site",
      note: "Afklares når adgangsforhold er kendt",
    }),
  ],
  oevrige: [
    tomOevrig({
      type: "ekstern_vare",
      beskrivelse: "Facadebogstaver, profil 3, lysende",
      leverandoer: "Menden Buchstaben",
      antal: 1,
      enhed: "stk",
      kostPrEnhed: 18400,
      note: "Tilbud indhentet — leveringstid 4 uger",
    }),
    tomOevrig({
      type: "ekstern_ydelse",
      beskrivelse: "Lift, 2 dage",
      leverandoer: "Liftudlejning",
      antal: 2,
      enhed: "stk",
      kostPrEnhed: 2200,
      note: "DG på eksternt arbejde er ikke afklaret",
    }),
    tomOevrig({
      type: "efter_regning",
      beskrivelse: "Montering on site — afregnes efter regning",
      leverandoer: "",
      antal: null,
      kostPrEnhed: null,
      note: "Ingen estimat — indgår bevidst ikke i prisen",
    }),
    tomOevrig({
      type: "fragt",
      beskrivelse: "Fragt uden avance",
      leverandoer: "Menden Buchstaben",
      antal: 1,
      enhed: "stk",
      kostPrEnhed: 1450,
    }),
  ],
};

// ---------------------------------------------------------------------------
// Case 3 — Trailerdekoration i serie (75 enheder)
// ---------------------------------------------------------------------------

const serie: Kalkulation = {
  id: "serie",
  smuNr: "SMU-0204",
  kunde: "Grønbæk Spedition A/S",
  sag: "Trailerdekoration — digitaltryk + laminat, serie",
  tegningsNr: "10931",
  antalEnheder: 75,
  enhedsnavn: "trailer",
  daekningsgrader: { ...DG_STANDARD },
  kundevendtPrEnhed: null,
  materialer: [
    mat("orajet-3551-215g-ink", {
      grundlag: "tegnestue",
      netto: 6.4,
      gentagelse: "pr_enhed",
      note: "Forbrug pr. trailer",
    }),
    mat("oracal-751-sh", {
      farvekode: "010",
      farvenavn: "hvid",
      grundlag: "tegnestue",
      netto: 1.15,
      gentagelse: "pr_enhed",
      note: "Tekst og nummer",
    }),
  ],
  arbejde: [
    arbejdeFraKatalog("lay-out", {
      fagligtEstimat: 6,
      note: "Laves én gang for hele serien",
    }),
    arbejdeFraKatalog("print", { fagligtEstimat: 0.6, gentagelse: "pr_enhed" }),
    arbejdeFraKatalog("skaerestue", { fagligtEstimat: 0.4, gentagelse: "pr_enhed" }),
    arbejdeFraKatalog("montering", {
      fagligtEstimat: 2.5,
      risikoTillaeg: 0.25,
      gentagelse: "pr_enhed",
    }),
  ],
  oevrige: [
    tomOevrig({
      type: "fragt",
      beskrivelse: "Fragt uden avance — samlet for serien",
      leverandoer: "Scandraft",
      antal: 1,
      enhed: "stk",
      kostPrEnhed: 3200,
    }),
  ],
};

export const demoKalkulationer: Kalkulation[] = [citan, facade, serie];

export const demoEtiketter: Record<string, string> = {
  citan: "SMU-0187 · Mercedes Citan — folie + print kombi",
  facade: "SMU-0193 · Facadeskiltning — pladeløsning",
  serie: "SMU-0204 · Trailerdekoration — serie, 75 enheder",
};

export const demoNavne: Record<string, string> = {
  citan: "Mercedes Citan",
  facade: "Facadeskiltning",
  serie: "Trailerdekoration",
};

/** Dyb kopi, så hver visning starter fra ren demo-tilstand. */
export function kopiér<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * Frisk kopi af den oprindelige demo-case.
 * Dette er den ENESTE kilde til nulstilling — UI'et må aldrig kende
 * demo-værdierne selv.
 */
export function hentOriginal(id: string): Kalkulation | undefined {
  const fundet = demoKalkulationer.find((k) => k.id === id);
  return fundet ? kopiér(fundet) : undefined;
}

/** Afviger den aktuelle kalkulation fra sin oprindelige demo-definition? */
export function erAendret(kalk: Kalkulation): boolean {
  const original = demoKalkulationer.find((k) => k.id === kalk.id);
  if (!original) return true;
  return JSON.stringify(kalk) !== JSON.stringify(original);
}
