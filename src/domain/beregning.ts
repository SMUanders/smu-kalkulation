// ============================================================================
// SMU Kalkulation — prismotor
// ----------------------------------------------------------------------------
// Ren domænelogik: ingen React, ingen UI, ingen netværk. Al økonomi regnes her.
//
// Motoren spejler "SMU Kalkulation Master.xlsm" række for række (K121–K137)
// og er verificeret 13/13 mod arket — se `excelReference.test.ts`.
//
// PRINCIP: dækningsgrad, ikke procentpåslag.  salgspris = kost / (1 - dg)
// DG regnes PR. KATEGORI (som i Excel), ikke pr. linje.
//
// Reglerne kommer fra et typet regelsæt. Standard er det lokale
// PROTOTYPE_REGELSAET; formlerne herunder er uændrede fra prototypen.
// ============================================================================

import { PROTOTYPE_REGELSAET, type Regelsaet } from "./konfiguration";
import type {
  ArbejdeBeregning,
  Avancegruppe,
  MaterialeBeregning,
  OevrigBeregning,
  Opsamling,
} from "./resultat";
import type {
  Arbejdslinje,
  Gentagelse,
  Kalkulation,
  Materialelinje,
  Oevriglinje,
} from "./typer";

/** Avancebeløb ud fra kostpris og dækningsgrad i procent. Excel: k/(100-dg)*100 - k */
export function avanceAfDg(kost: number, dgPct: number): number {
  if (dgPct >= 100) return 0;
  return (kost / (100 - dgPct)) * 100 - kost;
}

/** Salgspris ud fra kostpris og dækningsgrad i procent. */
export function salgsprisAfDg(kost: number, dgPct: number): number {
  return kost + avanceAfDg(kost, dgPct);
}

/** Dækningsgrad i procent ud fra kost og salgspris. */
export function dgAfSalgspris(kost: number, salg: number): number | null {
  if (salg <= 0) return null;
  return ((salg - kost) / salg) * 100;
}

function rundOp(vaerdi: number, trin: number): number {
  return Math.ceil(vaerdi / trin - 1e-9) * trin;
}

// ---------------------------------------------------------------------------
// MATERIALER
// ---------------------------------------------------------------------------

/**
 * Ink prissættes pr. m² og omregnes til løbende meter ved at gange med
 * banebredden i meter — præcis som Excel (`G90 * 1,37` for en 1370 mm bane).
 */
function komponentKostPrEnhed(
  kostPrEnhed: number,
  prisErPrM2: boolean,
  breddeMm: number | null,
): number {
  if (!prisErPrM2) return kostPrEnhed;
  if (!breddeMm) return 0;
  return kostPrEnhed * (breddeMm / 1000);
}

export function beregnMateriale(
  linje: Materialelinje,
  regelsaet: Readonly<Regelsaet> = PROTOTYPE_REGELSAET,
): MaterialeBeregning {
  const regel = regelsaet.forbrugsregler[linje.form];
  const bufferPct = linje.bufferPct ?? regel.bufferPct;

  let kalkuleret: number | null = null;
  if (linje.overrideForbrug !== null) {
    kalkuleret = linje.overrideForbrug;
  } else if (linje.netto !== null) {
    const medBuffer = linje.netto * (1 + bufferPct / 100);
    kalkuleret = regel.afrundTrin ? rundOp(medBuffer, regel.afrundTrin) : medBuffer;
  }

  const basisKost = linje.kostOverride ?? linje.kostPrEnhed ?? 0;
  const komponentKost = linje.komponenter
    .filter((k) => k.aktiv)
    .reduce((sum, k) => sum + komponentKostPrEnhed(k.kostPrEnhed, k.prisErPrM2, linje.breddeMm), 0);

  const effektivKostPrEnhed = basisKost + komponentKost;
  const harPris = linje.kostOverride !== null || linje.kostPrEnhed !== null;
  const uafklaret = kalkuleret === null || !harPris;
  const kostTotal = !uafklaret ? (kalkuleret as number) * effektivKostPrEnhed : 0;

  return {
    bufferPct,
    kalkuleretForbrug: kalkuleret,
    erOverstyret: linje.overrideForbrug !== null,
    basisKost,
    komponentKost,
    effektivKostPrEnhed,
    kostErOverstyret: linje.kostOverride !== null,
    kostTotal,
    uafklaret,
    afrundTrin: regel.afrundTrin,
  };
}

