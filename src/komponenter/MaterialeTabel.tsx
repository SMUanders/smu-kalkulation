// ============================================================================
// MATERIALER (v0.3.1) — roligere og tydeligere.
//
// En normal linje kan forstås uden at åbne noget:
//   Oracal 751 · 050 mørkeblå      1260 mm   [9,94]   11,5   lbm   kost
//     ↳ Polytape TP160                       følger   11,5   lbm   kost
//
// Grundlag er metadata. Det står som rolig sekundær tekst under forbruget
// ("Grundlag: Tegnestue"), aldrig som badge i selve talfeltet.
// Undtagelsen er manglende forbrug: rødt "Mangler forbrug", fordi det kræver
// handling. Grundlaget ændres under Mere.
//
// Afhængige materialer (laminat, ink, applikationsfolie) er egne, indrykkede
// omkostningslinjer, men de ejer ikke deres eget forbrug: de følger hoved-
// materialets kalkulerede forbrug. Ink regnes om til m² med banebredden.
//
// Prismotoren er uændret. Linjerne her er en opdeling af den samme
// materialekost, som beregnMateriale() allerede regner:
//   kostTotal = kalkuleret forbrug × (basiskost + aktive komponenter)
//
// Undtagelser ligger bag tre målrettede handlinger — kun ét panel ad gangen:
//   Farve · Prisgrundlag · Mere
// ============================================================================

import { Fragment, useState } from "react";
import { beregnMateriale } from "../domain/beregning";
import { kr, tal } from "../lib/format";
import {
  andreBredder,
  findMateriale,
  materialekatalog,
  serieFor,
  vareForPrisgruppe,
  type Farve,
  type Serie,
} from "../demo/materialekatalog";
import { komponentFraKatalog, skiftTilKatalog } from "../demo/linjefabrik";
import { forbrugsregler } from "../domain/konfiguration";
import type { Grundlag, Komponentlinje, Materialelinje } from "../domain/typer";
import { enhedTekst, grundlagTekst } from "../domain/typer";
import { Beregnet, TalCelle, TekstCelle, ValgCelle } from "./Celler";

const grundlagValg: { vaerdi: Grundlag; tekst: string }[] = (
  ["tegnestue", "estimat", "manuelt", "coreldraw", "uafklaret"] as Grundlag[]
).map((g) => ({ vaerdi: g, tekst: grundlagTekst[g] }));

/** Kort, rolig visningstekst til listen. Datamodellen er uændret. */
const GRUNDLAG_KORT: Record<Grundlag, string> = {
  tegnestue: "Tegnestue",
  estimat: "Estimat",
  manuelt: "Manuel",
  coreldraw: "CorelDraw",
  uafklaret: "ikke angivet",
};

function grundlagKlasse(g: Grundlag): string {
  switch (g) {
    case "tegnestue":
      return "m-groen";
    case "estimat":
      return "m-orange";
    case "coreldraw":
      return "m-violet";
    case "uafklaret":
      return "m-roed";
    default:
      return "m-graa";
  }
}

/**
 * En komponents afledte forbrug og kost — samme regel som prismotoren:
 * ink prissættes pr. m² og ganges med banebredden i meter.
 */
function komponentTal(k: Komponentlinje, kalk: number | null, breddeMm: number | null) {
  if (kalk === null) return { forbrug: null, enhed: k.prisErPrM2 ? "m²" : null, kost: 0 };
  if (k.prisErPrM2) {
    const m2 = breddeMm ? kalk * (breddeMm / 1000) : 0;
    return { forbrug: m2, enhed: "m²", kost: m2 * k.kostPrEnhed };
  }
  return { forbrug: kalk, enhed: null, kost: kalk * k.kostPrEnhed };
}

type Panelslags = "farve" | "pris" | "mere";

interface Props {
  linjer: Materialelinje[];
  antalEnheder: number;
  enhedsnavn: string;
  visSerie: boolean;
  onAendr: (id: string, aendring: Partial<Materialelinje>) => void;
  onSlet: (id: string) => void;
  onTilfoej: () => void;
  onTilfoejKomponent: (linjeId: string) => void;
}

