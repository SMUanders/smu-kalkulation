// ============================================================================
// Materialevælger (v0.3) — standardvalg først, undtagelser bagefter.
//
// Vælgeren afslutter de almindelige valg, FØR linjen lander i kalkulationen:
//   1. søg og vælg serie eller vare
//   2. vælg prisgruppe og evt. farve (kun når serien har flere prisgrupper)
//   3. standardbredde og sikre komponenter sættes automatisk
// Bagefter skal brugeren normalt kun taste nettoforbrug.
//
// Data er et lokalt demokatalog. UX'en efterligner det fremtidige opslag i
// SMU Source (materialer) og SMU Color (farver).
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import {
  findMateriale,
  kategoriTekst,
  kortnavn,
  materialekatalog,
  noterFarve,
  senesteFarverFor,
  soeg,
  soegValg,
  type Farve,
  type Katalogkategori,
  type Katalogmateriale,
  type Serie,
  type Valg,
} from "../demo/materialekatalog";
import { kr, parseTal } from "../lib/format";

/** Senest brugte valg i sessionen — "serie:id" eller "vare:id". */
const senesteValg: string[] = [];
function noterValg(v: Valg) {
  const n = v.slags === "serie" ? `serie:${v.serie.id}` : `vare:${v.vare.id}`;
  const i = senesteValg.indexOf(n);
  if (i >= 0) senesteValg.splice(i, 1);
  senesteValg.unshift(n);
  if (senesteValg.length > 5) senesteValg.pop();
}

function valgNoegle(v: Valg) {
  return v.slags === "serie" ? `serie:${v.serie.id}` : `vare:${v.vare.id}`;
}

/** "+ 215G + ink" ud fra en vares sikre afhængigheder. */
function forslagTekst(k: Katalogmateriale | undefined): string {
  if (!k?.foreslaar?.length) return "";
  return "+ " + k.foreslaar.map((id) => kortnavn(id, findMateriale(id)?.navn ?? id)).join(" + ");
}

function standardVare(s: Serie) {
  return findMateriale(s.prisgrupper[0].katalogId);
}

