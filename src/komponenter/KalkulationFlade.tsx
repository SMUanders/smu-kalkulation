// ============================================================================
// Kalkulationsfladen — arbejdsfladen uden topbjælke.
//
// Bruges af både demoen (KalkulationSide) og en gemt kalkulation på en OS-sag
// (SagKalkulationSide). Fladen ejer ikke kalkulationen: forælderen holder den,
// gemmer den og bestemmer, om den er låst. Prismotoren kaldes uændret.
//
// Forælderen sætter `key`, når hele kalkulationen udskiftes udefra (demo-skift,
// nulstil, indlæsning), så cellernes egen indtastningstekst smides væk.
// ============================================================================

import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { beregnOpsamling } from "../domain/beregning";
import { parseTal } from "../lib/format";
import {
  arbejdeFraKatalog,
  friArbejdslinje,
  friMaterialelinje,
  komponentFraKatalog,
  materialeFraKatalog,
  tomOevrig,
} from "../demo/linjefabrik";
import type { Farve, Katalogmateriale } from "../demo/materialekatalog";
import type { Katalogproces } from "../domain/processer";
import type {
  Arbejdslinje,
  Daekningsgrader,
  Kalkulation,
  Materialelinje,
  Oevriglinje,
} from "../domain/typer";
import type { SagHoved } from "../domain/versionsdata";
import { anvendSourcePilot, type SourcePilotStatus } from "../domain/sourcePilot";
import ArbejdeTabel from "./ArbejdeTabel";
import MaterialeTabel from "./MaterialeTabel";
import MaterialeVaelger from "./MaterialeVaelger";
import OevrigeTabel from "./OevrigeTabel";
import ProcesVaelger from "./ProcesVaelger";
import { Prisbjaelke, Prisopsamling } from "./Prisopsamling";

function Hovedfelt({
  etiket,
  vaerdi,
  onSaet,
  bred = false,
}: {
  etiket: string;
  vaerdi: string;
  onSaet: (v: string) => void;
  bred?: boolean;
}) {
  return (
    <div className={`hovedfelt${bred ? " bred" : ""}`}>
      <label>{etiket}</label>
      <input value={vaerdi} onChange={(e) => onSaet(e.target.value)} />
    </div>
  );
}

/** Sagsfelt fra SMU OS — vises, men redigeres ikke her. */
function Sagsfelt({ etiket, vaerdi, bred = false }: { etiket: string; vaerdi: string; bred?: boolean }) {
  return (
    <div className={`hovedfelt${bred ? " bred" : ""}`} title="Fra SMU OS — rettes på sagen i OS">
      <label>{etiket}</label>
      <div className="hovedfelt-visning">{vaerdi || "—"}</div>
    </div>
  );
}

/** Hvad materialevælgeren skal gøre, når brugeren har valgt noget. */
type VaelgerMaal = { slags: "ny_linje" } | { slags: "komponent"; linjeId: string };

export interface KalkulationFladeProps {
  kalk: Kalkulation;
  saetKalk: Dispatch<SetStateAction<Kalkulation>>;
  /** Sagen fra SMU OS. Uden den er sagshovedet fritekst (demo). */
  sag?: SagHoved;
  /** Låst version: alt vises, intet kan ændres. */
  laast?: boolean;
  /** Vises over materialetabellen, fx markeringen af manuelle kostpriser. */
  advarsel?: ReactNode;
  fodnote: ReactNode;
  /** Source-prisen for piloten (651 Farver). Uden den er alle kostpriser manuelle (demo). */
  sourcePilot?: SourcePilotStatus;
}

