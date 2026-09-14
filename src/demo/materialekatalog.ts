// ============================================================================
// SMU Kalkulation — materialekatalog (prototype)
// ----------------------------------------------------------------------------
// Katalogets indhold er AFLÆST fra "SMU Kalkulation Master.xlsm", ark
// "Kalkulation" (OneDrive, senest ændret 3. juli 2026). Navne, bredder,
// leverandører og kostpriser er de værdier arket bruger i dag.
//
// Kolonne G = "Signcom m.fl.", kolonne I = "Scandraft". Hvor begge findes,
// bruges den laveste som standard og den anden ligger som alternativ.
//
// Dette er DEMO-data i en prototype. Når SMU Source findes, er det Source der
// ejer produkt-/materialeidentitet, leverandør og indkøbspris — kataloget her
// er en midlertidig stand-in, der efterligner det fremtidige opslag.
// ============================================================================

import type { Enhed, Materialeform } from "../domain/typer";

export type Katalogkategori =
  | "skaerefolie"
  | "wrap"
  | "printfolie"
  | "laminat"
  | "applikation"
  | "ink"
  | "plade"
  | "forbrug";

export const kategoriTekst: Record<Katalogkategori, string> = {
  skaerefolie: "Skærefolie",
  wrap: "Wrap / indpakning",
  printfolie: "Printfolie",
  laminat: "Laminat",
  applikation: "Applikationsfolie",
  ink: "Ink",
  plade: "Plader",
  forbrug: "Forbrugsvarer",
};

export interface Katalogmateriale {
  id: string;
  /** Produktnavn uden prisgruppe, fx "Oracal 751". */
  navn: string;
  /** Prisgruppe — kan alene være tilstrækkeligt prisgrundlag. */
  prisgruppe: string;
  producent: string;
  leverandoer: string;
  /** Alternativ leverandør og pris (den anden kolonne i Excel). */
  altLeverandoer: string | null;
  altKostPrEnhed: number | null;
  breddeMm: number | null;
  enhed: Enhed;
  form: Materialeform;
  kostPrEnhed: number;
  kategori: Katalogkategori;
  /** Ink prissættes pr. m² og ganges med banebredden. */
  prisErPrM2?: boolean;
  /** Ekstra søgeord ud over navn, prisgruppe, producent og leverandør. */
  soegeord: string[];
  /** Komponenter der allerede er indregnet i kostprisen (færdig kombination). */
  indeholder?: string[];
  /** Sikre materialeafhængigheder der foreslås automatisk ved valg. */
  foreslaar?: string[];
  /** Vist i vælgeren som "ofte brugt". */
  ofteBrugt?: boolean;
  note?: string;
}

/** Prisgrupper der dækker vilkårlige kulørte farver — bruges af fritekstsøgning. */
const KULOERTE = ["Farver", "Farver / Metallic", "Metallic"];

/** Almindelige danske farveord. Demo-heuristik, så "blå" kan finde en prisgruppe. */
const FARVEORD = [
  "blå", "blaa", "rød", "roed", "grøn", "groen", "gul", "orange", "lilla",
  "violet", "brun", "beige", "turkis", "pink", "guld", "sølv", "soelv",
];

