// ============================================================================
// SMU Kalkulation — fra kalkulation til gemt version (ren funktion).
// ----------------------------------------------------------------------------
// Ingen React og intet netværk. Prismotoren kaldes uændret; her bestemmes kun,
// hvad en version gemmer: hele dokumentet, et snapshot af regelsættet,
// prismotorens opsamling og de hævede nøgletal, OS senere læser.
// ============================================================================

import { beregnOpsamling } from "./beregning";
import { DG_STANDARD, PROTOTYPE_REGELSAET, type Regelsaet } from "./konfiguration";
import type { Opsamling } from "./resultat";
import type { Kalkulation } from "./typer";

/**
 * Prisgrundlaget i v1 er ærligt markeret: kostpriserne er manuelle — aflæst fra
 * prototype-kataloget eller tastet — og kommer IKKE fra SMU Source (TR-057).
 * Markeringen gemmes i hver version, så en gemt kalkulation aldrig kan forveksles
 * med en Source-baseret.
 */
export const PRISGRUNDLAG_V1 = {
  kilde: "manuel_prototype_katalog",
  source: false,
  note: "Kostpriser er manuelle (prototype-katalog eller tastet) — ikke hentet fra SMU Source.",
} as const;

/** Visningsfelter for sagen. Ejes af SMU OS; kopieres kun som snapshot i dokumentet. */
export interface SagHoved {
  smuNummer: string;
  kundeNavn: string;
  titel: string;
  tegningsNummer: string;
}

/** En tom kalkulation til en OS-sag. */
export function nyKalkulation(id: string, sag: SagHoved): Kalkulation {
  return {
    id,
    smuNr: sag.smuNummer,
    kunde: sag.kundeNavn,
    sag: sag.titel,
    tegningsNr: sag.tegningsNummer,
    antalEnheder: 1,
    enhedsnavn: "stk",
    daekningsgrader: { ...DG_STANDARD },
    kundevendtPrEnhed: null,
    materialer: [],
    arbejde: [],
    oevrige: [],
  };
}

/** Kolonnerne i kalk_versioner, som en gemning skriver. */
export interface Versionsdata {
  indhold: Kalkulation;
  regelsaet: Record<string, unknown>;
  resultat: Opsamling;
  samlet_kostpris: number;
  total_salgspris: number;
  /** Den kundevendte, valgte salgspris — det resultat OS senere skal bruge. */
  kundevendt_samlet: number;
  /** DG i procent ved den kundevendte pris. null, hvis den ikke kan beregnes. */
  forventet_dg: number | null;
}

const kr2 = (n: number) => Math.round(n * 100) / 100;

/** forventet_dg er numeric(7,3) i databasen. Urealistiske værdier gemmes som null. */
function dgTilKolonne(dg: number | null): number | null {
  if (dg === null || !Number.isFinite(dg) || Math.abs(dg) >= 9999) return null;
  return Math.round(dg * 1000) / 1000;
}

export function lavVersionsdata(
  kalk: Kalkulation,
  regelsaet: Readonly<Regelsaet> = PROTOTYPE_REGELSAET,
): Versionsdata {
  const op = beregnOpsamling(kalk, regelsaet);
  return {
    indhold: kalk,
    regelsaet: { ...regelsaet, prisgrundlag: PRISGRUNDLAG_V1 },
    resultat: op,
    samlet_kostpris: kr2(op.samletKostpris),
    total_salgspris: kr2(op.totalSalgspris),
    kundevendt_samlet: kr2(op.kundevendtSamlet),
    forventet_dg: dgTilKolonne(op.valgtDg),
  };
}

/**
 * Har et gemt dokument kalkulationens form? Indhold fra databasen kontrolleres,
 * før det gives til prismotoren, så et ufuldstændigt eller fremmed dokument giver
 * en forståelig fejl i stedet for en hvid side.
 */
export function erKalkulation(x: unknown): x is Kalkulation {
  if (!x || typeof x !== "object") return false;
  const k = x as Record<string, unknown>;
  const dg = k.daekningsgrader as Record<string, unknown> | undefined;
  const tal = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  return (
    typeof k.id === "string" &&
    tal(k.antalEnheder) &&
    typeof k.enhedsnavn === "string" &&
    !!dg && tal(dg.timer) && tal(dg.varer) && tal(dg.presenning) && tal(dg.eksternt) &&
    (k.kundevendtPrEnhed === null || tal(k.kundevendtPrEnhed)) &&
    Array.isArray(k.materialer) &&
    k.materialer.every(
      (m: Record<string, unknown>) =>
        m && typeof m.id === "string" && typeof m.form === "string" && Array.isArray(m.komponenter),
    ) &&
    Array.isArray(k.arbejde) &&
    Array.isArray(k.oevrige)
  );
}

/** Er to kalkulationer indholdsmæssigt ens? Bruges til "ikke gemte ændringer". */
export function sammeIndhold(a: Kalkulation, b: Kalkulation): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