export default function MaterialeTabel({
  linjer,
  antalEnheder,
  enhedsnavn,
  visSerie,
  onAendr,
  onSlet,
  onTilfoej,
  onTilfoejKomponent,
}: Props) {
  // Kun ét panel ad gangen i hele tabellen
  const [panel, saetPanel] = useState<{ id: string; slags: Panelslags } | null>(null);

  function skiftPanel(id: string, slags: Panelslags) {
    saetPanel((p) => (p && p.id === id && p.slags === slags ? null : { id, slags }));
  }

  let sumKost = 0;
  const beregninger = linjer.map((l) => {
    const b = beregnMateriale(l);
    sumKost += b.kostTotal * (l.gentagelse === "pr_enhed" ? antalEnheder : 1);
    return b;
  });
  const antalUafklarede = beregninger.filter((b) => b.uafklaret).length;

  function opdaterKomponent(l: Materialelinje, k: Komponentlinje, a: Partial<Komponentlinje>) {
    onAendr(l.id, { komponenter: l.komponenter.map((x) => (x.id === k.id ? { ...x, ...a } : x)) });
  }

  function skiftKomponent(l: Materialelinje, k: Komponentlinje, nyId: string) {
    const ny = komponentFraKatalog(nyId, false);
    if (!ny) return;
    onAendr(l.id, {
      komponenter: l.komponenter.map((x) => (x.id === k.id ? { ...ny, aktiv: x.aktiv } : x)),
    });
  }

  return (
    <section className="sektion">
      <div className="sektion-hoved">
        <span className="sektion-titel">Materialer</span>
        {antalUafklarede > 0 && (
          <span className="maerkat m-orange">{antalUafklarede} mangler forbrug eller pris</span>
        )}
        <span className="spacer" />
        <span className="sektion-sum">Kost {kr(sumKost, 2)} kr</span>
      </div>

      <div className="tabelramme">
        <table className="grid gridsmal">
          <thead>
            <tr>
              <th style={{ minWidth: 330 }}>Materiale</th>
              <th className="h" style={{ width: 92 }}>
                Bredde
              </th>
              <th className="h" style={{ width: 150 }}>
                Netto
              </th>
              <th className="h beregnet" style={{ width: 104 }}>
                Kalkuleret
              </th>
              <th style={{ width: 52 }}>Enhed</th>
              <th className="h beregnet" style={{ width: 116 }}>
                Kost
              </th>
              <th style={{ width: 232 }} />
              <th style={{ width: 34 }} />
            </tr>
          </thead>
          <tbody>
            {linjer.map((l, i) => {
              const b = beregninger[i];
              const kat = l.katalogId ? findMateriale(l.katalogId) : undefined;
              const serie = l.katalogId ? serieFor(l.katalogId) : undefined;
              const regel = forbrugsregler[l.form];
              const aabent = panel && panel.id === l.id ? panel.slags : null;

              const detalje = l.farvekode
                ? `${l.farvekode} ${l.farvenavn}`.trim()
                : l.prisgruppe && l.prisgruppe !== "Standard"
                  ? l.prisgruppe
                  : "";

              const harFarvevalg = !!serie && (serie.prisgrupper.length > 1 || serie.farver.length > 0);
              const bufferAfviger = l.bufferPct !== null && l.bufferPct !== regel.bufferPct;
              const ikkeStandardbredde = !!serie && l.breddeMm !== serie.standardbreddeMm;
              const harUnder =
                (!!l.farvekode && !!l.prisgruppe && l.prisgruppe !== "Standard") ||
                !!kat?.indeholder ||
                b.kostErOverstyret ||
                bufferAfviger;

              // Hovedlinjens egen kost — komponenterne står på deres egne linjer
              const hovedKost = b.kalkuleretForbrug !== null ? b.kalkuleretForbrug * b.basisKost : 0;

              return (
                <Fragment key={l.id}>
                  <tr className={`hoved-linje${aabent ? " raekke-aaben" : ""}${l.komponenter.length ? " har-komp" : ""}`}>
                    <td>
                      <div className="mat-navn">
                        {l.katalogId ? (
                          <div className="mat-titel" title={kat ? `${kat.navn} · ${kat.prisgruppe}` : undefined}>
                            <strong>{serie ? serie.navn : l.beskrivelse}</strong>
                            {detalje && <span className="mat-detalje"> · {detalje}</span>}
                          </div>
                        ) : (
                          <TekstCelle
                            vaerdi={l.beskrivelse}
                            ekstraKlasse="tekst"
                            pladsholder="Materiale…"
                            onSaet={(v) => onAendr(l.id, { beskrivelse: v })}
                          />
                        )}
                        {harUnder && (
                          <div className="mat-under">
                            {l.farvekode && l.prisgruppe && l.prisgruppe !== "Standard" && (
                              <span className="svag" title="Prisgruppe — det er den, der giver prisen">
                                {l.prisgruppe}
                              </span>
                            )}
                            {kat?.indeholder && (
                              <span className="svag" title="Færdig kombination — komponenterne er allerede i prisen">
                                kombination: {kat.indeholder.join(" + ")}
                              </span>
                            )}
                            {b.kostErOverstyret && (
                              <span className="maerkat m-roed" title="Kostprisen er overstyret på denne kalkulation">
                                kostpris overstyret
                              </span>
                            )}
                            {bufferAfviger && (
                              <span className="maerkat m-orange" title={`Standard: ${regel.note}`}>
                                buffer {tal(l.bufferPct, 1)} %
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="h">
                      <span
                        className={`bredde${ikkeStandardbredde ? " afviger" : ""}`}
                        title={
                          ikkeStandardbredde
                            ? `Afviger fra seriens standardbredde (${serie?.standardbreddeMm} mm)`
                            : "Standardbredde — skift under Mere"
                        }
                      >
                        {l.breddeMm ? `${l.breddeMm} mm` : "–"}
                      </span>
                    </td>
                    <td>
                      <div className="netto-celle">
                        <TalCelle
                          vaerdi={l.netto}
                          decimaler={3}
                          pladsholder="tast forbrug"
                          ekstraKlasse={`primaer${l.netto === null ? " mangler" : ""}`}
                          titel={`Nettoforbrug uden spild — grundlag: ${grundlagTekst[l.grundlag]}`}
                          onSaet={(v) =>
                            onAendr(l.id, {
                              netto: v,
                              grundlag: v !== null && l.grundlag === "uafklaret" ? "manuelt" : l.grundlag,
                            })
                          }
                        />
                        {l.netto === null ? (
                          <span className="grundlag-tekst mangler" title="Der er ikke taget stilling til forbruget">
                            Mangler forbrug
                          </span>
                        ) : (
                          <span className="grundlag-tekst" title="Hvor forbrugstallet kommer fra — ændres under Mere">
                            Grundlag: {GRUNDLAG_KORT[l.grundlag]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="beregnet">
                      <TalCelle
                        vaerdi={b.kalkuleretForbrug}
                        decimaler={3}
                        pladsholder="–"
                        ekstraKlasse={b.erOverstyret ? "overstyret" : ""}
                        titel={
                          b.erOverstyret
                            ? "Overstyret manuelt. Ryd feltet for at vende tilbage til den beregnede værdi."
                            : `netto + ${tal(b.bufferPct, 1)} % buffer${
                                b.afrundTrin ? `, rundet op til ${tal(b.afrundTrin, 1)}` : ""
                              }`
                        }
                        onSaet={(v) => onAendr(l.id, { overrideForbrug: v })}
                      />
                    </td>
                    <td className="svag" style={{ paddingLeft: 7, fontSize: 12 }}>
                      {enhedTekst[l.enhed]}
                    </td>
                    <td className="beregnet h">
                      <Beregnet
                        tekst={b.uafklaret ? "" : kr(hovedKost, 2)}
                        svag={b.uafklaret}
                        titel={
                          b.komponentKost > 0 && !b.uafklaret
                            ? `${kr(b.basisKost, 2)} kr/${enhedTekst[l.enhed]}. Inkl. komponenter: ${kr(b.kostTotal, 2)} kr`
                            : `${kr(b.basisKost, 2)} kr/${enhedTekst[l.enhed]}`
                        }
                      />
                    </td>
                    <td>
                      <div className="linje-handlinger">
                        {harFarvevalg && (
                          <button
                            className={`lh-knap${aabent === "farve" ? " aktiv" : ""}`}
                            onClick={() => skiftPanel(l.id, "farve")}
                          >
                            Farve
                          </button>
                        )}
                        <button
                          className={`lh-knap${aabent === "pris" ? " aktiv" : ""}`}
                          onClick={() => skiftPanel(l.id, "pris")}
                        >
                          Prisgrundlag
                        </button>
                        <button
                          className={`lh-knap${aabent === "mere" ? " aktiv" : ""}`}
                          onClick={() => skiftPanel(l.id, "mere")}
                        >
                          Mere
                        </button>
                      </div>
                    </td>
                    <td className="c">
                      <button className="knap-slet" title="Fjern linje og dens komponenter" onClick={() => onSlet(l.id)}>
                        ×
                      </button>
                    </td>
                  </tr>

                  {/* Afhængige materialer — egne omkostningslinjer, bundet til hovedlinjen */}
                  {l.komponenter.map((k, ki) => {
                    const kk = findMateriale(k.katalogId);
                    const alternativer = kk ? materialekatalog.filter((m) => m.kategori === kk.kategori) : [];
                    const t = komponentTal(k, b.kalkuleretForbrug, l.breddeMm);
                    const sidste = ki === l.komponenter.length - 1;
                    return (
                      <tr
                        key={k.id}
                        className={`komp-linje${k.aktiv ? "" : " er-fra"}${sidste ? " sidste" : ""}`}
                      >
                        <td>
                          <div className="komp-navn-celle">
                            <span className="komp-pil">↳</span>
                            <span className="komp-navn">{k.navn}</span>
                            {!k.aktiv && <span className="svag lille">slået fra</span>}
                          </div>
                        </td>
                        <td className="h">
                          <span className="svag lille">{kk?.breddeMm ? `${kk.breddeMm} mm` : ""}</span>
                        </td>
                        <td className="h">
                          <span
                            className="svag lille"
                            title={
                              k.prisErPrM2
                                ? `Afledt: kalkuleret forbrug × banebredde ${tal(l.breddeMm ? l.breddeMm / 1000 : null, 2)} m`
                                : "Følger hovedmaterialets kalkulerede forbrug"
                            }
                          >
                            {k.prisErPrM2 ? "× bredde" : "følger"}
                          </span>
                        </td>
                        <td className="beregnet h">
                          <span className="komp-tal">{t.forbrug !== null ? tal(t.forbrug, k.prisErPrM2 ? 2 : 3) : "–"}</span>
                        </td>
                        <td className="svag" style={{ paddingLeft: 7, fontSize: 12 }}>
                          {t.enhed ?? enhedTekst[l.enhed]}
                        </td>
                        <td className="beregnet h">
                          <span className="komp-tal" title={`${kr(k.kostPrEnhed, 2)} kr/${k.prisErPrM2 ? "m²" : enhedTekst[l.enhed]}`}>
                            {!k.aktiv ? "–" : t.forbrug !== null ? kr(t.kost, 2) : ""}
                          </span>
                        </td>
                        <td>
                          <div className="linje-handlinger">
                            {alternativer.length > 1 && (
                              <select
                                className="komp-skift"
                                value={k.katalogId}
                                title="Vælg en anden komponent af samme slags"
                                onChange={(e) => skiftKomponent(l, k, e.target.value)}
                              >
                                {alternativer.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.navn}
                                    {m.breddeMm ? ` · ${m.breddeMm} mm` : ""}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              className="lh-knap"
                              title={k.aktiv ? "Slå komponenten fra — den tæller så ikke med" : "Slå komponenten til igen"}
                              onClick={() => opdaterKomponent(l, k, { aktiv: !k.aktiv })}
                            >
                              {k.aktiv ? "slå fra" : "slå til"}
                            </button>
                          </div>
                        </td>
                        <td className="c">
                          <button
                            className="knap-slet"
                            title="Fjern komponenten"
                            onClick={() => onAendr(l.id, { komponenter: l.komponenter.filter((x) => x.id !== k.id) })}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {aabent && (
                    <tr className="panel-raekke">
                      <td colSpan={8}>
                        <div className="panel" data-panel={aabent}>
                          {aabent === "farve" && serie && (
                            <FarvePanel linje={l} serie={serie} onAendr={(a) => onAendr(l.id, a)} />
                          )}
                          {aabent === "pris" && (
                            <PrisPanel
                              linje={l}
                              basisKost={b.basisKost}
                              komponentKost={b.komponentKost}
                              effektiv={b.effektivKostPrEnhed}
                              onAendr={(a) => onAendr(l.id, a)}
                            />
                          )}
                          {aabent === "mere" && (
                            <MerePanel
                              linje={l}
                              serie={serie}
                              visSerie={visSerie}
                              enhedsnavn={enhedsnavn}
                              onAendr={(a) => onAendr(l.id, a)}
                              onTilfoejKomponent={() => onTilfoejKomponent(l.id)}
                            />
                          )}
                          <button className="panel-luk" title="Luk" onClick={() => saetPanel(null)}>
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {linjer.length === 0 && (
              <tr>
                <td colSpan={8} className="c svag" style={{ padding: 16 }}>
                  Ingen materialer endnu.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Materialekost i alt, inkl. komponenter
                {visSerie && ` (serieposter ganget med ${antalEnheder} ${enhedsnavn})`}
              </td>
              <td className="h">{kr(sumKost, 2)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>

        <div className="tilfoej-raekke">
          <button className="knap-tilfoej" onClick={onTilfoej}>
            + Tilføj materiale
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Farve — kun prisgruppe og seriens farver
// ---------------------------------------------------------------------------

function FarvePanel({
  linje,
  serie,
  onAendr,
}: {
  linje: Materialelinje;
  serie: Serie;
  onAendr: (a: Partial<Materialelinje>) => void;
}) {
  const [q, saetQ] = useState("");

  function skiftGruppe(gruppe: string, farve: Farve | null) {
    if (gruppe === linje.prisgruppe) {
      onAendr(farve ? { farvekode: farve.kode, farvenavn: farve.dansk } : { farvekode: "", farvenavn: "" });
      return;
    }
    const ny = vareForPrisgruppe(serie, gruppe, linje.breddeMm);
    if (!ny) return;
    onAendr({
      ...skiftTilKatalog(linje, ny, false),
      ...(farve ? { farvekode: farve.kode, farvenavn: farve.dansk } : {}),
    });
  }

  const ql = q.trim().toLowerCase();
  const farver = serie.farver.filter(
    (f) =>
      f.prisgruppe === linje.prisgruppe &&
      (!ql || [f.kode, f.dansk, f.producentnavn].join(" ").toLowerCase().includes(ql)),
  );
  const andreGrupper = serie.farver.filter((f) => f.prisgruppe !== linje.prisgruppe);

  return (
    <div className="panel-indhold">
      <div className="panel-titel">Farve</div>
      {serie.prisgrupper.length > 1 && (
        <div className="panel-felt">
          <label>Prisgruppe</label>
          <div className="pg-knapper">
            {serie.prisgrupper.map((p) => {
              const k = vareForPrisgruppe(serie, p.navn, linje.breddeMm);
              return (
                <button
                  key={p.navn}
                  className={`pg-knap lille${linje.prisgruppe === p.navn ? " valgt" : ""}`}
                  onClick={() => skiftGruppe(p.navn, null)}
                >
                  <span>{p.navn}</span>
                  <small>{k ? `${kr(k.kostPrEnhed, 2)} kr` : ""}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel-felt">
        <label>Farve i {linje.prisgruppe}</label>
        {serie.farver.length > 4 && (
          <input
            className="farve-soeg lille"
            value={q}
            placeholder="Søg kode eller navn"
            onChange={(e) => saetQ(e.target.value)}
          />
        )}
        <div className="farve-chips">
          <button
            className={`farve-chip${!linje.farvekode ? " valgt" : ""}`}
            onClick={() => skiftGruppe(linje.prisgruppe, null)}
            title="Kalkulér på prisgruppen alene"
          >
            Ingen konkret farve
          </button>
          {farver.map((f) => (
            <button
              key={f.kode}
              className={`farve-chip${linje.farvekode === f.kode ? " valgt" : ""}`}
              title={`${f.producentnavn} · kilde: ${f.kilde === "source" ? "ORAFOL-navn i SMU Source" : "Citan-casen"}`}
              onClick={() => skiftGruppe(f.prisgruppe, f)}
            >
              <strong>{f.kode}</strong> {f.dansk}
            </button>
          ))}
        </div>
        {andreGrupper.length > 0 && (
          <div className="farve-chips">
            <span className="svag" style={{ fontSize: 11 }}>
              I andre prisgrupper:
            </span>
            {andreGrupper.map((f) => (
              <button
                key={f.kode}
                className="farve-chip dim"
                title={`Skifter prisgruppe til ${f.prisgruppe}`}
                onClick={() => skiftGruppe(f.prisgruppe, f)}
              >
                {f.kode} {f.dansk} <small>· {f.prisgruppe}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="panel-hjaelp">
        Prisen følger prisgruppen. Farvekoden er produktionsinformation og kan udelades.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prisgrundlag — kun leverandør, kostpris og override
// ---------------------------------------------------------------------------

function PrisPanel({
  linje,
  basisKost,
  komponentKost,
  effektiv,
  onAendr,
}: {
  linje: Materialelinje;
  basisKost: number;
  komponentKost: number;
  effektiv: number;
  onAendr: (a: Partial<Materialelinje>) => void;
}) {
  const [visOverride, saetVisOverride] = useState(linje.kostOverride !== null);
  const kat = linje.katalogId ? findMateriale(linje.katalogId) : undefined;
  const enhed = enhedTekst[linje.enhed];
  const paaAlternativ = kat && kat.altLeverandoer && linje.leverandoer === kat.altLeverandoer;

  return (
    <div className="panel-indhold">
      <div className="panel-titel">Prisgrundlag</div>
      <div className="pris-grid">
        <span className="pg-k">Leverandør</span>
        <span className="pg-v">
          {linje.leverandoer || "—"}
          {kat?.altLeverandoer && kat.altKostPrEnhed !== null && (
            <button
              className="knap-mini"
              onClick={() =>
                onAendr(
                  paaAlternativ
                    ? { leverandoer: kat.leverandoer, kostPrEnhed: kat.kostPrEnhed }
                    : { leverandoer: kat.altLeverandoer as string, kostPrEnhed: kat.altKostPrEnhed as number },
                )
              }
            >
              {paaAlternativ
                ? `Tilbage til ${kat.leverandoer} (${kr(kat.kostPrEnhed, 2)} kr)`
                : `Skift til ${kat.altLeverandoer} (${kr(kat.altKostPrEnhed, 2)} kr)`}
            </button>
          )}
        </span>

        <span className="pg-k">Aktuel kostpris</span>
        <span className="pg-v">
          <span className={`laast-vaerdi${linje.kostOverride !== null ? " er-overstyret" : ""}`}>
            {kr(basisKost, 2)} kr/{enhed}
          </span>
          <span className="svag">{linje.kostOverride !== null ? "overstyret" : "låst"}</span>
        </span>

        {kat && (
          <>
            <span className="pg-k">Original pris</span>
            <span className="pg-v svag">
              {kr(linje.kostPrEnhed ?? kat.kostPrEnhed, 2)} kr/{enhed} ·{" "}
              {kat.leverandoer === linje.leverandoer ? "katalog" : `${linje.leverandoer}, katalog`}
            </span>
          </>
        )}

        {komponentKost > 0 && (
          <>
            <span className="pg-k">Komponenter</span>
            <span className="pg-v">+ {kr(komponentKost, 2)} kr/{enhed}</span>
            <span className="pg-k">Regnes med</span>
            <span className="pg-v">
              <strong>{kr(effektiv, 2)} kr/{enhed}</strong>
            </span>
          </>
        )}
      </div>

      {!visOverride ? (
        <button className="knap-mini advarsel" onClick={() => saetVisOverride(true)}>
          Override kostpris
        </button>
      ) : (
        <div className="kost-override">
          <div className="notestribe" style={{ margin: "4px 0 8px" }}>
            <strong>Override gælder kun denne kalkulation.</strong> Stamdata ændres ikke, og prisen
            følger ikke længere med, hvis materialet får ny pris. Original pris:{" "}
            {kr(linje.kostPrEnhed ?? 0, 2)} kr/{enhed}.
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="svag">Ny pris</span>
            <div style={{ width: 130 }}>
              <TalCelle
                vaerdi={linje.kostOverride ?? linje.kostPrEnhed}
                decimaler={2}
                ekstraKlasse="overstyret"
                onSaet={(v) => onAendr({ kostOverride: v })}
              />
            </div>
            <button
              className="knap-mini"
              onClick={() => {
                onAendr({ kostOverride: null });
                saetVisOverride(false);
              }}
            >
              Fortryd override
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mere — de sjældne indstillinger, inkl. grundlag
// ---------------------------------------------------------------------------

function MerePanel({
  linje,
  serie,
  visSerie,
  enhedsnavn,
  onAendr,
  onTilfoejKomponent,
}: {
  linje: Materialelinje;
  serie: Serie | undefined;
  visSerie: boolean;
  enhedsnavn: string;
  onAendr: (a: Partial<Materialelinje>) => void;
  onTilfoejKomponent: () => void;
}) {
  const regel = forbrugsregler[linje.form];
  const bredder = linje.katalogId ? andreBredder(linje.katalogId) : [];
  const kat = linje.katalogId ? findMateriale(linje.katalogId) : undefined;
  const afviger = linje.bufferPct !== null && linje.bufferPct !== regel.bufferPct;

  return (
    <div className="panel-indhold">
      <div className="panel-titel">Mere</div>
      <div className="mere-grid">
        <div className="panel-felt">
          <label>Grundlag for forbrug</label>
          <ValgCelle
            vaerdi={linje.grundlag}
            muligheder={grundlagValg}
            ekstraKlasse={`grundlag ${grundlagKlasse(linje.grundlag)}`}
            onSaet={(v) => onAendr({ grundlag: v })}
          />
          <span className="panel-hjaelp">
            Vises som sekundær tekst under forbruget i listen.
          </span>
        </div>

        <div className="panel-felt">
          <label>Bufferregel</label>
          <div className="linje-flex">
            <div style={{ width: 80 }}>
              <TalCelle
                vaerdi={linje.bufferPct ?? regel.bufferPct}
                decimaler={1}
                ekstraKlasse={afviger ? "overstyret" : ""}
                onSaet={(v) => onAendr({ bufferPct: v === regel.bufferPct ? null : v })}
              />
            </div>
            <span className="svag">%</span>
            {afviger && (
              <button className="knap-mini" onClick={() => onAendr({ bufferPct: null })}>
                Brug standard ({tal(regel.bufferPct, 1)} %)
              </button>
            )}
          </div>
          <span className="panel-hjaelp">
            {afviger ? "Afviger fra standard. " : "Standard: "}
            {regel.note}.
          </span>
        </div>

        <div className="panel-felt">
          <label>Bredde</label>
          <div className="linje-flex">
            <strong>{linje.breddeMm ? `${linje.breddeMm} mm` : "–"}</strong>
            {serie && (
              <span className="svag">
                {linje.breddeMm === serie.standardbreddeMm ? "standard" : `standard er ${serie.standardbreddeMm} mm`}
              </span>
            )}
          </div>
          {bredder.length > 0 ? (
            <div className="linje-flex">
              {bredder.map((m) => (
                <button key={m.id} className="knap-mini" onClick={() => onAendr(skiftTilKatalog(linje, m, true))}>
                  Skift til {m.breddeMm} mm ({kr(m.kostPrEnhed, 2)} kr)
                </button>
              ))}
            </div>
          ) : (
            <span className="panel-hjaelp">Ingen andre bredder i kataloget.</span>
          )}
        </div>

        {visSerie && (
          <div className="panel-felt">
            <label>Serie</label>
            <select
              className="celle"
              value={linje.gentagelse}
              onChange={(e) => onAendr({ gentagelse: e.target.value as "engang" | "pr_enhed" })}
            >
              <option value="engang">Én gang</option>
              <option value="pr_enhed">Pr. {enhedsnavn}</option>
            </select>
          </div>
        )}

        {linje.katalogId && !kat?.indeholder && (
          <div className="panel-felt">
            <label>Komponenter</label>
            <button className="knap-mini" onClick={onTilfoejKomponent}>
              + Tilføj komponent
            </button>
            <span className="panel-hjaelp">Komponenten følger hovedmaterialets forbrug.</span>
          </div>
        )}

        <div className="panel-felt bred">
          <label>Note</label>
          <TekstCelle vaerdi={linje.note} pladsholder="—" onSaet={(v) => onAendr({ note: v })} />
        </div>

        {kat && (
          <div className="panel-felt bred">
            <label>Tekniske detaljer</label>
            <span className="panel-hjaelp">
              {kat.producent} · {kat.navn} · prisgruppe {kat.prisgruppe} · form {linje.form} · katalog-id{" "}
              <code>{kat.id}</code>
              {kat.indeholder && <> · færdig kombination: {kat.indeholder.join(" + ")}</>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