export const materialekatalog: Katalogmateriale[] = [
  // ---------------- Skærefolie ----------------
  {
    id: "oracal-651-sh",
    navn: "Oracal 651 – plane flader",
    prisgruppe: "Sort/hvid",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 36,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 31,
    kategori: "skaerefolie",
    soegeord: ["651", "monomer", "plane"],
    foreslaar: ["polytape-tp160"],
  },
  {
    id: "oracal-651-farver",
    navn: "Oracal 651 – plane flader",
    prisgruppe: "Farver / Metallic",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 44,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 35,
    kategori: "skaerefolie",
    soegeord: ["651", "monomer", "plane"],
    foreslaar: ["polytape-tp160"],
  },
  {
    id: "oracal-751-sh",
    navn: "Oracal 751 – alle flader",
    prisgruppe: "Sort/hvid",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 68,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 58,
    kategori: "skaerefolie",
    soegeord: ["751", "cast", "støbt", "stoebt"],
    foreslaar: ["polytape-tp160"],
    ofteBrugt: true,
  },
  {
    id: "oracal-751-farver",
    navn: "Oracal 751 – alle flader",
    prisgruppe: "Farver",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 74,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 65,
    kategori: "skaerefolie",
    soegeord: ["751", "cast", "støbt", "stoebt"],
    foreslaar: ["polytape-tp160"],
    ofteBrugt: true,
  },
  {
    id: "oracal-751-metallic",
    navn: "Oracal 751 – alle flader",
    prisgruppe: "Metallic",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 77,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 67,
    kategori: "skaerefolie",
    soegeord: ["751", "cast", "metallic"],
    foreslaar: ["polytape-tp160"],
  },
  {
    id: "oracal-751-tp160",
    navn: "Oracal 751 med TP-160",
    prisgruppe: "Farver",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 81,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 72,
    kategori: "skaerefolie",
    soegeord: ["751", "tp160", "tp-160", "kombination", "med tape"],
    indeholder: ["Oracal 751 Farver", "Polytape TP160"],
    note: "Færdig kombination — applikationsfolie er allerede med i prisen",
    ofteBrugt: true,
  },
  {
    id: "oracal-551g-sh",
    navn: "Oracal 551G",
    prisgruppe: "Sort/hvid",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 43,
    kategori: "skaerefolie",
    soegeord: ["551"],
    foreslaar: ["polytape-tp160"],
  },
  {
    id: "oracal-551g-farver",
    navn: "Oracal 551G",
    prisgruppe: "Farver",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 47,
    kategori: "skaerefolie",
    soegeord: ["551"],
    foreslaar: ["polytape-tp160"],
  },
  {
    id: "oralite-5600e-white",
    navn: "Oralite 5600E",
    prisgruppe: "White",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 188,
    breddeMm: 1235,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 149,
    kategori: "skaerefolie",
    soegeord: ["5600", "refleks", "reflekterende", "hvid"],
  },
  {
    id: "oralite-5600e-blue",
    navn: "Oralite 5600E",
    prisgruppe: "Blue",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 205,
    breddeMm: 1235,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 155,
    kategori: "skaerefolie",
    soegeord: ["5600", "refleks", "reflekterende", "blå", "blaa"],
  },
  {
    id: "oracal-8510-dusted",
    navn: "Oracal 8510 – Dusted",
    prisgruppe: "Hele ruller",
    producent: "ORAFOL",
    leverandoer: "Signcom",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 128,
    kategori: "skaerefolie",
    soegeord: ["8510", "dusted", "rude", "vindue", "mat"],
  },

  // ---------------- Wrap / indpakning ----------------
  {
    id: "avery-supreme",
    navn: "Avery Supreme Wrapping",
    prisgruppe: "Alle farver",
    producent: "Avery Dennison",
    leverandoer: "Signcom",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: 1520,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 205,
    kategori: "wrap",
    soegeord: ["avery", "supreme", "wrap", "indpakning", "cb152", "blå", "blaa"],
    ofteBrugt: true,
  },
  {
    id: "oracal-970-sh",
    navn: "Oracal 970 – indpakning",
    prisgruppe: "Sort/hvid",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 159,
    breddeMm: 1520,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 139,
    kategori: "wrap",
    soegeord: ["970", "wrap", "indpakning"],
  },
  {
    id: "oracal-970-farver",
    navn: "Oracal 970 – indpakning",
    prisgruppe: "Farver",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 182,
    breddeMm: 1520,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 159,
    kategori: "wrap",
    soegeord: ["970", "wrap", "indpakning"],
  },
  {
    id: "oracal-970-metallic",
    navn: "Oracal 970 – indpakning",
    prisgruppe: "Metallic",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 186,
    breddeMm: 1520,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 165,
    kategori: "wrap",
    soegeord: ["970", "wrap", "metallic"],
  },

  // ---------------- Printfolie ----------------
  {
    id: "orajet-3551-137",
    navn: "Orajet 3551",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 40,
    breddeMm: 1370,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 32,
    kategori: "printfolie",
    soegeord: ["3551", "print", "digitaltryk"],
    foreslaar: ["oraguard-215g-137", "ink"],
    ofteBrugt: true,
  },
  {
    id: "orajet-3551-152",
    navn: "Orajet 3551 – 1,52 m",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 50,
    breddeMm: 1520,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 38,
    kategori: "printfolie",
    soegeord: ["3551", "print", "digitaltryk"],
    foreslaar: ["oraguard-215g-152", "ink"],
  },
  {
    id: "orajet-3551-160",
    navn: "Orajet 3551 – 1,60 m",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Signcom",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: 1600,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 49,
    kategori: "printfolie",
    soegeord: ["3551", "print", "digitaltryk"],
    foreslaar: ["oraguard-215g-160", "ink"],
  },
  {
    id: "orajet-3551-215g",
    navn: "Orajet 3551 + OraGuard 215G",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 80,
    breddeMm: 1370,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 62,
    kategori: "printfolie",
    soegeord: ["3551", "215", "print", "laminat", "kombination"],
    indeholder: ["Orajet 3551", "OraGuard 215G"],
    note: "Færdig kombination — laminat er allerede med i prisen. Ink er ikke.",
    foreslaar: ["ink"],
    ofteBrugt: true,
  },
  {
    id: "orajet-3551-215g-ink",
    navn: "Orajet 3551 + OraGuard 215G + ink",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 109,
    breddeMm: 1370,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 89.4,
    kategori: "printfolie",
    soegeord: ["3551", "215", "ink", "print", "laminat", "kombination"],
    indeholder: ["Orajet 3551", "OraGuard 215G", "Ink (20 kr/m² × 1,37 m)"],
    note: "Færdig kombination — laminat OG ink er med i prisen. Tilføj ikke separat ink.",
    ofteBrugt: true,
  },
  {
    id: "orajet-3951",
    navn: "Orajet 3951 RA støbt",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 118,
    breddeMm: 1520,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 114,
    kategori: "printfolie",
    soegeord: ["3951", "støbt", "stoebt", "cast", "print"],
    foreslaar: ["oraguard-293g", "ink"],
  },
  {
    id: "orajet-3676",
    navn: "Orajet 3676 window vision",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 92,
    breddeMm: 1370,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 82,
    kategori: "printfolie",
    soegeord: ["3676", "window", "vision", "rude", "hulfolie"],
    foreslaar: ["ink"],
  },

  // ---------------- Laminat ----------------
  {
    id: "oraguard-215g-137",
    navn: "OraGuard Laminat 215G",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 40,
    breddeMm: 1370,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 30,
    kategori: "laminat",
    soegeord: ["215", "laminat"],
  },
  {
    id: "oraguard-215g-152",
    navn: "OraGuard Laminat 215G – 1,52 m",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 45,
    breddeMm: 1552,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 35,
    kategori: "laminat",
    soegeord: ["215", "laminat"],
  },
  {
    id: "oraguard-215g-160",
    navn: "OraGuard Laminat 215G – 1,60 m",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: 1600,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 47,
    kategori: "laminat",
    soegeord: ["215", "laminat"],
  },
  {
    id: "oraguard-293g",
    navn: "OraGuard Laminat 293G",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 115,
    breddeMm: 1550,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 108,
    kategori: "laminat",
    soegeord: ["293", "laminat", "støbt", "stoebt"],
  },
  {
    id: "oraguard-270",
    navn: "Oraguard 270 stenslagsfolie",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 86,
    breddeMm: 1260,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 69,
    kategori: "laminat",
    soegeord: ["270", "stenslag", "beskyttelse"],
  },

  // ---------------- Applikation ----------------
  {
    id: "polytape-tp160",
    navn: "Polytape TP160",
    prisgruppe: "Standard",
    producent: "Transotape",
    leverandoer: "Transotape",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: null,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 7,
    kategori: "applikation",
    soegeord: ["tp160", "tp-160", "applikationsfolie", "tape", "montagetape"],
  },
  {
    id: "oratape-mt95",
    navn: "OraTape MT95 / LT95",
    prisgruppe: "Standard",
    producent: "ORAFOL",
    leverandoer: "Scandraft",
    altLeverandoer: "Signcom",
    altKostPrEnhed: 14,
    breddeMm: 1220,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 10,
    kategori: "applikation",
    soegeord: ["oratape", "mt95", "lt95", "applikationsfolie", "tape"],
  },

  // ---------------- Ink ----------------
  {
    id: "ink",
    navn: "Ink til print",
    prisgruppe: "Standard",
    producent: "—",
    leverandoer: "",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: null,
    enhed: "m2",
    form: "andet",
    kostPrEnhed: 20,
    kategori: "ink",
    prisErPrM2: true,
    soegeord: ["ink", "blæk", "blaek", "print"],
    note: "Prissættes pr. m² og ganges med banebredden",
  },

  // ---------------- Plader ----------------
  {
    id: "ibond-3mm",
    navn: "Ibond sandwich 3050 × 1500 × 3 mm",
    prisgruppe: "Standard",
    producent: "Ibond",
    leverandoer: "Vink",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: 1500,
    enhed: "lbm",
    form: "plade",
    kostPrEnhed: 160,
    kategori: "plade",
    soegeord: ["ibond", "sandwich", "dibond", "plade", "facade", "alu"],
    note: "Plader får ikke automatisk materialebuffer",
  },
  {
    id: "vikuprop-4mm",
    navn: "Vikuprop kanalplade 700 g, 1850 × 2450 × 4 mm",
    prisgruppe: "Standard",
    producent: "Vikuprop",
    leverandoer: "Vink",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: 1850,
    enhed: "stk",
    form: "plade",
    kostPrEnhed: 225,
    kategori: "plade",
    soegeord: ["vikuprop", "kanalplade", "plade", "skilt"],
    note: "Plader får ikke automatisk materialebuffer",
  },

  // ---------------- Forbrugsvarer ----------------
  {
    id: "industrirens",
    navn: "Industrirens 500 ml",
    prisgruppe: "Standard",
    producent: "ProFlex",
    leverandoer: "ProFlex",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: null,
    enhed: "stk",
    form: "stk",
    kostPrEnhed: 100,
    kategori: "forbrug",
    soegeord: ["rens", "rengøring", "industrirens"],
  },
  {
    id: "easy-off",
    navn: "Easy Off limfjerner",
    prisgruppe: "Standard",
    producent: "Veidec",
    leverandoer: "Veidec",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: null,
    enhed: "liter",
    form: "stk",
    kostPrEnhed: 120,
    kategori: "forbrug",
    soegeord: ["limfjerner", "easy off", "rens"],
  },
  {
    id: "knifeless",
    navn: "Knifeless Design Line Tape 3,5 mm × 50 m",
    prisgruppe: "Standard",
    producent: "—",
    leverandoer: "Signcom",
    altLeverandoer: null,
    altKostPrEnhed: null,
    breddeMm: null,
    enhed: "lbm",
    form: "rulle",
    kostPrEnhed: 7,
    kategori: "forbrug",
    soegeord: ["knifeless", "tape", "skæretråd"],
  },
];

