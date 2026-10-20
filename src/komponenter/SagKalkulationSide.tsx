// ============================================================================
// SMU Kalkulation — kalkulation på en rigtig OS-sag.
//
//   /sag/:sagId                     sagens kalkulationer (opret / vælg)
//   /sag/:sagId/k/:kalkulationId    gemt kalkulation: gem, genåbn, lås, ny version
//
// Sagen læses gennem OS' read-contract kalkulation_sag(uuid) og kopieres ikke.
// Arbejdsfladen er den samme som i demoen; prismotoren kaldes uændret.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import type { Kalkulation } from "../domain/typer";
import { sammeIndhold } from "../domain/versionsdata";
import { supabase } from "../lib/supabase";
import {
  gemKladde,
  hentKalkulation,
  hentSag,
  KalkulationFejl,
  laasVersion,
  listKalkulationer,
  nyVersion,
  opretKalkulation,
  type KalkulationMedVersion,
  type KalkulationRaekke,
  type SagVisning,
  type VersionRaekke,
} from "../lib/kalkulationApi";
import KalkulationFlade from "./KalkulationFlade";
import PlatformHandlinger from "./PlatformHandlinger";

const tekst = (e: unknown) => (e instanceof KalkulationFejl || e instanceof Error ? e.message : "Ukendt fejl");

function Ramme({ undertitel, handlinger, children }: { undertitel: string; handlinger?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          SMU Kalkulation <span>{undertitel}</span>
        </div>
        <div className="topbar-spacer" />
        {handlinger}
        <PlatformHandlinger />
      </header>
      <div className="betabjaelke">Intern beta · materialer/priser er endnu ikke koblet til SMU Source</div>
      {children}
    </>
  );
}

function Besked({ titel, children }: { titel: string; children?: React.ReactNode }) {
  return (
    <div className="side">
      <div className="sag-besked">
        <h2>{titel}</h2>
        {children}
      </div>
    </div>
  );
}

export default function SagKalkulationSide() {
  const { sagId = "", kalkulationId } = useParams();
  const [sag, saetSag] = useState<SagVisning | null | undefined>(undefined);
  const [fejl, saetFejl] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let aktiv = true;
    saetSag(undefined);
    hentSag(sagId)
      .then((s) => aktiv && saetSag(s))
      .catch((e) => aktiv && saetFejl(tekst(e)));
    return () => { aktiv = false; };
  }, [sagId]);

  if (!supabase) {
    return (
      <Ramme undertitel="Sag">
        <Besked titel="Kræver forbindelse til databasen">
          <p>Lokal udvikling uden Supabase-nøgler kører kun demoen. <Link to="/">Åbn demoen</Link>.</p>
        </Besked>
      </Ramme>
    );
  }
  if (fejl) return <Ramme undertitel="Sag"><Besked titel="Sagen kunne ikke hentes"><p>{fejl}</p></Besked></Ramme>;
  if (sag === undefined) return <Ramme undertitel="Henter sag …"><Besked titel="Henter sagen fra SMU OS …" /></Ramme>;
  if (sag === null) {
    return (
      <Ramme undertitel="Sag">
        <Besked titel="Sagen findes ikke, er slettet, eller du har ikke adgang">
          <p>Kalkulationer åbnes fra en sag i SMU OS.</p>
        </Besked>
      </Ramme>
    );
  }

  return kalkulationId
    ? <GemtKalkulation key={kalkulationId} sag={sag} kalkulationId={kalkulationId} />
    : <SagOversigt sag={sag} />;
}

// ---------------------------------------------------------------------------
// Sagens kalkulationer
// ---------------------------------------------------------------------------

