// ============================================================================
// SMU Kalkulation v0.2 — én samlet kalkulationsside.
//
// Arbejdsformen er bevidst tæt på Excel: vælg en kendt materialeopbygning,
// tast forbrug og timer, aflæs økonomien. Ingen wizard, ingen skjulte trin.
// Alt det man ikke skal tage stilling til ved hver linje ligger i detaljer.
//
// Al tilstand lever i hukommelsen. Intet gemmes, intet sendes nogen steder hen.
// ============================================================================

import { useMemo, useState } from "react";
import { beregnOpsamling } from "../domain/beregning";
import { parseTal } from "../lib/format";
import {
  demoEtiketter,
  demoKalkulationer,
  demoNavne,
  erAendret,
  hentOriginal,
  kopiér,
} from "../demo/demodata";
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
import ArbejdeTabel from "./ArbejdeTabel";
import MaterialeTabel from "./MaterialeTabel";
import MaterialeVaelger from "./MaterialeVaelger";
import OevrigeTabel from "./OevrigeTabel";
import PlatformHandlinger from "./PlatformHandlinger";
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

/** Hvad materialevælgeren skal gøre, når brugeren har valgt noget. */
type VaelgerMaal = { slags: "ny_linje" } | { slags: "komponent"; linjeId: string };

