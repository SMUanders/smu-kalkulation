// ============================================================================
// ARBEJDE — kompakt grid.
// VIGTIGT: tider autoudfyldes ALDRIG. De vurderes fagligt fra gang til gang.
// Risikotillæg er et selvstændigt felt, men fylder kun visuelt når det bruges.
// Timekost er låst og kommer fra proceskataloget (Excel-satserne).
// ============================================================================

import { Fragment, useState } from "react";
import { beregnArbejde } from "../domain/beregning";
import { kr, tal } from "../lib/format";
import { findProces } from "../domain/processer";
import type { Arbejdslinje } from "../domain/typer";
import { Beregnet, TalCelle, TekstCelle } from "./Celler";

interface Props {
  linjer: Arbejdslinje[];
  antalEnheder: number;
  enhedsnavn: string;
  visSerie: boolean;
  onAendr: (id: string, aendring: Partial<Arbejdslinje>) => void;
  onSlet: (id: string) => void;
  onTilfoej: () => void;
}

export default function ArbejdeTabel({
  linjer,
  antalEnheder,
  enhedsnavn,
  visSerie,
  onAendr,
  onSlet,
  onTilfoej,
}: Props) {
  const [aabne, saetAabne] = useState<Set<string>>(new Set());

  function skiftAaben(id: string) {
    saetAabne((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  let sumKost = 0;
  let sumTimer = 0;
  let sumRisiko = 0;
  const beregninger = linjer.map((l) => {
    const b = beregnArbejde(l);
    const f = l.gentagelse === "pr_enhed" ? antalEnheder : 1;
    sumKost += b.kost * f;
    sumTimer += (b.kalkuleretTid ?? 0) * f;
    sumRisiko += (l.risikoTillaeg ?? 0) * f;
    return b;
  });
  const antalUvurderede = beregninger.filter((b) => b.uafklaret).length;

  return (
    <section className="sektion">
      <div className="sektion-hoved">
        <span className="sektion-titel">Arbejde</span>
        {antalUvurderede > 0 && (
          <span className="maerkat m-orange">{antalUvurderede} ikke vurderet</span>
        )}
        {sumRisiko > 0 && (
          <span className="maerkat m-graa" title="Samlet risikotillæg">
            heraf {tal(sumRisiko, 2)} t risiko
          </span>
        )}
        <span className="spacer" />
        <span className="sektion-sum">
          {tal(sumTimer, 2)} t · Kost {kr(sumKost, 2)} kr
        </span>
      </div>

      <div className="tabelramme">
        <table className="grid gridsmal">
          <thead>
            <tr>
              <th style={{ width: 26 }} />
              <th style={{ minWidth: 280 }}>Proces</th>
              <th className="h" style={{ width: 116 }}>
                Fagligt estimat
              </th>
              <th className="h" style={{ width: 104 }}>
                Risikotillæg
              </th>
              <th className="h beregnet" style={{ width: 112 }}>
                Kalkuleret tid
              </th>
              <th className="h" style={{ width: 100 }}>
                Kost/time
              </th>
              <th className="h beregnet" style={{ width: 116 }}>
                Kost
              </th>
              <th style={{ minWidth: 230 }}>Note</th>
              <th style={{ width: 34 }} />
            </tr>
          </thead>
          <tbody>
            {linjer.map((l, i) => {
              const b = beregninger[i];
              const aaben = aabne.has(l.id);
              const harRisiko = (l.risikoTillaeg ?? 0) !== 0;
              const proces = l.katalogId ? findProces(l.katalogId) : undefined;

              return (
                <Fragment key={l.id}>
                  <tr className={aaben ? "raekke-aaben" : undefined}>
                    <td className="c">
                      <button
                        className="udvid"
                        title={aaben ? "Skjul detaljer" : "Vis detaljer"}
                        onClick={() => skiftAaben(l.id)}
                      >
                        {aaben ? "▾" : "▸"}
                      </button>
                    </td>
                    <td>
                      <TekstCelle
                        vaerdi={l.proces}
                        ekstraKlasse="tekst"
                        pladsholder="Proces…"
                        titel={proces?.note}
                        onSaet={(v) => onAendr(l.id, { proces: v })}
                      />
                    </td>
                    <td>
                      <TalCelle
                        vaerdi={l.fagligtEstimat}
                        decimaler={2}
                        pladsholder="ikke vurderet"
                        ekstraKlasse={l.fagligtEstimat === null ? "mangler" : ""}
                        titel="Fagligt skøn i timer. Udfyldes altid manuelt — aldrig af systemet."
                        onSaet={(v) => onAendr(l.id, { fagligtEstimat: v })}
                      />
                    </td>
                    <td>
                      {/* Risikotillæg fylder kun når det bruges */}
                      <TalCelle
                        vaerdi={l.risikoTillaeg}
                        decimaler={2}
                        pladsholder="+ risiko"
                        ekstraKlasse={harRisiko ? "risiko" : "hvilende"}
                        titel="Ekstra tid afsat til risiko. Holdes bevidst adskilt fra det faglige estimat."
                        onSaet={(v) => onAendr(l.id, { risikoTillaeg: v })}
                      />
                    </td>
                    <td className="beregnet h">
                      <Beregnet
                        tekst={b.kalkuleretTid !== null ? `${tal(b.kalkuleretTid, 2)} t` : ""}
                        svag={b.kalkuleretTid === null}
                        titel="Fagligt estimat + risikotillæg"
                      />
                    </td>
                    <td className="h">
                      <span
                        className={`laast-vaerdi${b.kostErOverstyret ? " er-overstyret" : ""}`}
                        title="Timekost fra proceskataloget — låst"
                      >
                        {kr(b.kostPrTime, 2)}
                      </span>
                    </td>
                    <td className="beregnet h">
                      <Beregnet
                        tekst={b.kalkuleretTid !== null ? kr(b.kost, 2) : ""}
                        svag={b.kalkuleretTid === null}
                      />
                    </td>
                    <td>
                      <TekstCelle
                        vaerdi={l.note}
                        pladsholder="—"
                        onSaet={(v) => onAendr(l.id, { note: v })}
                      />
                    </td>
                    <td className="c">
                      <button className="knap-slet" title="Fjern linje" onClick={() => onSlet(l.id)}>
                        ×
                      </button>
                    </td>
                  </tr>

                  {aaben && (
                    <tr className="detalje-raekke">
                      <td />
                      <td colSpan={8}>
                        <div className="detaljer">
                          <div className="detalje-felt">
                            <label>Kost/time</label>
                            {l.kostOverride === null ? (
                              <div className="kost-laast">
                                <span className="laast-vaerdi">{kr(b.kostPrTime, 2)} kr</span>
                                <span className="svag">fra proceskataloget — låst</span>
                                <button
                                  className="knap-mini advarsel"
                                  onClick={() => onAendr(l.id, { kostOverride: b.kostPrTime })}
                                >
                                  Override
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="notestribe" style={{ margin: "0 0 8px" }}>
                                  <strong>Override gælder kun denne kalkulation.</strong> Katalogets
                                  sats er {kr(l.kostPrTime ?? 0, 2)} kr/t.
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <div style={{ width: 120 }}>
                                    <TalCelle
                                      vaerdi={l.kostOverride}
                                      decimaler={2}
                                      ekstraKlasse="overstyret"
                                      onSaet={(v) => onAendr(l.id, { kostOverride: v })}
                                    />
                                  </div>
                                  <button
                                    className="knap-mini"
                                    onClick={() => onAendr(l.id, { kostOverride: null })}
                                  >
                                    Fortryd
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {visSerie && (
                            <div className="detalje-felt">
                              <label>Serie</label>
                              <select
                                className="celle"
                                value={l.gentagelse}
                                onChange={(e) =>
                                  onAendr(l.id, {
                                    gentagelse: e.target.value as "engang" | "pr_enhed",
                                  })
                                }
                              >
                                <option value="engang">Én gang</option>
                                <option value="pr_enhed">Pr. {enhedsnavn}</option>
                              </select>
                            </div>
                          )}

                          {proces?.note && (
                            <div className="detalje-felt bred">
                              <label>Om processen</label>
                              <span className="svag">{proces.note}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {linjer.length === 0 && (
              <tr>
                <td colSpan={9} className="c svag" style={{ padding: 16 }}>
                  Ingen arbejdsposter endnu.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Arbejde i alt
              </td>
              <td className="h">{tal(sumTimer, 2)} t</td>
              <td />
              <td className="h">{kr(sumKost, 2)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>

        <div className="tilfoej-raekke">
          <button className="knap-tilfoej" onClick={onTilfoej}>
            + Tilføj proces
          </button>
        </div>
      </div>

      <p className="regelnote">
        Kalkulation ejer <strong>estimeret</strong> tid. SMU Tid ejer faktisk registreret tid.
        Skærestue kalkuleres samlet, selv om faktisk tid senere kan deles i skæring, oppilning og
        applikation. Ingen tid udfyldes automatisk ud fra materialevalget.
      </p>
    </section>
  );
}
