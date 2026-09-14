// ============================================================================
// SMU Kalkulation — domænetyper
// ----------------------------------------------------------------------------
// Kalkulationens egne linjer og dokument, som prismotoren og UI'et bruger dem.
// Typerne er IKKE et databaseschema. Persistens, Source-referencer og
// snapshotfelter designes i næste trin (TR-057, TR-062).
//
// Adskillelsen i koden:
//   domain/typer.ts          kalkulationslinjer og kalkulationsdokument (her)
//   domain/resultat.ts       beregningsresultat
//   domain/konfiguration.ts  beregningsregler som typet regelsæt
//   domain/processer.ts      arbejdsprocesser og timesatser (Kalkulation-ejet)
//   demo/                    prototype-katalogdata og demo-kalkulationer
// ============================================================================

// ---------------------------------------------------------------------------
// Fælles begreber
// ---------------------------------------------------------------------------

/** Hvor kommer forbrugstallet fra? Samme felt skal senere kunne udfyldes af CorelDraw-import. */
export type Grundlag =
  | "tegnestue"      // målt/beregnet i tegnestuen
  | "estimat"        // fagligt skøn, endnu ikke målt
  | "manuelt"        // tastet direkte
  | "coreldraw"      // FREMTID: struktureret import fra CorelDraw
  | "uafklaret";     // der er ikke taget stilling endnu

export const grundlagTekst: Record<Grundlag, string> = {
  tegnestue: "Fra tegnestue",
  estimat: "Estimat",
  manuelt: "Manuelt",
  coreldraw: "CorelDraw",
  uafklaret: "Ikke taget stilling",
};

/** Materialets fysiske form afgør buffer-/afrundingsregel. Rulle ≠ plade. */
export type Materialeform = "rulle" | "plade" | "stk" | "andet";

/**
 * Enheder følger platformens eksisterende værdier — der opfindes ingen nye.
 * Kilder: `prisbibliotek.enhed` i smu-os-v2, `source_varer_basis_enhed_check`
 * (lbm, m2, stk, liter) og Excel-arkets enhedskolonne.
 */
export type Enhed = "lbm" | "m2" | "stk" | "liter";

export const enhedTekst: Record<Enhed, string> = {
  lbm: "lbm",
  m2: "m²",
  stk: "stk",
  liter: "liter",
};

/** En post regnes enten én gang for hele opgaven, eller pr. produceret enhed. */
export type Gentagelse = "engang" | "pr_enhed";

// ---------------------------------------------------------------------------
// Materialelinjer og komponentlinjer
// ---------------------------------------------------------------------------

/**
 * En komponent i en materialepakke — fx laminat, ink eller applikationsfolie.
 * Komponenten ligger PÅ hovedlinjen og følger dens kalkulerede forbrug, så den
 * ikke kan tælles med to gange.
 */
export interface Komponentlinje {
  id: string;
  /** Id i prototype-kataloget. Erstattes af en Source-reference i persistenstrinnet. */
  katalogId: string;
  navn: string;
  leverandoer: string;
  kostPrEnhed: number;
  /**
   * Ink prissættes pr. m² og omregnes til lbm ved at gange med banebredden
   * — præcis som Excel gør det (`I49 = I56 + I71 + G90*1,37`).
   */
  prisErPrM2: boolean;
  /** Brugeren kan slå en foreslået komponent fra uden at slette den. */
  aktiv: boolean;
  /** true når komponenten kom fra en sikker materialeafhængighed. */
  autoForeslaaet: boolean;
}