function SagOversigt({ sag }: { sag: SagVisning }) {
  const navigate = useNavigate();
  const [liste, saetListe] = useState<KalkulationMedVersion[] | null>(null);
  const [titel, saetTitel] = useState(sag.titel);
  const [arbejder, saetArbejder] = useState(false);
  const [fejl, saetFejl] = useState<string | null>(null);

  useEffect(() => {
    listKalkulationer(sag.sagId).then(saetListe).catch((e) => saetFejl(tekst(e)));
  }, [sag.sagId]);

  async function opret() {
    saetArbejder(true);
    saetFejl(null);
    try {
      const ny = await opretKalkulation(sag, titel);
      navigate(`/sag/${sag.sagId}/k/${ny.kalkulation.id}`, { replace: true });
    } catch (e) {
      saetFejl(tekst(e));
      saetArbejder(false);
    }
  }

  // Har sagen præcis én kalkulation, åbnes den direkte.
  if (liste && liste.length === 1) {
    return <Navigate to={`/sag/${sag.sagId}/k/${liste[0].kalkulation.id}`} replace />;
  }

  return (
    <Ramme undertitel={`${sag.smuNummer} · ${sag.titel}`}>
      <div className="side">
        <div className="sag-besked">
          <h2>
            {sag.smuNummer} · {sag.titel}
          </h2>
          <p className="svag">{sag.kundeNavn}</p>
          {fejl && <div className="notestribe">{fejl}</div>}
          {liste === null && !fejl && <p>Henter kalkulationer …</p>}
          {liste && liste.length > 1 && (
            <ul className="kalk-liste">
              {liste.map(({ kalkulation: k, aktivVersion: v }) => (
                <li key={k.id}>
                  <Link to={`/sag/${sag.sagId}/k/${k.id}`}>{k.titel}</Link>
                  <span className="svag">
                    {v ? ` · version ${v.versionsnummer} · ${v.status === "laast" ? "låst" : "kladde"}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {liste && liste.length === 0 && (
            <>
              <p>Der er ingen kalkulation på sagen endnu.</p>
              <div className="opret-raekke">
                <input value={titel} onChange={(e) => saetTitel(e.target.value)} aria-label="Kalkulationens titel" />
                <button className="knap-primaer" disabled={arbejder} onClick={() => void opret()}>
                  {arbejder ? "Opretter …" : "Opret kalkulation"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Ramme>
  );
}

// ---------------------------------------------------------------------------
// Gemt kalkulation
// ---------------------------------------------------------------------------

type Gemstatus =
  | { slags: "gemt"; tid: Date | null }
  | { slags: "gemmer" }
  | { slags: "fejl"; besked: string };

function GemtKalkulation({ sag, kalkulationId }: { sag: SagVisning; kalkulationId: string }) {
  const [kalkRaekke, saetKalkRaekke] = useState<KalkulationRaekke | null>(null);
  const [version, saetVersion] = useState<VersionRaekke | null>(null);
  const [kalk, saetKalk] = useState<Kalkulation | null>(null);
  const [gemt, saetGemt] = useState<Kalkulation | null>(null);
  const [status, saetStatus] = useState<Gemstatus>({ slags: "gemt", tid: null });
  const [indlaesFejl, saetIndlaesFejl] = useState<string | null>(null);
  const [bekraeftLaas, saetBekraeftLaas] = useState(false);
  const [noegle, saetNoegle] = useState(0);

  const indlaes = useCallback((r: KalkulationMedVersion) => {
    saetKalkRaekke(r.kalkulation);
    saetVersion(r.aktivVersion);
    const indhold = r.aktivVersion?.indhold ?? null;
    saetKalk(indhold);
    saetGemt(indhold);
    saetNoegle((n) => n + 1);
  }, []);

  useEffect(() => {
    hentKalkulation(kalkulationId, sag).then(indlaes).catch((e) => saetIndlaesFejl(tekst(e)));
  }, [kalkulationId, sag, indlaes]);

  const laast = version?.status === "laast";
  const aendret = !!kalk && !!gemt && !sammeIndhold(kalk, gemt);

  const gem = useCallback(async () => {
    if (!version || !kalk || laast || !aendret) return;
    saetStatus({ slags: "gemmer" });
    try {
      const v = await gemKladde(version, kalk);
      saetVersion(v);
      saetGemt(kalk);
      saetStatus({ slags: "gemt", tid: new Date() });
    } catch (e) {
      saetStatus({ slags: "fejl", besked: tekst(e) });
    }
  }, [version, kalk, laast, aendret]);

  async function laas() {
    if (!version || !kalk) return;
    saetBekraeftLaas(false);
    saetStatus({ slags: "gemmer" });
    try {
      const v = await laasVersion(version, kalk);
      saetVersion(v);
      saetGemt(kalk);
      saetStatus({ slags: "gemt", tid: new Date() });
    } catch (e) {
      saetStatus({ slags: "fejl", besked: tekst(e) });
    }
  }

  async function opretNyVersion() {
    if (!kalkRaekke || !version) return;
    saetStatus({ slags: "gemmer" });
    try {
      const v = await nyVersion(kalkRaekke, version);
      indlaes({ kalkulation: { ...kalkRaekke, aktivVersionId: v.id }, aktivVersion: v });
      saetStatus({ slags: "gemt", tid: new Date() });
    } catch (e) {
      saetStatus({ slags: "fejl", besked: tekst(e) });
    }
  }

  // Ctrl/Cmd+S gemmer.
  useEffect(() => {
    function tast(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void gem();
      }
    }
    window.addEventListener("keydown", tast);
    return () => window.removeEventListener("keydown", tast);
  }, [gem]);

  // Advar, før en ikke-gemt kalkulation forlades.
  useEffect(() => {
    if (!aendret) return;
    const advar = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", advar);
    return () => window.removeEventListener("beforeunload", advar);
  }, [aendret]);

  const undertitel = `${sag.smuNummer} · ${kalkRaekke?.titel ?? sag.titel}`;

  if (indlaesFejl) {
    return <Ramme undertitel={undertitel}><Besked titel="Kalkulationen kunne ikke åbnes"><p>{indlaesFejl}</p></Besked></Ramme>;
  }
  if (!kalk || !version || !kalkRaekke) {
    return <Ramme undertitel={undertitel}><Besked titel="Åbner kalkulationen …" /></Ramme>;
  }

  const statusTekst =
    status.slags === "gemmer" ? "Gemmer …"
    : status.slags === "fejl" ? `Fejl: ${status.besked}`
    : aendret ? "Ikke gemte ændringer"
    : status.tid ? `Gemt ${status.tid.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`
    : "Gemt";
  const statusKlasse =
    status.slags === "fejl" ? "gem-status fejl" : aendret ? "gem-status aendret" : "gem-status";

  const handlinger = (
    <>
      <span className={statusKlasse} role="status" aria-live="polite">{statusTekst}</span>
      <span className="version-maerke">
        Version {version.versionsnummer} · {laast ? "låst" : "kladde"}
      </span>
      {laast ? (
        <button className="knap-sekundaer" onClick={() => void opretNyVersion()} disabled={status.slags === "gemmer"}>
          Ny version
        </button>
      ) : (
        <>
          <button
            className="knap-primaer"
            onClick={() => void gem()}
            disabled={!aendret || status.slags === "gemmer"}
            title="Gem kladden (Ctrl+S)"
          >
            Gem
          </button>
          <button
            className="knap-sekundaer"
            onClick={() => saetBekraeftLaas(true)}
            disabled={status.slags === "gemmer"}
            title="Godkend versionen internt. En låst version kan ikke ændres."
          >
            Lås version
          </button>
        </>
      )}
    </>
  );

  return (
    <Ramme undertitel={undertitel} handlinger={handlinger}>
      <KalkulationFlade
        key={`gemt-${noegle}`}
        kalk={kalk}
        saetKalk={saetKalk as React.Dispatch<React.SetStateAction<Kalkulation>>}
        sag={sag}
        laast={laast}
        advarsel={
          <>
            {laast && (
              <div className="notestribe info">
                <strong>Version {version.versionsnummer} er låst</strong> — internt godkendt
                {version.laastAt ? ` ${new Date(version.laastAt).toLocaleString("da-DK")}` : ""}. Den kan
                ikke ændres. Opret en ny version for at arbejde videre.
              </div>
            )}
            <div className="notestribe">
              <strong>Manuelle kostpriser.</strong> Materialepriserne kommer fra prototype-kataloget eller er
              tastet — de er ikke hentet fra SMU Source.
            </div>
          </>
        }
        fodnote={
          <p className="fodnote">
            <strong>Gemt kalkulation på {sag.smuNummer}.</strong> Sagsfelterne kommer fra SMU OS og rettes
            dér. Den kundevendte pris er det resultat, SMU OS senere skal bruge. Låsning er intern
            godkendelse af versionen — ikke kundens accept.
          </p>
        }
      />

      {bekraeftLaas && (
        <div className="overlag" role="dialog" aria-modal="true" aria-label="Lås version" onClick={() => saetBekraeftLaas(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <p className="dialog-tekst">Lås version {version.versionsnummer}?</p>
            <p className="dialog-note">
              Låsning er intern godkendelse. Versionen gemmes præcis som den står nu og kan derefter ikke
              ændres. Vil du arbejde videre, opretter du en ny version.
            </p>
            <div className="dialog-knapper">
              <button className="knap-sekundaer" onClick={() => saetBekraeftLaas(false)}>Annuller</button>
              <button className="knap-primaer" autoFocus onClick={() => void laas()}>Lås version</button>
            </div>
          </div>
        </div>
      )}
    </Ramme>
  );
}