export default function KalkulationSide() {
  const [valgtDemo, saetValgtDemo] = useState("citan");
  const [kalk, saetKalk] = useState<Kalkulation>(() => kopiér(demoKalkulationer[0]));
  const [bekraeftNulstil, saetBekraeftNulstil] = useState(false);
  const [materialeVaelger, saetMaterialeVaelger] = useState<VaelgerMaal | null>(null);
  const [procesVaelger, saetProcesVaelger] = useState(false);
  const [visSerie, saetVisSerie] = useState(false);

  // Cellerne holder deres egen tekst under indtastning. Når hele kalkulationen
  // udskiftes udefra, skal den tekst smides væk — ellers står et felt man lige
  // har rettet tilbage med den gamle indtastning.
  const [monteringsNoegle, saetMonteringsNoegle] = useState(0);

  const serieAktiv = kalk.antalEnheder > 1 || visSerie;

  function indlaesOriginal(id: string) {
    const original = hentOriginal(id);
    if (!original) return;
    saetKalk(original);
    saetMonteringsNoegle((n) => n + 1);
  }

  function skiftDemo(id: string) {
    saetValgtDemo(id);
    saetBekraeftNulstil(false);
    saetVisSerie(false);
    indlaesOriginal(id);
  }

  function nulstil() {
    if (!erAendret(kalk)) {
      indlaesOriginal(valgtDemo);
      return;
    }
    saetBekraeftNulstil(true);
  }

  function udfoerNulstil() {
    indlaesOriginal(valgtDemo);
    saetBekraeftNulstil(false);
  }

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
      saetKalk((k) => ({ ...k, materialer: [
          ...k.materialer,
          materialeFraKatalog(m, {
            ...(farve ? { farvekode: farve.kode, farvenavn: farve.dansk } : {}),
            ...(netto !== null ? { netto, grundlag: "manuelt" as const } : {}),
          }),
        ] }));
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
      <header className="topbar">
        <div className="topbar-brand">
          {/* Ingen version her: produktversionen vises af PlatformHandlinger
              (lib/version.ts, kilde = package.json). Statusteksten bliver
              stående, fordi "ingen data gemmes" fortsat er sandt. */}
          SMU Kalkulation <span>PROTOTYPE · ingen data gemmes</span>
        </div>

        <select value={valgtDemo} onChange={(e) => skiftDemo(e.target.value)} title="Vælg demo-case">
          {demoKalkulationer.map((k) => (
            <option key={k.id} value={k.id}>
              {demoEtiketter[k.id]}
            </option>
          ))}
        </select>
        <button className="knap-sekundaer" onClick={nulstil} title="Start forfra på den valgte demo">
          Nulstil demo
        </button>

        <div className="topbar-spacer" />

        {/* Fremtidige handlinger — vist bevidst, men ikke bygget i v0.2 */}
        <button className="fremtid" disabled title="Kommer senere: kalkulationskartotek med søgning">
          Kartotek
        </button>
        <button className="fremtid" disabled title="Kommer senere: kopiér en tidligere kalkulation">
          Kopiér tidligere
        </button>
        <button className="fremtid" disabled title="Kommer senere: genbrugelige kalkulationsgrundlag">
          Favoritter
        </button>
        <button className="fremtid" disabled title="Kommer senere: read-only tegning fra SMU OS">
          Tegning
        </button>
        <button
          className="fremtid"
          disabled
          title="Fremtidigt spor: CorelDraw leverer materialer, farver, nettoforbrug, printmål, SMU-nummer og tegningsnr."
        >
          Hent fra CorelDraw
        </button>

        <PlatformHandlinger />
      </header>

      {/* Intern beta: appen kører på prototypens lokale materialekatalog, ikke SMU Source (TR-057).
          Tynd stribe under topbjælken — den må oplyse, ikke fylde. */}
      <div className="betabjaelke">
        Intern beta · materialer/priser er endnu ikke koblet til SMU Source
      </div>

      <div className="side">
        <div className="sagshoved">
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

        <MaterialeTabel
          key={`mat-${monteringsNoegle}`}
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
          key={`arb-${monteringsNoegle}`}
          linjer={kalk.arbejde}
          antalEnheder={kalk.antalEnheder}
          enhedsnavn={kalk.enhedsnavn}
          visSerie={serieAktiv}
          onAendr={aendrArbejde}
          onSlet={(id) => saetKalk((k) => ({ ...k, arbejde: k.arbejde.filter((l) => l.id !== id) }))}
          onTilfoej={() => saetProcesVaelger(true)}
        />

        <OevrigeTabel
          key={`oev-${monteringsNoegle}`}
          linjer={kalk.oevrige}
          antalEnheder={kalk.antalEnheder}
          enhedsnavn={kalk.enhedsnavn}
          visSerie={serieAktiv}
          onAendr={aendrOevrig}
          onSlet={(id) => saetKalk((k) => ({ ...k, oevrige: k.oevrige.filter((l) => l.id !== id) }))}
          onTilfoej={() => saetKalk((k) => ({ ...k, oevrige: [...k.oevrige, tomOevrig()] }))}
        />

        <Prisopsamling
          key={`ops-${monteringsNoegle}`}
          op={op}
          enhedsnavn={kalk.enhedsnavn}
          dg={kalk.daekningsgrader}
          onSaetDg={saetDg}
          onSaetKundevendt={(v) => saetKalk((k) => ({ ...k, kundevendtPrEnhed: v }))}
        />

        <p className="fodnote">
          <strong>Prototype.</strong> Materialer, bredder, leverandører, kostpriser,
          procesnavne og timesatser er aflæst fra <code>SMU Kalkulation Master.xlsm</code>.
          Prismotoren spejler arkets rækker 121–137. Dækningsgraden på eksternt arbejde er
          bevidst markeret som uafklaret, fordi arket selv er i konflikt. Intet gemmes, og der
          findes ingen database- eller Supabase-forbindelse i denne app.
        </p>
      </div>

      <Prisbjaelke
        key={`bjaelke-${monteringsNoegle}`}
        op={op}
        enhedsnavn={kalk.enhedsnavn}
        onSaetKundevendt={(v) => saetKalk((k) => ({ ...k, kundevendtPrEnhed: v }))}
      />

      {materialeVaelger && (
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

      {procesVaelger && (
        <ProcesVaelger
          onVaelg={procesValgt}
          onLuk={() => saetProcesVaelger(false)}
          onFriLinje={() => {
            saetProcesVaelger(false);
            saetKalk((k) => ({ ...k, arbejde: [...k.arbejde, friArbejdslinje()] }));
          }}
        />
      )}

      {bekraeftNulstil && (
        <NulstilBekraeftelse
          navn={demoNavne[valgtDemo] ?? valgtDemo}
          onAnnuller={() => saetBekraeftNulstil(false)}
          onNulstil={udfoerNulstil}
        />
      )}
    </>
  );
}

/** Enkel bekræftelse før en ændret kalkulation kastes væk. */
function NulstilBekraeftelse({
  navn,
  onAnnuller,
  onNulstil,
}: {
  navn: string;
  onAnnuller: () => void;
  onNulstil: () => void;
}) {
  return (
    <div
      className="overlag"
      role="dialog"
      aria-modal="true"
      aria-label="Nulstil demo"
      onClick={onAnnuller}
      onKeyDown={(e) => {
        if (e.key === "Escape") onAnnuller();
      }}
    >
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-tekst">Nulstil {navn} til de oprindelige demo-data?</p>
        <p className="dialog-note">
          Alle dine ændringer i denne kalkulation forsvinder — også tilføjede og slettede linjer.
        </p>
        <div className="dialog-knapper">
          <button className="knap-sekundaer" onClick={onAnnuller}>
            Annuller
          </button>
          <button className="knap-primaer" autoFocus onClick={onNulstil}>
            Nulstil
          </button>
        </div>
      </div>
    </div>
  );
}