// ---------------------------------------------------------------------------
// ARBEJDE
// ---------------------------------------------------------------------------

export function beregnArbejde(
  linje: Arbejdslinje,
  regelsaet: Readonly<Regelsaet> = PROTOTYPE_REGELSAET,
): ArbejdeBeregning {
  const kostPrTime = linje.kostOverride ?? linje.kostPrTime ?? regelsaet.timekost.standard;

  const harTid = linje.fagligtEstimat !== null || linje.risikoTillaeg !== null;
  const kalkuleretTid = harTid ? (linje.fagligtEstimat ?? 0) + (linje.risikoTillaeg ?? 0) : null;

  // En linje med kun risikotillæg og intet fagligt estimat er stadig fagligt
  // uafklaret — den markeres, selv om den har en tid.
  const uafklaret = linje.fagligtEstimat === null;

  return {
    kalkuleretTid,
    kostPrTime,
    kostErOverstyret: linje.kostOverride !== null,
    kost: kalkuleretTid !== null ? kalkuleretTid * kostPrTime : 0,
    uafklaret,
  };
}

// ---------------------------------------------------------------------------
// ØVRIGE POSTER
// ---------------------------------------------------------------------------

export function avancegruppeFor(linje: Oevriglinje): Avancegruppe {
  switch (linje.type) {
    case "ekstern_vare":
    case "ekstern_ydelse":
    case "efter_regning_estimat":
      return "eksternt";
    case "presenning":
      return "presenning";
    case "fragt":
      return "ingen";
    case "efter_regning":
      return "ingen";
    case "fast_salgspris":
      return "fast_salg";
  }
}

export function beregnOevrig(linje: Oevriglinje): OevrigBeregning {
  const gruppe = avancegruppeFor(linje);
  const efterRegningUdenEstimat = linje.type === "efter_regning";

  if (linje.type === "fast_salgspris") {
    return {
      kost: (linje.antal ?? 0) * (linje.kostPrEnhed ?? 0),
      gruppe,
      uafklaret: linje.fastSalgspris === null,
      efterRegningUdenEstimat: false,
      fastSalgspris: linje.fastSalgspris ?? 0,
    };
  }

  if (efterRegningUdenEstimat) {
    return { kost: 0, gruppe, uafklaret: true, efterRegningUdenEstimat: true, fastSalgspris: 0 };
  }

  const uafklaret = linje.antal === null || linje.kostPrEnhed === null;
  return {
    kost: uafklaret ? 0 : (linje.antal as number) * (linje.kostPrEnhed as number),
    gruppe,
    uafklaret,
    efterRegningUdenEstimat: false,
    fastSalgspris: 0,
  };
}

// ---------------------------------------------------------------------------
// SAMLET PRISOPSAMLING — spejler Excel-arkets rækker 121–137
// ---------------------------------------------------------------------------