export function findMateriale(id: string): Katalogmateriale | undefined {
  return materialekatalog.find((m) => m.id === id);
}

// ============================================================================
// SERIER, PRISGRUPPER, STANDARDBREDDER OG FARVER  (v0.3)
// ----------------------------------------------------------------------------
// En serie samler de katalogvarer, der er samme materiale i forskellige
// prisgrupper og bredder. Brugeren vælger serien — systemet vælger
// standardbredden, og prisgruppen afgør prisen.
//
// Standardbredder er verificeret:
//   Oracal 751  1260 mm  Excel C8–C10 · Source-vare "Signmeups aktuelle driftsvare: 1260 mm"
//   Orajet 3551 1370 mm  Excel C56    · Source-varer 1050 og 1370 (Scandraft)
//   OraGuard 215G 1370   Excel C71    · Source-vare 1370 gloss
//   Avery Supreme 1520   Excel C20
//
// FARVER er demodata til UX'en, ikke et farvekatalog. Kun koder der findes i
// kendt reference er med:
//   kilde "source" = kode + officielt ORAFOL-farvenavn fra smu-os-v2
//                    (20260821100001_source_751c_farvenavne.sql)
//   kilde "case"   = fra Anders' egen Citan-case
// Det danske navn er en visningsetiket — Source har kun producentens navn.
// Farvens PRISGRUPPE er kalkulationens (Excels) kommercielle gruppering.
// Source dokumenterer kun farvegruppe for 010/070 (sort_hvid) og 932
// (metallic); 050 og 063 står som 'ukendt' der.
// ============================================================================

