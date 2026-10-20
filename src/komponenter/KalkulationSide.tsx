// ============================================================================
// SMU Kalkulation — demo (prototypens tre cases).
//
// Arbejdsformen er bevidst tæt på Excel: vælg en kendt materialeopbygning,
// tast forbrug og timer, aflæs økonomien. Selve arbejdsfladen er
// KalkulationFlade, som også bruges til gemte kalkulationer på en OS-sag.
//
// Demoen gemmer intet. Rigtige kalkulationer åbnes fra en sag: /sag/:sagId.
// ============================================================================

import { useState } from "react";
import {
  demoEtiketter,
  demoKalkulationer,
  demoNavne,
  erAendret,
  hentOriginal,
  kopiér,
} from "../demo/demodata";
import type { Kalkulation } from "../domain/typer";
import KalkulationFlade from "./KalkulationFlade";
import PlatformHandlinger from "./PlatformHandlinger";

export default function KalkulationSide() {
  const [valgtDemo, saetValgtDemo] = useState("citan");
  const [kalk, saetKalk] = useState<Kalkulation>(() => kopiér(demoKalkulationer[0]));
  const [bekraeftNulstil, saetBekraeftNulstil] = useState(false);

  // Cellerne holder deres egen tekst under indtastning. Når hele kalkulationen
  // udskiftes udefra, skal den tekst smides væk — derfor får fladen en ny key.
  const [monteringsNoegle, saetMonteringsNoegle] = useState(0);

  function indlaesOriginal(id: string) {
    const original = hentOriginal(id);
    if (!original) return;
    saetKalk(original);
    saetMonteringsNoegle((n) => n + 1);
  }

  function skiftDemo(id: string) {
    saetValgtDemo(id);
    saetBekraeftNulstil(false);
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

  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          {/* Ingen version her: produktversionen vises af PlatformHandlinger
              (lib/version.ts, kilde = package.json). */}
          SMU Kalkulation <span>DEMO · ingen data gemmes</span>
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

        {/* Fremtidige handlinger — vist bevidst, men ikke bygget endnu */}
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

      <KalkulationFlade
        key={`demo-${monteringsNoegle}`}
        kalk={kalk}
        saetKalk={saetKalk}
        fodnote={
          <p className="fodnote">
            <strong>Demo.</strong> Materialer, bredder, leverandører, kostpriser,
            procesnavne og timesatser er aflæst fra <code>SMU Kalkulation Master.xlsm</code>.
            Prismotoren spejler arkets rækker 121–137. Dækningsgraden på eksternt arbejde er
            bevidst markeret som uafklaret, fordi arket selv er i konflikt. Demoen gemmer intet —
            rigtige kalkulationer åbnes fra en sag i SMU OS.
          </p>
        }
      />

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