export default function KalkulationFlade({
  kalk,
  saetKalk,
  sag,
  laast = false,
  advarsel,
  fodnote,
  sourcePilot,
}: KalkulationFladeProps) {
  const [materialeVaelger, saetMaterialeVaelger] = useState<VaelgerMaal | null>(null);
  const [procesVaelger, saetProcesVaelger] = useState(false);
  const [visSerie, saetVisSerie] = useState(false);

  const serieAktiv = kalk.antalEnheder > 1 || visSerie;
  const op = useMemo(() => beregnOpsamling(kalk), [kalk]);

  // --- ændringshjælpere -----------------------------------------------------

  function aendrMateriale(id: string, aendring: Partial<Materialelinje>) {
    saetKalk((k) => ({
      ...k,
      materialer: k.materialer.map((l) => (l.id === id ? { ...l, ...aendring } : l)),
    }));
  }
  function aendrArbejde(id: string, aendring: Partial<Arbejdslinje>) {
    saetKalk((k) => ({
      ...k,
      arbejde: k.arbejde.map((l) => (l.id === id ? { ...l, ...aendring } : l)),
    }));
  }
  function aendrOevrig(id: string, aendring: Partial<Oevriglinje>) {
    saetKalk((k) => ({
      ...k,
      oevrige: k.oevrige.map((l) => (l.id === id ? { ...l, ...aendring } : l)),
    }));
  }
  function saetDg(d: Partial<Daekningsgrader>) {
    saetKalk((k) => ({ ...k, daekningsgrader: { ...k.daekningsgrader, ...d } }));
  }

  // --- materialevalg --------------------------------------------------------

  function materialeValgt(m: Katalogmateriale, farve: Farve | null, netto: number | null = null) {
    const maal = materialeVaelger;
    saetMaterialeVaelger(null);
    if (!maal) return;

    if (maal.slags === "ny_linje") {
      // Kun en NY linje kan få Source-prisen — eksisterende linjer røres ikke.
      const linje = anvendSourcePilot(
        materialeFraKatalog(m, {
          ...(farve ? { farvekode: farve.kode, farvenavn: farve.dansk } : {}),
          ...(netto !== null ? { netto, grundlag: "manuelt" as const } : {}),
        }),
        sourcePilot,
      );
      saetKalk((k) => ({ ...k, materialer: [...k.materialer, linje] }));
      return;
    }

    // Tilføj som komponent på en eksisterende linje — aldrig som ny hovedlinje,
    // så den ikke kan blive talt med to gange.
    const komp = komponentFraKatalog(m.id, false);
    if (!komp) return;
    saetKalk((k) => ({
      ...k,
      materialer: k.materialer.map((l) =>
        l.id === maal.linjeId ? { ...l, komponenter: [...l.komponenter, komp] } : l,
      ),
    }));
  }

  function procesValgt(p: Katalogproces) {
    saetProcesVaelger(false);
    saetKalk((k) => ({ ...k, arbejde: [...k.arbejde, arbejdeFraKatalog(p.id)] }));
  }

  return (
    <>
      <div className="side">
        {/* Et deaktiveret fieldset slår alle felter og knapper fra på én gang,
            når versionen er låst. Uden ramme, så layoutet er det samme. */}
        <fieldset className="flade-felt" disabled={laast}>
          <div className="sagshoved">
            {sag ? (
              <>
                <Sagsfelt etiket="SMU-nummer" vaerdi={sag.smuNummer} />
                <Sagsfelt etiket="Kunde" vaerdi={sag.kundeNavn} bred />
                <Sagsfelt etiket="Sag" vaerdi={sag.titel} bred />
                <Sagsfelt etiket="Tegningsnr." vaerdi={sag.tegningsNummer} />
              </>
            ) : (
              <>
                <Hovedfelt
                  etiket="SMU-nummer"
                  vaerdi={kalk.smuNr}
                  onSaet={(v) => saetKalk((k) => ({ ...k, smuNr: v }))}
                />
                <Hovedfelt
                  etiket="Kunde"
                  vaerdi={kalk.kunde}
                  onSaet={(v) => saetKalk((k) => ({ ...k, kunde: v }))}
                  bred
                />
                <Hovedfelt
                  etiket="Sag / løsning"
                  vaerdi={kalk.sag}
                  onSaet={(v) => saetKalk((k) => ({ ...k, sag: v }))}
                  bred
                />
                <Hovedfelt
                  etiket="Tegningsnr."
                  vaerdi={kalk.tegningsNr}
                  onSaet={(v) => saetKalk((k) => ({ ...k, tegningsNr: v }))}
                />
              </>
            )}
            {serieAktiv ? (
              <div className="hovedfelt">
                <label>Antal enheder</label>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <input
                    style={{ width: 54 }}
                    value={String(kalk.antalEnheder)}
                    inputMode="numeric"
                    onChange={(e) => {
                      const n = parseTal(e.target.value);
                      saetKalk((k) => ({
                        ...k,
                        antalEnheder: n === null ? 1 : Math.max(1, Math.round(n)),
                      }));
                    }}
                  />
                  <input
                    className="enhedsvalg"
                    style={{ width: 76 }}
                    value={kalk.enhedsnavn}
                    onChange={(e) => saetKalk((k) => ({ ...k, enhedsnavn: e.target.value }))}
                    title="Hvad hedder én enhed? (bil, trailer, facade, skilt …)"
                  />
                </div>
              </div>
            ) : (
              <div className="hovedfelt">
                <label>Serie</label>
                <button className="knap-mini" onClick={() => saetVisSerie(true)}>
                  Slå serie til
                </button>
              </div>
            )}
          </div>

          {kalk.antalEnheder > 1 && (
            <div className="notestribe info">
              <strong>Serie:</strong> {kalk.antalEnheder} {kalk.enhedsnavn}er. Hver post kan sættes til
              <em> Én gang</em> eller <em>Pr. {kalk.enhedsnavn}</em> under linjedetaljer — lay-out laves
              typisk én gang, mens materiale og montering gentages pr. enhed.
            </div>
          )}

          {advarsel}

          <MaterialeTabel
            linjer={kalk.materialer}
            antalEnheder={kalk.antalEnheder}
            enhedsnavn={kalk.enhedsnavn}
            visSerie={serieAktiv}
            onAendr={aendrMateriale}
            onSlet={(id) =>
              saetKalk((k) => ({ ...k, materialer: k.materialer.filter((l) => l.id !== id) }))
            }
            onTilfoej={() => saetMaterialeVaelger({ slags: "ny_linje" })}
            onTilfoejKomponent={(linjeId) => saetMaterialeVaelger({ slags: "komponent", linjeId })}
          />

          <ArbejdeTabel
            linjer={kalk.arbejde}
            antalEnheder={kalk.antalEnheder}
            enhedsnavn={kalk.enhedsnavn}
            visSerie={serieAktiv}
            onAendr={aendrArbejde}
            onSlet={(id) => saetKalk((k) => ({ ...k, arbejde: k.arbejde.filter((l) => l.id !== id) }))}
            onTilfoej={() => saetProcesVaelger(true)}
          />

          <OevrigeTabel
            linjer={kalk.oevrige}
            antalEnheder={kalk.antalEnheder}
            enhedsnavn={kalk.enhedsnavn}
            visSerie={serieAktiv}
            onAendr={aendrOevrig}
            onSlet={(id) => saetKalk((k) => ({ ...k, oevrige: k.oevrige.filter((l) => l.id !== id) }))}
            onTilfoej={() => saetKalk((k) => ({ ...k, oevrige: [...k.oevrige, tomOevrig()] }))}
          />

          <Prisopsamling
            op={op}
            enhedsnavn={kalk.enhedsnavn}
            dg={kalk.daekningsgrader}
            onSaetDg={saetDg}
            onSaetKundevendt={(v) => saetKalk((k) => ({ ...k, kundevendtPrEnhed: v }))}
          />

          {fodnote}
        </fieldset>
      </div>

      <fieldset className="flade-felt" disabled={laast}>
        <Prisbjaelke
          op={op}
          enhedsnavn={kalk.enhedsnavn}
          onSaetKundevendt={(v) => saetKalk((k) => ({ ...k, kundevendtPrEnhed: v }))}
        />
      </fieldset>

      {!laast && materialeVaelger && (
        <MaterialeVaelger
          tilstand={materialeVaelger.slags === "komponent" ? "komponent" : "linje"}
          onVaelg={materialeValgt}
          onLuk={() => saetMaterialeVaelger(null)}
          onFriLinje={() => {
            const maal = materialeVaelger;
            saetMaterialeVaelger(null);
            if (maal?.slags === "ny_linje") {
              saetKalk((k) => ({ ...k, materialer: [...k.materialer, friMaterialelinje()] }));
            }
          }}
        />
      )}

      {!laast && procesVaelger && (
        <ProcesVaelger
          onVaelg={procesValgt}
          onLuk={() => saetProcesVaelger(false)}
          onFriLinje={() => {
            saetProcesVaelger(false);
            saetKalk((k) => ({ ...k, arbejde: [...k.arbejde, friArbejdslinje()] }));
          }}
        />
      )}
    </>
  );
}