export interface Farve {
  /** Producentens kode, fx "050". */
  kode: string;
  /** Kort dansk visningsetiket, fx "mørkeblå". */
  dansk: string;
  /** Producentens officielle navn, fx "Dark blue". */
  producentnavn: string;
  /** Den prisgruppe farven kalkuleres i. */
  prisgruppe: string;
  kilde: "source" | "case";
}

export interface Serie {
  id: string;
  navn: string;
  undertitel: string;
  producent: string;
  kategori: Katalogkategori;
  standardbreddeMm: number;
  /** Én katalogvare pr. prisgruppe — i standardbredden. */
  prisgrupper: { navn: string; katalogId: string }[];
  /** Alle katalogvarer i serien, også andre bredder. */
  varer: string[];
  farver: Farve[];
  soegeord: string[];
  ofteBrugt?: boolean;
}

export const serier: Serie[] = [
  {
    id: "oracal-751",
    navn: "Oracal 751",
    undertitel: "alle flader",
    producent: "ORAFOL",
    kategori: "skaerefolie",
    standardbreddeMm: 1260,
    prisgrupper: [
      { navn: "Sort/hvid", katalogId: "oracal-751-sh" },
      { navn: "Farver", katalogId: "oracal-751-farver" },
      { navn: "Metallic", katalogId: "oracal-751-metallic" },
    ],
    varer: ["oracal-751-sh", "oracal-751-farver", "oracal-751-metallic"],
    farver: [
      { kode: "010", dansk: "hvid", producentnavn: "White", prisgruppe: "Sort/hvid", kilde: "source" },
      { kode: "070", dansk: "sort", producentnavn: "Black", prisgruppe: "Sort/hvid", kilde: "source" },
      { kode: "050", dansk: "mørkeblå", producentnavn: "Dark blue", prisgruppe: "Farver", kilde: "source" },
      { kode: "063", dansk: "lysegrøn", producentnavn: "Lime-tree green", prisgruppe: "Farver", kilde: "source" },
      { kode: "932", dansk: "grafit metallic", producentnavn: "Graphite metallic", prisgruppe: "Metallic", kilde: "source" },
    ],
    soegeord: ["751", "751c", "cast", "støbt", "stoebt"],
    ofteBrugt: true,
  },
  {
    id: "oracal-651",
    navn: "Oracal 651",
    undertitel: "plane flader",
    producent: "ORAFOL",
    kategori: "skaerefolie",
    standardbreddeMm: 1260,
    prisgrupper: [
      { navn: "Sort/hvid", katalogId: "oracal-651-sh" },
      { navn: "Farver / Metallic", katalogId: "oracal-651-farver" },
    ],
    varer: ["oracal-651-sh", "oracal-651-farver"],
    farver: [],
    soegeord: ["651", "monomer"],
  },
  {
    id: "oracal-551g",
    navn: "Oracal 551G",
    undertitel: "",
    producent: "ORAFOL",
    kategori: "skaerefolie",
    standardbreddeMm: 1260,
    prisgrupper: [
      { navn: "Sort/hvid", katalogId: "oracal-551g-sh" },
      { navn: "Farver", katalogId: "oracal-551g-farver" },
    ],
    varer: ["oracal-551g-sh", "oracal-551g-farver"],
    farver: [],
    soegeord: ["551"],
  },
  {
    id: "oralite-5600e",
    navn: "Oralite 5600E",
    undertitel: "refleks",
    producent: "ORAFOL",
    kategori: "skaerefolie",
    standardbreddeMm: 1235,
    prisgrupper: [
      { navn: "White", katalogId: "oralite-5600e-white" },
      { navn: "Blue", katalogId: "oralite-5600e-blue" },
    ],
    varer: ["oralite-5600e-white", "oralite-5600e-blue"],
    farver: [],
    soegeord: ["5600", "refleks"],
  },
  {
    id: "avery-supreme",
    navn: "Avery Supreme Wrapping",
    undertitel: "",
    producent: "Avery Dennison",
    kategori: "wrap",
    standardbreddeMm: 1520,
    prisgrupper: [{ navn: "Alle farver", katalogId: "avery-supreme" }],
    varer: ["avery-supreme"],
    farver: [
      { kode: "CB152", dansk: "blå", producentnavn: "Blue", prisgruppe: "Alle farver", kilde: "case" },
    ],
    soegeord: ["avery", "supreme", "wrap"],
    ofteBrugt: true,
  },
  {
    id: "oracal-970",
    navn: "Oracal 970",
    undertitel: "indpakning",
    producent: "ORAFOL",
    kategori: "wrap",
    standardbreddeMm: 1520,
    prisgrupper: [
      { navn: "Sort/hvid", katalogId: "oracal-970-sh" },
      { navn: "Farver", katalogId: "oracal-970-farver" },
      { navn: "Metallic", katalogId: "oracal-970-metallic" },
    ],
    varer: ["oracal-970-sh", "oracal-970-farver", "oracal-970-metallic"],
    farver: [],
    soegeord: ["970", "wrap"],
  },
  {
    id: "orajet-3551",
    navn: "Orajet 3551",
    undertitel: "printfolie",
    producent: "ORAFOL",
    kategori: "printfolie",
    standardbreddeMm: 1370,
    prisgrupper: [{ navn: "Standard", katalogId: "orajet-3551-137" }],
    varer: ["orajet-3551-137", "orajet-3551-152", "orajet-3551-160"],
    farver: [],
    soegeord: ["3551", "print"],
    ofteBrugt: true,
  },
  {
    id: "oraguard-215g",
    navn: "OraGuard 215G",
    undertitel: "laminat",
    producent: "ORAFOL",
    kategori: "laminat",
    standardbreddeMm: 1370,
    prisgrupper: [{ navn: "Standard", katalogId: "oraguard-215g-137" }],
    varer: ["oraguard-215g-137", "oraguard-215g-152", "oraguard-215g-160"],
    farver: [],
    soegeord: ["215", "laminat"],
  },
];

