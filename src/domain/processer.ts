// ============================================================================
// SMU Kalkulation — arbejdsprocesser
// ----------------------------------------------------------------------------
// Processer og timesatser er beregningsregler og ejes af SMU Kalkulation
// (TR-053) — de er hverken Source-data eller demo-data. Navnene er aflæst fra
// "SMU Kalkulation Master.xlsm", rækkerne 97–112, og stemmer med smu-os-v2's
// `prisbibliotek`, hvor de to er enige.
//
// Satserne afledes af regelsættet: standard 275 kr/t, Lay-out 370, Projektering
// 600, og overarbejde som montering × 1,5 og × 1,75 — præcis som arket.
// Listen er lokal konfiguration, indtil kalkulationsregler persisteres.
// ============================================================================

import { PROTOTYPE_REGELSAET } from "./konfiguration";

export { STANDARD_KOST_PR_TIME } from "./konfiguration";

export type Procesgruppe = "tegnestue" | "klargoering" | "montage";

export const procesgruppeTekst: Record<Procesgruppe, string> = {
  tegnestue: "Tegnestue",
  klargoering: "Klargøring",
  montage: "Montage",
};

export interface Katalogproces {
  id: string;
  navn: string;
  gruppe: Procesgruppe;
  kostPrTime: number;
  soegeord: string[];
  ofteBrugt?: boolean;
  note?: string;
}

const T = PROTOTYPE_REGELSAET.timekost;

export const proceskatalog: Katalogproces[] = [
  {
    id: "lay-out",
    navn: "Lay-out",
    gruppe: "tegnestue",
    kostPrTime: T.layout,
    soegeord: ["layout", "lay-out", "tegnestue", "opsætning"],
    ofteBrugt: true,
  },
  {
    id: "projektering",
    navn: "Projektering",
    gruppe: "tegnestue",
    kostPrTime: T.projektering,
    soegeord: ["projektering", "tegnestue", "rådgivning"],
  },
  {
    id: "opstart-timer",
    navn: "Opstart / fakturering, timebaseret",
    gruppe: "tegnestue",
    kostPrTime: T.standard,
    soegeord: ["opstart", "fakturering", "administration", "timebaseret"],
    note: "Timebaseret administration. Må ikke forveksles med den faste post på 148 kr.",
  },
  {
    id: "skaerestue",
    navn: "Skærestue",
    gruppe: "klargoering",
    kostPrTime: T.standard,
    soegeord: ["skærestue", "skaerestue", "skæring", "oppilning", "applikation"],
    ofteBrugt: true,
    note: "Kalkuleres samlet. Faktisk tid kan senere dække skæring, oppilning og applikation.",
  },
  {
    id: "print",
    navn: "Print",
    gruppe: "klargoering",
    kostPrTime: T.standard,
    soegeord: ["print", "printer", "laminering", "laminat"],
    ofteBrugt: true,
    note: "Excel har ingen selvstændig laminerings-timepost — laminering ligger her.",
  },
  {
    id: "fraes",
    navn: "Fræs",
    gruppe: "klargoering",
    kostPrTime: T.standard,
    soegeord: ["fræs", "fraes", "cnc", "plade"],
  },
  {
    id: "vask",
    navn: "Vask",
    gruppe: "montage",
    kostPrTime: T.standard,
    soegeord: ["vask", "rengøring", "klargøring"],
  },
  {
    id: "montering",
    navn: "Montering",
    gruppe: "montage",
    kostPrTime: T.standard,
    soegeord: ["montering", "montage", "opsætning", "on site"],
    ofteBrugt: true,
  },
  {
    id: "overarbejde",
    navn: "Overarbejde (montering × 1,5)",
    gruppe: "montage",
    kostPrTime: T.standard * T.overarbejdeFaktor,
    soegeord: ["overarbejde", "aften"],
  },
  {
    id: "overarbejde-weekend",
    navn: "Overarbejde weekend (montering × 1,75)",
    gruppe: "montage",
    kostPrTime: T.standard * T.overarbejdeWeekendFaktor,
    soegeord: ["overarbejde", "weekend", "lørdag", "søndag"],
  },
  {
    id: "koersel",
    navn: "Kørsel pr. person / timer",
    gruppe: "montage",
    kostPrTime: T.standard,
    soegeord: ["kørsel", "koersel", "transport", "rejse"],
  },
];

export function findProces(id: string): Katalogproces | undefined {
  return proceskatalog.find((p) => p.id === id);
}

export function soegProces(tekst: string): Katalogproces[] {
  const q = tekst.trim().toLowerCase();
  if (!q) return proceskatalog;
  return proceskatalog.filter((p) =>
    [p.navn, procesgruppeTekst[p.gruppe], ...p.soegeord].join(" ").toLowerCase().includes(q),
  );
}

export const ofteBrugteProcesser = () => proceskatalog.filter((p) => p.ofteBrugt);