export interface Materialelinje {
  id: string;
  /** Id i prototype-kataloget — tom for frie linjer. Erstattes af en Source-reference. */
  katalogId: string;
  beskrivelse: string;
  /** Prisgruppe, fx "Farver" eller "Sort/hvid". Ejes af Source på variantniveau (TR-058). */
  prisgruppe: string;
  /**
   * Konkret farvekode, fx "050". VALGFRI: kalkulationen behøver den ikke, når
   * prisgruppen giver prisen. Den er produktionsinformation.
   */
  farvekode: string;
  /** Visningsnavn for farven, fx "mørkeblå". Tom når ingen farve er valgt. */
  farvenavn: string;
  /** Banebredde i mm. Central for kalkulatørens forbrugsvurdering. */
  breddeMm: number | null;
  form: Materialeform;
  grundlag: Grundlag;
  /** Rent nettoforbrug uden spild/buffer. null = ikke taget stilling. */
  netto: number | null;
  /** Buffer i procent. null = brug reglen der følger med materialeformen. */
  bufferPct: number | null;
  /** Sætter brugeren et tal her, vinder det over den beregnede værdi. */
  overrideForbrug: number | null;
  enhed: Enhed;
  leverandoer: string;
  /** Kostpris fra prisgrundlaget — låst i normalvisning. */
  kostPrEnhed: number | null;
  /** Eksplicit override af kostprisen. Gælder KUN denne kalkulation. */
  kostOverride: number | null;
  /** Komponenter der indgår i prisen (laminat, ink, applikationsfolie). */
  komponenter: Komponentlinje[];
  gentagelse: Gentagelse;
  note: string;
}

// ---------------------------------------------------------------------------
// Arbejdslinjer
// ---------------------------------------------------------------------------

export interface Arbejdslinje {
  id: string;
  /** Id i `domain/processer.ts`. Tom for frie linjer. */
  katalogId: string;
  proces: string;
  /** Fagligt vurderet tid i timer. Autoudfyldes ALDRIG. null = ikke vurderet. */
  fagligtEstimat: number | null;
  /** Separat, bevidst synligt risikotillæg i timer. */
  risikoTillaeg: number | null;
  /** Timekost fra processen — låst i normalvisning. */
  kostPrTime: number | null;
  kostOverride: number | null;
  gentagelse: Gentagelse;
  note: string;
}

// ---------------------------------------------------------------------------
// Øvrige poster
// ---------------------------------------------------------------------------

/**
 * Typen bestemmer hvilken avancegruppe posten havner i — præcis som Excel,
 * hvor presenninger, eksternt arbejde og fragt regnes hver for sig.
 */
export type OevrigType =
  | "ekstern_vare"            // indkøbt komponent / ekstern leverandør
  | "ekstern_ydelse"          // eksternt arbejde
  | "presenning"              // egen avancegruppe
  | "fragt"                   // ingen avance
  | "efter_regning"           // uden estimat — indgår ikke i prisen
  | "efter_regning_estimat"   // med estimat — regnes som eksternt arbejde
  | "fast_salgspris";         // manuelt fastsat salgspris

export const oevrigTypeTekst: Record<OevrigType, string> = {
  ekstern_vare: "Ekstern leverandør / indkøbt vare",
  ekstern_ydelse: "Eksternt arbejde",
  presenning: "Presenning",
  fragt: "Fragt (uden avance)",
  efter_regning: "Efter regning",
  efter_regning_estimat: "Efter regning m. estimat",
  fast_salgspris: "Manuel fast salgspris",
};

export interface Oevriglinje {
  id: string;
  type: OevrigType;
  beskrivelse: string;
  leverandoer: string;
  antal: number | null;
  enhed: Enhed;
  kostPrEnhed: number | null;
  /** Bruges når type = fast_salgspris. */
  fastSalgspris: number | null;
  gentagelse: Gentagelse;
  note: string;
}

// ---------------------------------------------------------------------------
// Kalkulationsdokumentet
// ---------------------------------------------------------------------------

/** Dækningsgrader pr. kategori for én kalkulation — Excel C122/C126/C129/C132. */
export interface Daekningsgrader {
  timer: number;
  varer: number;
  presenning: number;
  eksternt: number;
}

export interface Kalkulation {
  id: string;
  /**
   * Visningsfelter i prototypen. I v1 hører en kalkulation til en OS-Løsning på en
   * OS-Sag og refererer dem (TR-054) — de er ikke Kalkulations stamdata.
   */
  smuNr: string;
  kunde: string;
  sag: string;
  tegningsNr: string;
  antalEnheder: number;
  enhedsnavn: string;
  daekningsgrader: Daekningsgrader;
  /** Manuelt sat kundevendt pris PR. ENHED. null = brug beregnet pris. */
  kundevendtPrEnhed: number | null;
  materialer: Materialelinje[];
  arbejde: Arbejdslinje[];
  oevrige: Oevriglinje[];
}