export function findSerie(id: string): Serie | undefined {
  return serier.find((s) => s.id === id);
}

/** Hvilken serie hører en katalogvare til? */
export function serieFor(katalogId: string): Serie | undefined {
  return serier.find((s) => s.varer.includes(katalogId));
}

/** Andre bredder af samme vare i samme prisgruppe. */
export function andreBredder(katalogId: string): Katalogmateriale[] {
  const s = serieFor(katalogId);
  const nu = findMateriale(katalogId);
  if (!s || !nu) return [];
  return s.varer
    .map((id) => findMateriale(id))
    .filter((m): m is Katalogmateriale => !!m && m.prisgruppe === nu.prisgruppe && m.id !== nu.id);
}

/** Katalogvaren for en prisgruppe — i nuværende bredde, ellers standardbredden. */
export function vareForPrisgruppe(serie: Serie, prisgruppe: string, breddeMm: number | null) {
  const iBredde = serie.varer
    .map((id) => findMateriale(id))
    .find((m) => m && m.prisgruppe === prisgruppe && m.breddeMm === breddeMm);
  if (iBredde) return iBredde;
  const std = serie.prisgrupper.find((p) => p.navn === prisgruppe);
  return std ? findMateriale(std.katalogId) : undefined;
}

/** Varer uden for serierne — kombinationer, tape, ink, plader, forbrugsvarer. */
export function frieVarer(): Katalogmateriale[] {
  return materialekatalog.filter((m) => !serieFor(m.id));
}

