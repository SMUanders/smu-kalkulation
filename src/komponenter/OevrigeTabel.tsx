// ============================================================================
// ØVRIGE POSTER — eksterne varer og ydelser, presenninger, fragt,
// efter regning og manuelt fastsat salgspris.
//
// Typen bestemmer hvilken avancegruppe posten havner i — præcis som Excel,
// hvor presenninger (25 %), eksternt arbejde (30 %) og fragt (ingen avance)
// regnes hver for sig.
// ============================================================================

import { Fragment, useState } from "react";
import { beregnOevrig } from "../domain/beregning";
import { kr } from "../lib/format";
import { DG_STANDARD, EKSTERNT_KONFLIKT } from "../domain/konfiguration";
import type { Enhed, OevrigType, Oevriglinje } from "../domain/typer";
import { enhedTekst, oevrigTypeTekst } from "../domain/typer";
import { Beregnet, TalCelle, TekstCelle, ValgCelle } from "./Celler";

const typeValg: { vaerdi: OevrigType; tekst: string }[] = (
  [
    "ekstern_vare",
    "ekstern_ydelse",
    "presenning",
    "fragt",
    "efter_regning",
    "efter_regning_estimat",
    "fast_salgspris",
  ] as OevrigType[]
).map((t) => ({ vaerdi: t, tekst: oevrigTypeTekst[t] }));

const enhedValg: { vaerdi: Enhed; tekst: string }[] = (
  ["stk", "m2", "lbm", "liter"] as Enhed[]
).map((e) => ({ vaerdi: e, tekst: enhedTekst[e] }));

function gruppeMaerkat(type: OevrigType) {
  switch (type) {
    case "fragt":
      return { klasse: "m-graa", tekst: "ingen avance" };
    case "presenning":
      return { klasse: "m-blaa", tekst: `${DG_STANDARD.presenning} % DG` };
    case "efter_regning":
      return { klasse: "m-graa", tekst: "uden for prisen" };
    case "fast_salgspris":
      return { klasse: "m-violet", tekst: "fast pris" };
    default:
      return { klasse: "m-orange", tekst: `${DG_STANDARD.eksternt} % DG · uafklaret` };
  }
}

interface Props {
  linjer: Oevriglinje[];
  antalEnheder: number;
  enhedsnavn: string;
  visSerie: boolean;
  onAendr: (id: string, aendring: Partial<Oevriglinje>) => void;
  onSlet: (id: string) => void;
  onTilfoej: () => void;
}

