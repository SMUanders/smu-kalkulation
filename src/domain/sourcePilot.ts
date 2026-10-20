// ============================================================================
// SMU Kalkulation — Source-pris for ORACAL 651 Farver (pilot, TR-100).
// ----------------------------------------------------------------------------
// Ren funktion, intet netværk. Afgør ud fra svaret fra Source-kontrakten
// source_kalkulation_priser, om der findes ÉN entydig gældende Source-pris for
// prototype-katalogets "Oracal 651 · Farver / Metallic · 1260 mm".
//
// Entydig = alle aktive Source-varer i 651 · Farver · 1260 mm har præcis én
// gældende pris, og det er samme prisversion, samme leverandør og prisen er
// pr. lbm (linjens enhed). Alt andet — ingen pris, flere leverandører,
// rullepris, tomt svar — giver INGEN Source-pris, og linjen beholder
// prototypeprisen som manuel. Der er ingen leverandørvalgsregel.
// ============================================================================

import type { Materialelinje, SourcePris } from "./typer";

/** Den ene katalogpost, piloten gælder, og dens Source-modstykke. */
export const SOURCE_PILOT = {
  katalogId: "oracal-651-farver",
  serie: "651",
  prisgruppe: "Farver",
  breddeMm: 1260,
  enhed: "lbm",
} as const;

/** De felter fra source_kalkulation_priser, piloten bruger. */
export interface SourceKontraktRaekke {
  vare_id: string;
  aktiv: boolean;
  serie: string | null;
  prisgruppe_navn: string | null;
  bredde_mm: number | null;
  leverandoer_id: string | null;
  leverandoer_navn: string | null;
  salgsenhed: string | null;
  pris: number | string | null;
  prisenhed: string | null;
  prisliste_id: string | null;
  gyldig_fra: string | null;
}

export type SourcePilotStatus =
  | { slags: "henter" }
  /** Forbindelses- eller adgangsfejl. Må aldrig blive til en Source-pris. */
  | { slags: "fejl"; besked: string }
  | { slags: "ingen_entydig"; grund: string }
  | { slags: "entydig"; pris: SourcePris; leverandoerNavn: string };

export function afgoerPilotpris(raekker: readonly SourceKontraktRaekke[]): SourcePilotStatus {
  const kandidater = raekker.filter(
    (r) =>
      r.aktiv === true &&
      r.serie === SOURCE_PILOT.serie &&
      r.prisgruppe_navn === SOURCE_PILOT.prisgruppe &&
      r.bredde_mm === SOURCE_PILOT.breddeMm,
  );
  const varer = new Set(kandidater.map((r) => r.vare_id));
  if (varer.size === 0) return { slags: "ingen_entydig", grund: "Source har ingen aktive varer i 651 Farver 1260 mm" };

  const medPris = kandidater.filter((r) => r.pris !== null);
  for (const v of varer) {
    const n = medPris.filter((r) => r.vare_id === v).length;
    if (n === 0) return { slags: "ingen_entydig", grund: "ikke alle varer i gruppen har en Source-pris" };
    if (n > 1) return { slags: "ingen_entydig", grund: "flere Source-priser for samme vare" };
  }

  const versioner = new Set(medPris.map((r) => r.prisliste_id));
  const leverandoerer = new Set(medPris.map((r) => r.leverandoer_id));
  if (versioner.size !== 1 || leverandoerer.size !== 1) {
    return { slags: "ingen_entydig", grund: "flere Source-priser i gruppen" };
  }

  const r = medPris[0];
  const pris = Number(r.pris);
  if (r.prisenhed !== SOURCE_PILOT.enhed || r.salgsenhed !== SOURCE_PILOT.enhed) {
    return { slags: "ingen_entydig", grund: `Source-prisen er pr. ${r.prisenhed ?? "?"}, ikke pr. lbm` };
  }
  if (!Number.isFinite(pris) || pris <= 0 || !r.prisliste_id || !r.gyldig_fra || !r.leverandoer_id) {
    return { slags: "ingen_entydig", grund: "Source-prisen er ufuldstændig" };
  }

  return {
    slags: "entydig",
    pris: {
      prislisteId: r.prisliste_id,
      gyldigFra: r.gyldig_fra,
      leverandoerId: r.leverandoer_id,
      pris,
      prisenhed: SOURCE_PILOT.enhed,
    },
    leverandoerNavn: r.leverandoer_navn ?? "",
  };
}

/** Gælder piloten for denne katalogpost/linje? */
function erPilot(x: { id?: string; katalogId?: string; breddeMm: number | null }): boolean {
  return (x.katalogId ?? x.id) === SOURCE_PILOT.katalogId && x.breddeMm === SOURCE_PILOT.breddeMm;
}

/**
 * Den kostpris, en NY linje fra katalogposten får — til materialevælgerens
 * eksisterende prisvisning, så vælgeren viser samme pris som linjen bliver regnet med.
 */
export function kostprisVedValg(
  k: { id: string; breddeMm: number | null; kostPrEnhed: number },
  status: SourcePilotStatus | undefined,
): number {
  return erPilot(k) && status?.slags === "entydig" ? status.pris.pris : k.kostPrEnhed;
}

/**
 * En NY materialelinje fra pilotens katalogpost får Source-prisen, hvis den er
 * entydig. Ellers returneres linjen uændret med prototypeprisen som manuel.
 */
export function anvendSourcePilot(linje: Materialelinje, status: SourcePilotStatus | undefined): Materialelinje {
  if (!erPilot(linje)) return linje;
  if (!status || status.slags !== "entydig") return { ...linje, sourcePris: null };
  return {
    ...linje,
    leverandoer: status.leverandoerNavn,
    kostPrEnhed: status.pris.pris,
    sourcePris: status.pris,
  };
}