/** Kort navn til kompakt komponentvisning: "+ 215G + ink". */
const KORTNAVN: Record<string, string> = {
  "polytape-tp160": "TP-160",
  "oratape-mt95": "MT95",
  "oraguard-215g-137": "215G",
  "oraguard-215g-152": "215G",
  "oraguard-215g-160": "215G",
  "oraguard-293g": "293G",
  "oraguard-270": "270",
  ink: "ink",
};
export function kortnavn(katalogId: string, fallback: string): string {
  return KORTNAVN[katalogId] ?? fallback;
}

/** Søg på tværs af serier (inkl. deres farver) og frie varer. */
export type Valg = { slags: "serie"; serie: Serie } | { slags: "vare"; vare: Katalogmateriale };

export function soegValg(tekst: string): Valg[] {
  const q = tekst.trim().toLowerCase();
  const traef = new Set(soeg(tekst).map((m) => m.id));

  const serieValg: Valg[] = serier
    .filter((s) => {
      if (!q) return true;
      if (s.varer.some((id) => traef.has(id))) return true;
      if ([s.navn, s.undertitel, s.producent, ...s.soegeord].join(" ").toLowerCase().includes(q)) return true;
      return s.farver.some((f) =>
        [f.kode, f.dansk, f.producentnavn].join(" ").toLowerCase().includes(q),
      );
    })
    .map((s) => ({ slags: "serie", serie: s }));

  const vareValg: Valg[] = frieVarer()
    .filter((m) => !q || traef.has(m.id))
    .map((m) => ({ slags: "vare", vare: m }));

  return [...serieValg, ...vareValg];
}