export default function OevrigeTabel({
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
  const beregninger = linjer.map((l) => {
    const b = beregnOevrig(l);
    sumKost += b.kost * (l.gentagelse === "pr_enhed" ? antalEnheder : 1);
    return b;
  });

  const harEkstern = linjer.some(
    (l) => l.type === "ekstern_vare" || l.type === "ekstern_ydelse" || l.type === "efter_regning_estimat",
  );

  return (
    <section className="sektion">
      <div className="sektion-hoved">
        <span className="sektion-titel">Øvrige poster</span>
        {harEkstern && (
          <span className="maerkat m-orange" title={EKSTERNT_KONFLIKT}>
            DG på eksternt arbejde er uafklaret
          </span>
        )}
        <span className="spacer" />
        <span className="sektion-sum">Kost {kr(sumKost, 2)} kr</span>
      </div>

      <div className="tabelramme">
        <table className="grid gridsmal">
          <thead>
            <tr>
              <th style={{ width: 26 }} />
              <th style={{ minWidth: 260 }}>Beskrivelse</th>
              <th style={{ width: 210 }}>Type</th>
              <th className="h" style={{ width: 76 }}>
                Antal
              </th>
              <th style={{ width: 62 }}>Enhed</th>
              <th className="h" style={{ width: 108 }}>
                Kost/enhed
              </th>
              <th className="h beregnet" style={{ width: 116 }}>
                Kost
              </th>
              <th style={{ minWidth: 200 }}>Note</th>
              <th style={{ width: 34 }} />
            </tr>
          </thead>
          <tbody>
            {linjer.map((l, i) => {
              const b = beregninger[i];
              const aaben = aabne.has(l.id);
              const maerkat = gruppeMaerkat(l.type);
              const fastPris = l.type === "fast_salgspris";

              return (
                <Fragment key={l.id}>
                  <tr className={aaben ? "raekke-aaben" : undefined}>
                    <td className="c">
                      <button className="udvid" onClick={() => skiftAaben(l.id)}>
                        {aaben ? "▾" : "▸"}
                      </button>
                    </td>
                    <td>
                      <div className="mat-navn">
                        <TekstCelle
                          vaerdi={l.beskrivelse}
                          ekstraKlasse="tekst"
                          pladsholder="Post…"
                          onSaet={(v) => onAendr(l.id, { beskrivelse: v })}
                        />
                        <div className="mat-under">
                          <span className={`maerkat ${maerkat.klasse}`}>{maerkat.tekst}</span>
                          {l.leverandoer && <span className="svag">{l.leverandoer}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <ValgCelle
                        vaerdi={l.type}
                        muligheder={typeValg}
                        onSaet={(v) => onAendr(l.id, { type: v })}
                      />
                    </td>
                    <td>
                      <TalCelle
                        vaerdi={l.antal}
                        decimaler={2}
                        onSaet={(v) => onAendr(l.id, { antal: v })}
                      />
                    </td>
                    <td className="svag" style={{ paddingLeft: 7, fontSize: 12 }}>
                      {enhedTekst[l.enhed]}
                    </td>
                    <td>
                      {fastPris ? (
                        <TalCelle
                          vaerdi={l.fastSalgspris}
                          decimaler={2}
                          pladsholder="sæt pris"
                          ekstraKlasse="overstyret"
                          titel="Manuelt fastsat salgspris"
                          onSaet={(v) => onAendr(l.id, { fastSalgspris: v })}
                        />
                      ) : (
                        <TalCelle
                          vaerdi={l.kostPrEnhed}
                          decimaler={2}
                          pladsholder={l.type === "efter_regning" ? "efter regning" : "–"}
                          ekstraKlasse={l.type === "efter_regning" ? "mangler" : ""}
                          onSaet={(v) => onAendr(l.id, { kostPrEnhed: v })}
                        />
                      )}
                    </td>
                    <td className="beregnet h">
                      {b.efterRegningUdenEstimat ? (
                        <span className="maerkat m-graa">Efter regning</span>
                      ) : fastPris ? (
                        <Beregnet tekst={kr(b.fastSalgspris, 2)} titel="Fast salgspris" />
                      ) : (
                        <Beregnet tekst={b.kost ? kr(b.kost, 2) : ""} svag={!b.kost} />
                      )}
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
                            <label>Leverandør</label>
                            <TekstCelle
                              vaerdi={l.leverandoer}
                              pladsholder="—"
                              onSaet={(v) => onAendr(l.id, { leverandoer: v })}
                            />
                          </div>
                          <div className="detalje-felt">
                            <label>Enhed</label>
                            <ValgCelle
                              vaerdi={l.enhed}
                              muligheder={enhedValg}
                              onSaet={(v) => onAendr(l.id, { enhed: v })}
                            />
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
                          <div className="detalje-felt bred">
                            <label>Avancegruppe</label>
                            <span className="svag">
                              {l.type === "fragt"
                                ? "Fragt viderefaktureres uden avance, men indgår i kostgrundlaget før energitillæg."
                                : l.type === "presenning"
                                  ? `Presenninger har egen avancegruppe på ${DG_STANDARD.presenning} %.`
                                  : l.type === "efter_regning"
                                    ? "Uden estimat indgår posten ikke i prisen — den står som synlig påmindelse."
                                    : l.type === "fast_salgspris"
                                      ? "Prisen sættes manuelt og lægges oven på den beregnede salgspris."
                                      : `Eksternt arbejde regnes med ${DG_STANDARD.eksternt} % DG. ${EKSTERNT_KONFLIKT}.`}
                            </span>
                          </div>
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
                  Ingen øvrige poster endnu.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Øvrige poster i alt (kost)
              </td>
              <td className="h">{kr(sumKost, 2)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>

        <div className="tilfoej-raekke">
          <button className="knap-tilfoej" onClick={onTilfoej}>
            + Tilføj øvrig post
          </button>
        </div>
      </div>
    </section>
  );
}
