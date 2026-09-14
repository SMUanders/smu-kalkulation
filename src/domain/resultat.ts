// ============================================================================
// SMU Kalkulation — beregningsresultat
// Hvad prismotoren leverer. Resultatet er afledt og gemmes ikke i dette trin.
// ============================================================================

export interface MaterialeBeregning {
  bufferPct: number;
  /** Forbrug efter buffer og afrunding — eller override. null = ikke taget stilling. */
  kalkuleretForbrug: number | null;
  erOverstyret: boolean;
  /** Materialets egen kostpris pr. enhed, uden komponenter. */
  basisKost: number;
  /** Sum af aktive komponenter pr. enhed (laminat, ink, applikationsfolie). */
  komponentKost: number;
  /** basisKost + komponentKost — det der reelt regnes med. */
  effektivKostPrEnhed: number;
  /** true når kostprisen er manuelt overstyret på denne kalkulation. */
  kostErOverstyret: boolean;
  kostTotal: number;
  uafklaret: boolean;
  afrundTrin: number | null;
}

export interface ArbejdeBeregning {
  kalkuleretTid: number | null;
  kostPrTime: number;
  kostErOverstyret: boolean;
  kost: number;
  /** Ingen faglig vurdering endnu. */
  uafklaret: boolean;
}

/** Hvilken avancegruppe i Excel havner en øvrig post i? */
export type Avancegruppe = "varer" | "eksternt" | "presenning" | "ingen" | "fast_salg";

export interface OevrigBeregning {
  kost: number;
  gruppe: Avancegruppe;
  uafklaret: boolean;
  /** Posten afregnes efter regning uden estimat — indgår ikke i prisen. */
  efterRegningUdenEstimat: boolean;
  /** Kun sat for type = fast_salgspris. */
  fastSalgspris: number;
}

/** Samlet prisopsamling — spejler Excel-arkets rækker K121–K137. */
export interface Opsamling {
  antalEnheder: number;

  /** K121 */ arbejdskost: number;
  /** K122 */ arbejdsavance: number;
  /** K123 */ arbejdssalg: number;
  antalTimer: number;

  /** K124 */ materialekost: number;
  /** K125 */ emballagetillaeg: number;
  /** K126 */ materialeavance: number;
  /** K127 */ materialesalg: number;

  /** K128 */ presenningkost: number;
  /** K129 */ presenningavance: number;

  /** K131 */ eksternkost: number;
  /** K132 */ eksternavance: number;

  /** Fragt og andre poster uden avance (K117:K118). */
  fragtkost: number;
  /** K119 — fast opstart/fakturering, indgår i kostgrundlaget. */
  fastOpstart: number;
  /** Manuelt fastsatte salgspriser (findes ikke i Excel — lægges oven på). */
  fastSalg: number;

  /** K134 */ samletKostpris: number;
  /** K135 */ samletAvance: number;
  /** K136 */ energitillaeg: number;
  /** K137 */ totalSalgspris: number;
  totalPrEnhed: number;

  kundevendtPrEnhed: number;
  kundevendtSamlet: number;
  erManueltPrissat: boolean;

  /** Forventet DB/DG ved den beregnede pris. */
  forventetDb: number;
  forventetDg: number | null;
  /** Forventet DB/DG ved den valgte kundevendte pris (Excel K139/K140). */
  valgtDb: number;
  valgtDg: number | null;
  /** Excel K140: difference mellem valgt og beregnet pris. */
  differenceTilBeregnet: number;

  antalUafklarede: number;
}