function Raekke({
  v,
  valgt,
  onVaelg,
  onHover,
}: {
  v: Valg;
  valgt: boolean;
  onVaelg: () => void;
  onHover: () => void;
}) {
  if (v.slags === "serie") {
    const s = v.serie;
    const priser = s.prisgrupper
      .map((p) => findMateriale(p.katalogId)?.kostPrEnhed)
      .filter((x): x is number => x !== undefined);
    const min = Math.min(...priser);
    const max = Math.max(...priser);
    const std = standardVare(s);
    return (
      <button className={`vaelger-raekke${valgt ? " er-valgt" : ""}`} onClick={onVaelg} onMouseEnter={onHover}>
        <span className="vr-navn">
          {s.navn}
          {s.undertitel && <span className="vr-bredde"> · {s.undertitel}</span>}
          <span className="vr-bredde"> · {s.standardbreddeMm} mm</span>
          {s.prisgrupper.length > 1 && (
            <span className="vr-gruppe"> · {s.prisgrupper.map((p) => p.navn).join(" / ")}</span>
          )}
        </span>
        <span className="vr-meta">
          {forslagTekst(std) && <span className="maerkat m-teal">{forslagTekst(std)}</span>}
          <span className="vr-lev">{std?.leverandoer}</span>
          <span className="vr-pris">
            {min === max ? kr(min, 2) : `${kr(min, 0)}–${kr(max, 0)}`} <small>kr/{std?.enhed}</small>
          </span>
          {s.prisgrupper.length > 1 && <span className="vr-pil">›</span>}
        </span>
      </button>
    );
  }

  const m = v.vare;
  return (
    <button className={`vaelger-raekke${valgt ? " er-valgt" : ""}`} onClick={onVaelg} onMouseEnter={onHover}>
      <span className="vr-navn">
        {m.navn}
        {m.prisgruppe && m.prisgruppe !== "Standard" && <span className="vr-gruppe"> · {m.prisgruppe}</span>}
        {m.breddeMm && <span className="vr-bredde"> · {m.breddeMm} mm</span>}
      </span>
      <span className="vr-meta">
        {m.indeholder && <span className="maerkat m-violet">kombination</span>}
        {forslagTekst(m) && <span className="maerkat m-teal">{forslagTekst(m)}</span>}
        <span className="vr-lev">{m.leverandoer || "—"}</span>
        <span className="vr-pris">
          {kr(m.kostPrEnhed, 2)} <small>kr/{m.enhed === "m2" ? "m²" : m.enhed}</small>
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Trin 2 — prisgruppe og farve
// ---------------------------------------------------------------------------

function PrisgruppeOgFarve({
  serie,
  startFarveQ,
  onTilbage,
  onVaelg,
}: {
  serie: Serie;
  startFarveQ: string;
  onTilbage: () => void;
  onVaelg: (k: Katalogmateriale, farve: Farve | null) => void;
}) {
  const [gruppe, saetGruppe] = useState<string | null>(null);
  const [farveQ, saetFarveQ] = useState(startFarveQ);
  const felt = useRef<HTMLInputElement>(null);

  useEffect(() => {
    felt.current?.focus();
  }, []);

  const vareFor = (g: string) => {
    const p = serie.prisgrupper.find((x) => x.navn === g);
    return p ? findMateriale(p.katalogId) : undefined;
  };

  const q = farveQ.trim().toLowerCase();
  const farver = serie.farver.filter(
    (f) =>
      (!gruppe || f.prisgruppe === gruppe) &&
      (!q || [f.kode, f.dansk, f.producentnavn].join(" ").toLowerCase().includes(q)),
  );
  const seneste = senesteFarverFor(serie).filter((f) => !gruppe || f.prisgruppe === gruppe);

  function vaelgFarve(f: Farve) {
    const k = vareFor(f.prisgruppe);
    if (!k) return;
    noterFarve(serie.id, f.kode);
    onVaelg(k, f);
  }

  function udenFarve() {
    if (!gruppe) return;
    const k = vareFor(gruppe);
    if (k) onVaelg(k, null);
  }

  const std = standardVare(serie);

  return (
    <div
      className="trin2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (farver.length === 1 && q) vaelgFarve(farver[0]);
          else udenFarve();
        } else if (e.key === "Escape") {
          e.stopPropagation();
          onTilbage();
        }
      }}
    >
      <div className="trin2-hoved">
        <button className="knap-mini" onClick={onTilbage}>
          ‹ Tilbage
        </button>
        <strong>{serie.navn}</strong>
        <span className="svag">{serie.undertitel}</span>
        <span className="spacer" />
        <span className="maerkat m-graa" title="Standardbredde vælges automatisk">
          {serie.standardbreddeMm} mm
        </span>
        {forslagTekst(std) && (
          <span className="maerkat m-teal" title="Sikre komponenter foreslås automatisk">
            {forslagTekst(std)}
          </span>
        )}
      </div>

      <div className="trin2-label">1 · Prisgruppe</div>
      <div className="pg-knapper">
        {serie.prisgrupper.map((p) => {
          const k = findMateriale(p.katalogId);
          return (
            <button
              key={p.navn}
              className={`pg-knap${gruppe === p.navn ? " valgt" : ""}`}
              onClick={() => saetGruppe(gruppe === p.navn ? null : p.navn)}
            >
              <span>{p.navn}</span>
              <small>{k ? `${kr(k.kostPrEnhed, 2)} kr` : ""}</small>
            </button>
          );
        })}
      </div>

      <div className="trin2-label">
        2 · Farve <span className="svag">(valgfri — prisen følger prisgruppen)</span>
      </div>
      {serie.farver.length > 0 ? (
        <>
          <input
            ref={felt}
            className="farve-soeg"
            value={farveQ}
            placeholder="Søg kode eller navn — fx 050, blå"
            onChange={(e) => saetFarveQ(e.target.value)}
          />
          {seneste.length > 0 && !q && (
            <div className="farve-chips">
              <span className="svag" style={{ fontSize: 11 }}>
                Senest:
              </span>
              {seneste.map((f) => (
                <button key={`s-${f.kode}`} className="farve-chip" onClick={() => vaelgFarve(f)}>
                  {f.kode} {f.dansk}
                </button>
              ))}
            </div>
          )}
          <div className="farve-chips">
            {farver.map((f) => (
              <button
                key={f.kode}
                className="farve-chip"
                title={`${f.producentnavn} · prisgruppe ${f.prisgruppe} · kilde: ${
                  f.kilde === "source" ? "ORAFOL-navn i SMU Source" : "Citan-casen"
                }`}
                onClick={() => vaelgFarve(f)}
              >
                <strong>{f.kode}</strong> {f.dansk}
                {!gruppe && <small> · {f.prisgruppe}</small>}
              </button>
            ))}
            {farver.length === 0 && <span className="svag">Ingen kendte farver matcher.</span>}
          </div>
        </>
      ) : (
        <p className="svag" style={{ margin: "2px 0 8px" }}>
          Ingen farver i demokataloget for denne serie — prisgruppen er grundlaget.
        </p>
      )}

      <div className="trin2-fod">
        <span className="svag">Vælg en farve for at tilføje med det samme — eller tilføj på prisgruppe alene.</span>
        <button className="knap-primaer" disabled={!gruppe} onClick={udenFarve}>
          {gruppe ? `Tilføj ${serie.navn} · ${gruppe}` : "Vælg prisgruppe"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sidste trin — valgfrit nettoforbrug, før linjen oprettes
// ---------------------------------------------------------------------------

function ForbrugTrin({
  vare,
  farve,
  onTilbage,
  onTilfoej,
}: {
  vare: Katalogmateriale;
  farve: Farve | null;
  onTilbage: () => void;
  onTilfoej: (netto: number | null) => void;
}) {
  const [raa, saetRaa] = useState("");
  const felt = useRef<HTMLInputElement>(null);
  useEffect(() => {
    felt.current?.focus();
  }, []);

  const netto = parseTal(raa);
  const titel = [
    vare.navn,
    farve ? `${farve.kode} ${farve.dansk}` : vare.prisgruppe !== "Standard" ? vare.prisgruppe : "",
    vare.breddeMm ? `${vare.breddeMm} mm` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="trin2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onTilfoej(netto);
        } else if (e.key === "Escape") {
          e.stopPropagation();
          onTilbage();
        }
      }}
    >
      <div className="trin2-hoved">
        <button className="knap-mini" onClick={onTilbage}>
          ‹ Tilbage
        </button>
        <strong>{titel}</strong>
        <span className="spacer" />
        {forslagTekst(vare) && (
          <span className="maerkat m-teal" title="Oprettes som afledte linjer, der følger forbruget">
            {forslagTekst(vare)}
          </span>
        )}
      </div>

      <div className="trin2-label">
        Nettoforbrug <span className="svag">(valgfrit — kan tastes på linjen bagefter)</span>
      </div>
      <div className="linje-flex">
        <input
          ref={felt}
          className="farve-soeg"
          style={{ width: 160, textAlign: "right" }}
          inputMode="decimal"
          value={raa}
          placeholder="fx 9,94"
          onChange={(e) => saetRaa(e.target.value)}
        />
        <span className="svag">{vare.enhed === "m2" ? "m²" : vare.enhed}</span>
      </div>

      <div className="trin2-fod">
        <span className="svag">Enter tilføjer. Uden forbrug står linjen som “mangler”.</span>
        <div className="linje-flex">
          <button className="knap-sekundaer" onClick={() => onTilfoej(null)}>
            Tilføj uden forbrug
          </button>
          <button className="knap-primaer" disabled={raa.trim() !== "" && netto === null} onClick={() => onTilfoej(netto)}>
            Tilføj
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  /** "linje" opretter en materialelinje; "komponent" tilføjer til en eksisterende. */
  tilstand: "linje" | "komponent";
  onVaelg: (k: Katalogmateriale, farve: Farve | null, netto?: number | null) => void;
  onLuk: () => void;
  onFriLinje: () => void;
}

