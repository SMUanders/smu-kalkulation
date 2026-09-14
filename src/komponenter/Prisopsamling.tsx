// ============================================================================
// PRISOPSAMLING — samme opbygning og rækkefølge som Excel-arkets rækker
// 121–137, så tallene kan sammenlignes linje for linje.
//
// Bemærk: "Realiseret DG" fra v0.1 er omdøbt. Vi har endnu ingen faktiske
// omkostninger, så det vi kan vise er FORVENTET dækningsgrad ved den valgte
// salgspris. Egentlig realiseret DG kræver faktisk tid fra SMU Tid, faktisk
// materialeforbrug og faktisk fakturering.
// ============================================================================

import { useState } from "react";
import type { Opsamling } from "../domain/resultat";
import { kr, parseTal, tal } from "../lib/format";
import { DG_MINIMUM, EKSTERNT_KONFLIKT, tillaeg } from "../domain/konfiguration";
import type { Daekningsgrader } from "../domain/typer";
import { TalCelle } from "./Celler";

/** Prisfelt i den faste bjælke. Reformatterer ikke mens man taster. */
function PrisInput({ vaerdi, onSaet }: { vaerdi: number; onSaet: (v: number | null) => void }) {
  const [raa, saetRaa] = useState<string | null>(null);
  return (
    <input
      className="pb-input"
      value={raa !== null ? raa : tal(vaerdi, 2)}
      inputMode="decimal"
      onChange={(e) => saetRaa(e.target.value)}
      onFocus={(e) => {
        saetRaa(tal(vaerdi, 2));
        e.currentTarget.select();
      }}
      onBlur={() => {
        if (raa !== null) onSaet(parseTal(raa));
        saetRaa(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (raa !== null) onSaet(parseTal(raa));
          saetRaa(null);
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          saetRaa(null);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function Dg({ vaerdi, minimum }: { vaerdi: number | null; minimum: number }) {
  if (vaerdi === null) return <span className="svag">–</span>;
  const lav = vaerdi < minimum;
  return (
    <span className={lav ? "dg-lav" : undefined}>
      {tal(vaerdi, 1)} %{lav ? " ⚠" : ""}
    </span>
  );
}

interface Props {
  op: Opsamling;
  enhedsnavn: string;
  dg: Daekningsgrader;
  onSaetDg: (d: Partial<Daekningsgrader>) => void;
  onSaetKundevendt: (v: number | null) => void;
}

export function Prisopsamling({ op, enhedsnavn, dg, onSaetDg, onSaetKundevendt }: Props) {
  const [visDg, saetVisDg] = useState(false);
  const flerEnheder = op.antalEnheder > 1;

  return (
    <section className="sektion">
      <div className="sektion-hoved">
        <span className="sektion-titel">Prisopsamling</span>
        <span className="svag" style={{ fontSize: 11 }}>
          samme opbygning som SMU Kalkulation Master.xlsm (række 121–137)
        </span>
        <span className="spacer" />
        {op.antalUafklarede > 0 && (
          <span className="maerkat m-orange">
            {op.antalUafklarede} post{op.antalUafklarede === 1 ? "" : "er"} mangler stillingtagen —
            de tæller 0
          </span>
        )}
        <button className="knap-mini" onClick={() => saetVisDg((v) => !v)}>
          {visDg ? "Skjul dækningsgrader" : "Vis dækningsgrader"}
        </button>
      </div>

      {visDg && (
        <div className="dg-panel">
          <div className="dg-felt">
            <label>Timer</label>
            <TalCelle vaerdi={dg.timer} decimaler={1} onSaet={(v) => onSaetDg({ timer: v ?? 0 })} />
            <span className="svag">standard 50 %, minimum {DG_MINIMUM.timer} %</span>
          </div>
          <div className="dg-felt">
            <label>Varer</label>
            <TalCelle vaerdi={dg.varer} decimaler={1} onSaet={(v) => onSaetDg({ varer: v ?? 0 })} />
            <span className="svag">standard 40 %, minimum {DG_MINIMUM.varer} %</span>
          </div>
          <div className="dg-felt">
            <label>Presenning</label>
            <TalCelle
              vaerdi={dg.presenning}
              decimaler={1}
              onSaet={(v) => onSaetDg({ presenning: v ?? 0 })}
            />
            <span className="svag">25 %</span>
          </div>
          <div className="dg-felt">
            <label>Eksternt arbejde</label>
            <TalCelle
              vaerdi={dg.eksternt}
              decimaler={1}
              ekstraKlasse="overstyret"
              onSaet={(v) => onSaetDg({ eksternt: v ?? 0 })}
            />
            <span className="maerkat m-orange">Uafklaret — {EKSTERNT_KONFLIKT}</span>
          </div>
          <p className="regelnote" style={{ gridColumn: "1 / -1", padding: 0 }}>
            Dækningsgrad, ikke påslag: salgspris = kost / (1 − DG). Ved 40 % bliver 1.020 kr til
            1.700 kr.
          </p>
        </div>
      )}

      <div className="opsamling">
        <div className="opsamling-kort">
          <h3>Arbejde og materialer</h3>
          <table className="opsum">
            <tbody>
              <tr>
                <td>Tidsforbrug i kr. ({tal(op.antalTimer, 2)} t)</td>
                <td className="v">{kr(op.arbejdskost, 2)} kr</td>
              </tr>
              <tr className="dim">
                <td>Avance timer ({tal(dg.timer, 0)} %)</td>
                <td className="v">{kr(op.arbejdsavance, 2)} kr</td>
              </tr>
              <tr className="delsum">
                <td>Timer salgspris</td>
                <td className="v">{kr(op.arbejdssalg, 2)} kr</td>
              </tr>

              <tr className="streg">
                <td>Vareforbrug</td>
                <td className="v">{kr(op.materialekost, 2)} kr</td>
              </tr>
              <tr className="dim">
                <td>
                  Emballagetillæg {tillaeg.emballagePctAfMaterialekost} %{" "}
                  <span className="svag">(indgår i kost og i DG-grundlaget)</span>
                </td>
                <td className="v">{kr(op.emballagetillaeg, 2)} kr</td>
              </tr>
              <tr className="dim">
                <td>Avance varer ({tal(dg.varer, 0)} %)</td>
                <td className="v">{kr(op.materialeavance, 2)} kr</td>
              </tr>
              <tr className="delsum">
                <td>Varer salgspris</td>
                <td className="v">{kr(op.materialesalg, 2)} kr</td>
              </tr>

              {op.presenningkost > 0 && (
                <>
                  <tr className="streg">
                    <td>Presenninger</td>
                    <td className="v">{kr(op.presenningkost, 2)} kr</td>
                  </tr>
                  <tr className="dim">
                    <td>Avance presenninger ({tal(dg.presenning, 0)} %)</td>
                    <td className="v">{kr(op.presenningavance, 2)} kr</td>
                  </tr>
                </>
              )}

              {op.eksternkost > 0 && (
                <>
                  <tr className="streg">
                    <td>Eksternt arbejde og varer</td>
                    <td className="v">{kr(op.eksternkost, 2)} kr</td>
                  </tr>
                  <tr className="dim">
                    <td>
                      Avance eksterne ({tal(dg.eksternt, 0)} %){" "}
                      <span className="maerkat m-orange">uafklaret</span>
                    </td>
                    <td className="v">{kr(op.eksternavance, 2)} kr</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="opsamling-kort">
          <h3>Samlet</h3>
          <table className="opsum">
            <tbody>
              {op.fragtkost > 0 && (
                <tr>
                  <td>
                    Fragt <span className="svag">(ingen avance)</span>
                  </td>
                  <td className="v">{kr(op.fragtkost, 2)} kr</td>
                </tr>
              )}
              <tr>
                <td>
                  Fast opstart/fakturering{" "}
                  <span className="svag">(148 kr, i kostgrundlaget, ingen avance)</span>
                </td>
                <td className="v">{kr(op.fastOpstart, 2)} kr</td>
              </tr>
              <tr className="streg total">
                <td>Samlet kostpris</td>
                <td className="v">{kr(op.samletKostpris, 2)} kr</td>
              </tr>
              <tr>
                <td>Samlet avance</td>
                <td className="v">{kr(op.samletAvance, 2)} kr</td>
              </tr>
              <tr>
                <td>
                  Energitillæg {tillaeg.energiPct} %{" "}
                  <span className="svag">(på sluttotalen — rammer også fragt)</span>
                </td>
                <td className="v">{kr(op.energitillaeg, 2)} kr</td>
              </tr>
              {op.fastSalg > 0 && (
                <tr>
                  <td>
                    Manuelt fastsatte salgspriser <span className="svag">(uden for Excel-modellen)</span>
                  </td>
                  <td className="v">{kr(op.fastSalg, 2)} kr</td>
                </tr>
              )}
              <tr className="streg total">
                <td>Total salgspris ex. moms</td>
                <td className="v">{kr(op.totalSalgspris, 2)} kr</td>
              </tr>
              <tr className="dim">
                <td>Forventet dækningsgrad ved beregnet pris</td>
                <td className="v">
                  <Dg vaerdi={op.forventetDg} minimum={DG_MINIMUM.varer} />
                </td>
              </tr>
              {flerEnheder && (
                <tr className="dim">
                  <td>Beregnet pris pr. {enhedsnavn}</td>
                  <td className="v">{kr(op.totalPrEnhed, 2)} kr</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="opsamling-kort" style={{ gridColumn: "1 / -1" }}>
          <h3>Kundevendt pris</h3>
          <table className="opsum">
            <tbody>
              <tr>
                <td style={{ width: "60%" }}>
                  Kundevendt pris pr. {enhedsnavn}
                  <div className="svag" style={{ fontSize: 11, marginTop: 2 }}>
                    Ret prisen her — den forventede dækningsgrad opdateres med det samme.
                  </div>
                </td>
                <td className="v" style={{ width: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ width: 150 }}>
                      <TalCelle
                        vaerdi={op.kundevendtPrEnhed}
                        decimaler={2}
                        ekstraKlasse={op.erManueltPrissat ? "overstyret" : ""}
                        titel="Ryd feltet for at vende tilbage til den beregnede pris"
                        onSaet={onSaetKundevendt}
                      />
                    </div>
                    <span className="svag">kr</span>
                  </div>
                  {op.erManueltPrissat ? (
                    <button
                      className="knap-sekundaer"
                      style={{ marginTop: 6 }}
                      onClick={() => onSaetKundevendt(null)}
                    >
                      Brug beregnet pris ({kr(op.totalPrEnhed, 2)} kr)
                    </button>
                  ) : (
                    <div className="svag" style={{ fontSize: 11, marginTop: 4 }}>
                      Følger den beregnede pris
                    </div>
                  )}
                </td>
              </tr>
              {flerEnheder && (
                <tr className="streg total">
                  <td>
                    Potentiel samlet værdi
                    <span className="svag" style={{ fontWeight: 600 }}>
                      {" "}
                      ({op.antalEnheder} × {enhedsnavn})
                    </span>
                  </td>
                  <td className="v">{kr(op.kundevendtSamlet, 2)} kr</td>
                </tr>
              )}
              <tr className={flerEnheder ? "" : "streg"}>
                <td>Forventet dækningsbidrag ved valgt salgspris</td>
                <td className="v">{kr(op.valgtDb, 2)} kr</td>
              </tr>
              <tr>
                <td>Forventet dækningsgrad ved valgt salgspris</td>
                <td className="v">
                  <Dg vaerdi={op.valgtDg} minimum={DG_MINIMUM.varer} />
                </td>
              </tr>
              {op.erManueltPrissat && (
                <tr className="dim">
                  <td>Difference til beregnet pris</td>
                  <td className="v">{kr(op.differenceTilBeregnet, 2)} kr</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="regelnote" style={{ padding: "8px 0 0" }}>
            <strong>Forventet</strong>, ikke realiseret. Egentlig realiseret dækningsgrad kræver
            faktisk tid fra SMU Tid, faktisk materialeforbrug, faktisk faktureret pris og øvrige
            faktiske omkostninger — ingen af delene findes endnu.
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function Prisbjaelke({
  op,
  enhedsnavn,
  onSaetKundevendt,
}: {
  op: Opsamling;
  enhedsnavn: string;
  onSaetKundevendt: (v: number | null) => void;
}) {
  const lavDg = op.valgtDg !== null && op.valgtDg < DG_MINIMUM.varer;

  return (
    <div className="prisbjaelke">
      <div className="prisbjaelke-indhold">
        <div className="pb-celle">
          <div className="k">Samlet kostpris</div>
          <div className="v">
            {kr(op.samletKostpris)} <small>kr</small>
          </div>
        </div>
        <div className="pb-skel" />
        <div className="pb-celle">
          <div className="k">Total salgspris</div>
          <div className="v">
            {kr(op.totalSalgspris)} <small>kr</small>
          </div>
        </div>
        <div className="pb-skel" />
        <div className="pb-celle">
          <div className="k">Kundevendt pr. {enhedsnavn}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <PrisInput vaerdi={op.kundevendtPrEnhed} onSaet={onSaetKundevendt} />
            <small style={{ color: "#b8c8d1", fontWeight: 700 }}>kr</small>
          </div>
          {op.erManueltPrissat && (
            <button className="pb-nulstil" onClick={() => onSaetKundevendt(null)}>
              nulstil til beregnet
            </button>
          )}
        </div>
        {op.antalEnheder > 1 && (
          <>
            <div className="pb-skel" />
            <div className="pb-celle">
              <div className="k">Samlet værdi ({op.antalEnheder} stk.)</div>
              <div className="v">
                {kr(op.kundevendtSamlet)} <small>kr</small>
              </div>
            </div>
          </>
        )}
        <div className="pb-skel" />
        <div className={`pb-celle ${lavDg ? "" : "fremhaev"}`}>
          <div className="k">Forventet DG ved valgt pris</div>
          <div className="v" style={lavDg ? { color: "#ffb4b4" } : undefined}>
            {op.valgtDg !== null ? `${tal(op.valgtDg, 1)} %` : "–"}{" "}
            <small>DB {kr(op.valgtDb)} kr</small>
          </div>
        </div>
        <div className="pb-spacer" />
        {op.antalUafklarede > 0 && (
          <div className="pb-celle">
            <span className="maerkat m-orange">
              {op.antalUafklarede} post{op.antalUafklarede === 1 ? "" : "er"} uden stillingtagen
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
