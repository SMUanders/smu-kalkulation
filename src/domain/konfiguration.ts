// ============================================================================
// SMU Kalkulation — beregningsregler som typet konfiguration
// ----------------------------------------------------------------------------
// Beregningsreglerne ejes af SMU Kalkulation (TR-053). I dette trin ligger de
// lokalt i repoet som ét typet regelsæt; der er ingen databasekonfiguration.
//
// Hver værdi har en kilde:
//   excel     aflæst fra "SMU Kalkulation Master.xlsm", ark "Kalkulation"
//   praksis   driftens foreløbige praksis — Excel har ingen kolonne for den
//   uafklaret må IKKE behandles som besluttet (DG på eksternt arbejde)
//
// Excel-formlerne, prismotoren spejler (K121–K137):
//   K122 Avance timer      = K121/(100-C122)*100 - K121
//   K125 Emballagetillæg   = K124*C125/100
//   K126 Avance varer      = (K124+K125)/(100-C126)*100 - (K124+K125)
//   K129 Avance presenning = K128/(100-C129)*100 - K128
//   K132 Avance eksterne   = K131/(100-C132)*100 - K131
//   K134 Samlet kostpris   = SUM(K117:K120)+K121+K124+K125+K131+K128
//   K135 Samlet avance     = K122+K126+K132+K129
//   K136 Energitillæg      = SUM(K134:K135)*0,1
//   K137 Total salgspris   = SUM(K134:K136)
// ============================================================================

import type { Daekningsgrader, Materialeform } from "./typer";

export type Regelstatus = "excel" | "praksis" | "uafklaret";

export interface Forbrugsregel {
  bufferPct: number;
  /** Oprunding af kalkuleret forbrug, fx 0,5 lbm. null = ingen oprunding. */
  afrundTrin: number | null;
  note: string;
  status: Regelstatus;
}

export interface Regelsaet {
  id: string;
  beskrivelse: string;
  timekost: {
    /** Excel G103–G112: Skærestue, Print, Fræs, Vask, Montering, Kørsel. */
    standard: number;
    /** Excel G98. */
    layout: number;
    /** Excel G99. */
    projektering: number;
    /** Excel G110 = montering × 1,5. */
    overarbejdeFaktor: number;
    /** Excel G111 = montering × 1,75. */
    overarbejdeWeekendFaktor: number;
  };
  daekningsgrad: {
    /** Excel C122 (standard) og etiket B122 (minimum). */
    timer: { standard: number; minimum: number };
    /** Excel C126 (standard) og etiket B126 (minimum). */
    varer: { standard: number; minimum: number };
    /** Excel C129. */
    presenning: { standard: number };
    /**
     * UAFKLARET. Excel-arket er selv i konflikt: etiketten B132 siger
     * "Normalt 20% min. 15%", mens inputcellen C132 står på 30. Prototypen
     * regner med 30 som markeret placeholder — ikke som beslutning.
     */
    eksterntArbejde: { placeholder: number; status: "uafklaret"; konflikt: string };
  };
  tillaeg: {
    /** Excel C125: 2 % af materialekost, lagt til FØR varernes DG og med i kostprisen. */
    emballagePctAfMaterialekost: number;
    /** Excel K119: fast opstart/fakturering i kostgrundlaget, uden avance. */
    fastOpstartFakturering: number;
    /** Excel K136: 10 % af (samlet kostpris + samlet avance). */
    energiPct: number;
  };
  forbrugsregler: Record<Materialeform, Forbrugsregel>;
}

/** Fryser hele strukturen, så ingen kalkulation kan ændre de fælles regler i hukommelsen. */
function frys<T extends object>(obj: T): Readonly<T> {
  for (const vaerdi of Object.values(obj)) {
    if (vaerdi && typeof vaerdi === "object") frys(vaerdi as object);
  }
  return Object.freeze(obj);
}

/** Det lokale regelsæt, prototypen og testene regner med i dette trin. */
export const PROTOTYPE_REGELSAET: Readonly<Regelsaet> = frys<Regelsaet>({
  id: "prototype-excel-2026-07",
  beskrivelse:
    "Aflæst fra SMU Kalkulation Master.xlsm (3. juli 2026). Lokal konfiguration indtil kalkulationsregler persisteres.",
  timekost: {
    standard: 275,
    layout: 370,
    projektering: 600,
    overarbejdeFaktor: 1.5,
    overarbejdeWeekendFaktor: 1.75,
  },
  daekningsgrad: {
    timer: { standard: 50, minimum: 40 },
    varer: { standard: 40, minimum: 30 },
    presenning: { standard: 25 },
    eksterntArbejde: {
      placeholder: 30,
      status: "uafklaret",
      konflikt: "Excel: etiket 20 % / input 30 % / minimum 15 %",
    },
  },
  tillaeg: {
    emballagePctAfMaterialekost: 2,
    fastOpstartFakturering: 148,
    energiPct: 10,
  },
  forbrugsregler: {
    // Foreløbig praksis for rullematerialer. Excel har ingen bufferkolonne.
    rulle: {
      bufferPct: 15,
      afrundTrin: 0.5,
      note: "15 % buffer, rundes op til nærmeste 0,5 lbm",
      status: "praksis",
    },
    // Plader, styksvarer og indkøbte komponenter får bevidst ingen materialebuffer.
    plade: {
      bufferPct: 0,
      afrundTrin: null,
      note: "Ingen automatisk buffer — pladeforbrug vurderes konkret",
      status: "praksis",
    },
    stk: { bufferPct: 0, afrundTrin: null, note: "Ingen automatisk buffer", status: "praksis" },
    andet: { bufferPct: 0, afrundTrin: null, note: "Ingen automatisk buffer", status: "praksis" },
  },
});

// ---------------------------------------------------------------------------
// Afledte navngivne værdier, som UI'et bruger. De følger altid regelsættet.
// ---------------------------------------------------------------------------

const R = PROTOTYPE_REGELSAET;

/** Standard-dækningsgrader for en ny kalkulation. `eksternt` er den uafklarede placeholder. */
export const DG_STANDARD: Readonly<Daekningsgrader> = Object.freeze({
  timer: R.daekningsgrad.timer.standard,
  varer: R.daekningsgrad.varer.standard,
  presenning: R.daekningsgrad.presenning.standard,
  eksternt: R.daekningsgrad.eksterntArbejde.placeholder,
});

export const DG_MINIMUM = Object.freeze({
  timer: R.daekningsgrad.timer.minimum,
  varer: R.daekningsgrad.varer.minimum,
});

/** Eksternt arbejde er ikke afklaret og skal markeres synligt i UI. */
export const EKSTERNT_UAFKLARET = R.daekningsgrad.eksterntArbejde.status === "uafklaret";
export const EKSTERNT_KONFLIKT = R.daekningsgrad.eksterntArbejde.konflikt;

export const forbrugsregler = R.forbrugsregler;
export const tillaeg = R.tillaeg;
export const STANDARD_KOST_PR_TIME = R.timekost.standard;