const KOMPONENT_KATEGORIER: Katalogkategori[] = ["laminat", "applikation", "ink", "forbrug"];

export default function MaterialeVaelger({ tilstand, onVaelg, onLuk, onFriLinje }: Props) {
  const [q, saetQ] = useState("");
  const [markeret, saetMarkeret] = useState(0);
  const [trin2, saetTrin2] = useState<{ serie: Serie; farveQ: string } | null>(null);
  const [klar, saetKlar] = useState<{ vare: Katalogmateriale; farve: Farve | null } | null>(null);

  /** Valget er afsluttet — i linjetilstand spørges der til forbrug til sidst. */
  function afslut(vare: Katalogmateriale, farve: Farve | null) {
    if (tilstand === "komponent") onVaelg(vare, farve, null);
    else saetKlar({ vare, farve });
  }
  const soegeFelt = useRef<HTMLInputElement>(null);

  useEffect(() => {
    soegeFelt.current?.focus();
  }, []);
  useEffect(() => {
    saetMarkeret(0);
  }, [q]);

  const soeger = q.trim().length > 0;

  // Komponenttilstand: flad liste over laminat, tape, ink og forbrugsvarer
  const komponentListe = useMemo(
    () =>
      (soeger ? soeg(q) : materialekatalog).filter((m) => KOMPONENT_KATEGORIER.includes(m.kategori)),
    [q, soeger],
  );

  const traef = useMemo(() => soegValg(q), [q]);

  const ofte = useMemo<Valg[]>(
    () => traef.filter((v) => (v.slags === "serie" ? v.serie.ofteBrugt : v.vare.ofteBrugt)),
    [traef],
  );
  const seneste = senesteValg
    .map((n) => traef.find((v) => valgNoegle(v) === n))
    .filter((v): v is Valg => !!v);

  const flad: Valg[] = soeger ? traef : [...seneste, ...ofte.filter((v) => !seneste.includes(v))];

  function vaelg(v: Valg) {
    noterValg(v);
    if (v.slags === "vare") {
      afslut(v.vare, null);
      return;
    }
    const s = v.serie;
    if (s.prisgrupper.length > 1) {
      // Kom brugeren hertil ved at søge på en farve, så står den klar i trin 2
      const ql = q.trim().toLowerCase();
      const farveTraef =
        ql && s.farver.some((f) => [f.kode, f.dansk, f.producentnavn].join(" ").toLowerCase().includes(ql));
      saetTrin2({ serie: s, farveQ: farveTraef ? q.trim() : "" });
      return;
    }
    // Én prisgruppe: tilføj direkte i standardbredden
    const k = standardVare(s);
    if (k) afslut(k, null);
  }

  function tastatur(e: React.KeyboardEvent) {
    if (trin2 || klar) return;
    const laengde = tilstand === "komponent" ? komponentListe.length : flad.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      saetMarkeret((i) => Math.min(i + 1, laengde - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      saetMarkeret((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (tilstand === "komponent") {
        const m = komponentListe[markeret];
        if (m) onVaelg(m, null);
      } else {
        const v = flad[markeret];
        if (v) vaelg(v);
      }
    } else if (e.key === "Escape") {
      onLuk();
    }
  }

  const grupper = useMemo(() => {
    const ud = new Map<Katalogkategori, Valg[]>();
    for (const v of traef) {
      const kat = v.slags === "serie" ? v.serie.kategori : v.vare.kategori;
      if (!ud.has(kat)) ud.set(kat, []);
      ud.get(kat)!.push(v);
    }
    return [...ud.entries()];
  }, [traef]);

  return (
    <div className="overlag" onClick={onLuk}>
      <div className="vaelger" onClick={(e) => e.stopPropagation()} onKeyDown={tastatur}>
        {klar ? (
          <ForbrugTrin
            vare={klar.vare}
            farve={klar.farve}
            onTilbage={() => {
              saetKlar(null);
              if (!trin2) setTimeout(() => soegeFelt.current?.focus(), 0);
            }}
            onTilfoej={(netto) => onVaelg(klar.vare, klar.farve, netto)}
          />
        ) : trin2 ? (
          <PrisgruppeOgFarve
            serie={trin2.serie}
            startFarveQ={trin2.farveQ}
            onTilbage={() => {
              saetTrin2(null);
              setTimeout(() => soegeFelt.current?.focus(), 0);
            }}
            onVaelg={afslut}
          />
        ) : (
          <>
            <div className="vaelger-hoved">
              <input
                ref={soegeFelt}
                className="vaelger-soeg"
                value={q}
                placeholder={
                  tilstand === "komponent"
                    ? "Søg komponent — fx 215G, TP-160, ink…"
                    : "Søg materiale — fx 751, 3551, Avery, blå, 050…"
                }
                onChange={(e) => saetQ(e.target.value)}
              />
              <button className="knap-sekundaer" onClick={onLuk}>
                Luk
              </button>
            </div>

            <div className="vaelger-liste">
              {tilstand === "komponent" ? (
                <>
                  <div className="vaelger-gruppe">Komponenter</div>
                  {komponentListe.map((m, i) => (
                    <Raekke
                      key={m.id}
                      v={{ slags: "vare", vare: m }}
                      valgt={i === markeret}
                      onVaelg={() => onVaelg(m, null)}
                      onHover={() => saetMarkeret(i)}
                    />
                  ))}
                </>
              ) : soeger ? (
                traef.length === 0 ? (
                  <p className="vaelger-tom">Ingen træf på “{q}”. Du kan oprette en fri linje i stedet.</p>
                ) : (
                  <>
                    <div className="vaelger-gruppe">{traef.length} træf</div>
                    {traef.map((v, i) => (
                      <Raekke
                        key={valgNoegle(v)}
                        v={v}
                        valgt={i === markeret}
                        onVaelg={() => vaelg(v)}
                        onHover={() => saetMarkeret(i)}
                      />
                    ))}
                  </>
                )
              ) : (
                <>
                  {seneste.length > 0 && <div className="vaelger-gruppe">Senest brugt</div>}
                  {seneste.map((v) => (
                    <Raekke
                      key={`s-${valgNoegle(v)}`}
                      v={v}
                      valgt={flad[markeret] === v}
                      onVaelg={() => vaelg(v)}
                      onHover={() => saetMarkeret(flad.indexOf(v))}
                    />
                  ))}
                  <div className="vaelger-gruppe">Ofte brugt</div>
                  {ofte
                    .filter((v) => !seneste.includes(v))
                    .map((v) => (
                      <Raekke
                        key={`o-${valgNoegle(v)}`}
                        v={v}
                        valgt={flad[markeret] === v}
                        onVaelg={() => vaelg(v)}
                        onHover={() => saetMarkeret(flad.indexOf(v))}
                      />
                    ))}
                  {grupper.map(([kat, liste]) => (
                    <div key={kat}>
                      <div className="vaelger-gruppe">{kategoriTekst[kat]}</div>
                      {liste.map((v) => (
                        <Raekke
                          key={`${kat}-${valgNoegle(v)}`}
                          v={v}
                          valgt={false}
                          onVaelg={() => vaelg(v)}
                          onHover={() => undefined}
                        />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="vaelger-fod">
              <span className="svag">
                ↑↓ vælg · Enter bekræft · Esc luk. Standardbredde og sikre komponenter sættes
                automatisk.
              </span>
              {tilstand === "linje" && (
                <button className="knap-sekundaer" onClick={onFriLinje}>
                  Opret fri linje
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