export function beregnOpsamling(
  kalk: Kalkulation,
  regelsaet: Readonly<Regelsaet> = PROTOTYPE_REGELSAET,
): Opsamling {
  const antal = Math.max(1, kalk.antalEnheder || 1);
  const faktor = (g: Gentagelse) => (g === "pr_enhed" ? antal : 1);
  const dg = kalk.daekningsgrader;

  let materialekost = 0;
  let arbejdskost = 0;
  let timer = 0;
  let eksternkost = 0;
  let presenningkost = 0;
  let fragtkost = 0;
  let fastSalg = 0;
  let uafklarede = 0;

  for (const m of kalk.materialer) {
    const b = beregnMateriale(m, regelsaet);
    materialekost += b.kostTotal * faktor(m.gentagelse);
    if (b.uafklaret) uafklarede++;
  }

  for (const a of kalk.arbejde) {
    const b = beregnArbejde(a, regelsaet);
    const f = faktor(a.gentagelse);
    arbejdskost += b.kost * f;
    timer += (b.kalkuleretTid ?? 0) * f;
    if (b.uafklaret) uafklarede++;
  }

  for (const o of kalk.oevrige) {
    const b = beregnOevrig(o);
    const f = faktor(o.gentagelse);
    switch (b.gruppe) {
      case "eksternt":
        eksternkost += b.kost * f;
        break;
      case "presenning":
        presenningkost += b.kost * f;
        break;
      case "ingen":
        fragtkost += b.kost * f;
        break;
      case "fast_salg":
        fastSalg += b.fastSalgspris * f;
        break;
      case "varer":
        materialekost += b.kost * f;
        break;
    }
    if (b.uafklaret) uafklarede++;
  }

  // K122 / K125 / K126 / K129 / K132
  const arbejdsavance = avanceAfDg(arbejdskost, dg.timer);
  const emballagetillaeg = materialekost * (regelsaet.tillaeg.emballagePctAfMaterialekost / 100);
  const materialeavance = avanceAfDg(materialekost + emballagetillaeg, dg.varer);
  const presenningavance = avanceAfDg(presenningkost, dg.presenning);
  const eksternavance = avanceAfDg(eksternkost, dg.eksternt);

  // Den faste opstart ligger i kostgrundlaget uden avance (Excel K119 → K134).
  const fastOpstart = regelsaet.tillaeg.fastOpstartFakturering;

  // K134: fragt + fast opstart + timer + varer + emballage + eksternt + presenning
  const samletKostpris =
    fragtkost + fastOpstart + arbejdskost + materialekost + emballagetillaeg + eksternkost + presenningkost;

  // K135
  const samletAvance = arbejdsavance + materialeavance + eksternavance + presenningavance;

  // K136 — energitillægget ligger på sluttotalen og rammer derfor også fragt.
  const energitillaeg = (samletKostpris + samletAvance) * (regelsaet.tillaeg.energiPct / 100);

  // K137. Manuelt fastsatte salgspriser findes ikke i Excel og lægges oven på.
  const totalSalgspris = samletKostpris + samletAvance + energitillaeg + fastSalg;
  const totalPrEnhed = totalSalgspris / antal;

  const erManueltPrissat = kalk.kundevendtPrEnhed !== null;
  const kundevendtPrEnhed = kalk.kundevendtPrEnhed ?? totalPrEnhed;
  const kundevendtSamlet = kundevendtPrEnhed * antal;

  return {
    antalEnheder: antal,
    arbejdskost,
    arbejdsavance,
    arbejdssalg: arbejdskost + arbejdsavance,
    antalTimer: timer,
    materialekost,
    emballagetillaeg,
    materialeavance,
    materialesalg: materialekost + emballagetillaeg + materialeavance,
    presenningkost,
    presenningavance,
    eksternkost,
    eksternavance,
    fragtkost,
    fastOpstart,
    fastSalg,
    samletKostpris,
    samletAvance,
    energitillaeg,
    totalSalgspris,
    totalPrEnhed,
    kundevendtPrEnhed,
    kundevendtSamlet,
    erManueltPrissat,
    forventetDb: totalSalgspris - samletKostpris,
    forventetDg: dgAfSalgspris(samletKostpris, totalSalgspris),
    valgtDb: kundevendtSamlet - samletKostpris,
    valgtDg: dgAfSalgspris(samletKostpris, kundevendtSamlet),
    differenceTilBeregnet: kundevendtSamlet - totalSalgspris,
    antalUafklarede: uafklarede,
  };
}