/** Senest brugte farver i sessionen — "serieId:kode". */
const senesteFarver: string[] = [];
export function noterFarve(serieId: string, kode: string) {
  const noegle = `${serieId}:${kode}`;
  const i = senesteFarver.indexOf(noegle);
  if (i >= 0) senesteFarver.splice(i, 1);
  senesteFarver.unshift(noegle);
  if (senesteFarver.length > 8) senesteFarver.pop();
}
export function senesteFarverFor(serie: Serie): Farve[] {
  return senesteFarver
    .filter((n) => n.startsWith(`${serie.id}:`))
    .map((n) => serie.farver.find((f) => f.kode === n.split(":")[1]))
    .filter((f): f is Farve => !!f);
}

/** Fuldt visningsnavn: "Oracal 751 – alle flader · Farver · 1260 mm". */
export function visningsnavn(m: Katalogmateriale): string {
  const dele = [m.navn];
  if (m.prisgruppe && m.prisgruppe !== "Standard") dele.push(m.prisgruppe);
  if (m.breddeMm) dele.push(`${m.breddeMm} mm`);
  return dele.join(" · ");
}

/**
 * Fritekstsøgning på tværs af navn, prisgruppe, producent, leverandør, bredde
 * og søgeord. Et farveord matcher også kulørte prisgrupper, så man kan søge
 * "blå" og finde den prisgruppe der dækker blå — uden at kende farvekoden.
 */
export function soeg(tekst: string): Katalogmateriale[] {
  const q = tekst.trim().toLowerCase();
  if (!q) return materialekatalog;
  const ord = q.split(/\s+/);

  return materialekatalog.filter((m) => {
    const hoestak = [
      m.navn,
      m.prisgruppe,
      m.producent,
      m.leverandoer,
      m.altLeverandoer ?? "",
      m.breddeMm ? String(m.breddeMm) : "",
      kategoriTekst[m.kategori],
      ...m.soegeord,
      ...(m.indeholder ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return ord.every((o) => {
      if (hoestak.includes(o)) return true;
      // "blå" o.l. rammer de prisgrupper der dækker kulørte farver
      if (FARVEORD.includes(o) && KULOERTE.includes(m.prisgruppe)) return true;
      return false;
    });
  });
}

export const ofteBrugte = () => materialekatalog.filter((m) => m.ofteBrugt);
