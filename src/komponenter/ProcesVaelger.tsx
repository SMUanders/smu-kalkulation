// ============================================================================
// Procesvælger — samme hurtige opslag som materialer, men for arbejdsprocesser.
// Timesatser kommer fra Excel-arket. Tider autoudfyldes ALDRIG.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ofteBrugteProcesser,
  proceskatalog,
  procesgruppeTekst,
  soegProces,
  type Katalogproces,
  type Procesgruppe,
} from "../domain/processer";
import { kr } from "../lib/format";

function Raekke({
  p,
  valgt,
  onVaelg,
  onHover,
}: {
  p: Katalogproces;
  valgt: boolean;
  onVaelg: () => void;
  onHover: () => void;
}) {
  return (
    <button
      className={`vaelger-raekke${valgt ? " er-valgt" : ""}`}
      onClick={onVaelg}
      onMouseEnter={onHover}
      title={p.note}
    >
      <span className="vr-navn">{p.navn}</span>
      <span className="vr-meta">
        <span className="vr-lev">{procesgruppeTekst[p.gruppe]}</span>
        <span className="vr-pris">
          {kr(p.kostPrTime, 2)} <small>kr/t</small>
        </span>
      </span>
    </button>
  );
}

interface Props {
  onVaelg: (p: Katalogproces) => void;
  onLuk: () => void;
  onFriLinje: () => void;
}

export default function ProcesVaelger({ onVaelg, onLuk, onFriLinje }: Props) {
  const [q, saetQ] = useState("");
  const [markeret, saetMarkeret] = useState(0);
  const soegeFelt = useRef<HTMLInputElement>(null);

  useEffect(() => {
    soegeFelt.current?.focus();
  }, []);
  useEffect(() => {
    saetMarkeret(0);
  }, [q]);

  const traef = useMemo(() => soegProces(q), [q]);
  const soeger = q.trim().length > 0;
  const flad = soeger ? traef : [...ofteBrugteProcesser(), ...proceskatalog.filter((p) => !p.ofteBrugt)];

  const grupper = useMemo(() => {
    const ud = new Map<Procesgruppe, Katalogproces[]>();
    for (const p of proceskatalog) {
      if (!ud.has(p.gruppe)) ud.set(p.gruppe, []);
      ud.get(p.gruppe)!.push(p);
    }
    return [...ud.entries()];
  }, []);

  function tastatur(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      saetMarkeret((i) => Math.min(i + 1, flad.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      saetMarkeret((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = flad[markeret];
      if (p) onVaelg(p);
    } else if (e.key === "Escape") {
      onLuk();
    }
  }

  return (
    <div className="overlag" onClick={onLuk}>
      <div className="vaelger" onClick={(e) => e.stopPropagation()} onKeyDown={tastatur}>
        <div className="vaelger-hoved">
          <input
            ref={soegeFelt}
            className="vaelger-soeg"
            value={q}
            placeholder="Søg proces — fx skærestue, montering, lay-out, kørsel…"
            onChange={(e) => saetQ(e.target.value)}
          />
          <button className="knap-sekundaer" onClick={onLuk}>
            Luk
          </button>
        </div>

        <div className="vaelger-liste">
          {soeger ? (
            traef.length === 0 ? (
              <p className="vaelger-tom">Ingen træf på “{q}”.</p>
            ) : (
              <>
                <div className="vaelger-gruppe">{traef.length} træf</div>
                {traef.map((p, i) => (
                  <Raekke
                    key={p.id}
                    p={p}
                    valgt={i === markeret}
                    onVaelg={() => onVaelg(p)}
                    onHover={() => saetMarkeret(i)}
                  />
                ))}
              </>
            )
          ) : (
            <>
              <div className="vaelger-gruppe">Ofte brugt</div>
              {ofteBrugteProcesser().map((p) => (
                <Raekke
                  key={`o-${p.id}`}
                  p={p}
                  valgt={flad[markeret]?.id === p.id}
                  onVaelg={() => onVaelg(p)}
                  onHover={() => saetMarkeret(flad.indexOf(p))}
                />
              ))}
              {grupper.map(([g, liste]) => (
                <div key={g}>
                  <div className="vaelger-gruppe">{procesgruppeTekst[g]}</div>
                  {liste.map((p) => (
                    <Raekke
                      key={`${g}-${p.id}`}
                      p={p}
                      valgt={false}
                      onVaelg={() => onVaelg(p)}
                      onHover={() => saetMarkeret(flad.indexOf(p))}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="vaelger-fod">
          <span className="svag">
            Timesatser er aflæst fra SMU Kalkulation Master.xlsm. Tider udfyldes altid manuelt.
          </span>
          <button className="knap-sekundaer" onClick={onFriLinje}>
            Opret fri linje
          </button>
        </div>
      </div>
    </div>
  );
}
