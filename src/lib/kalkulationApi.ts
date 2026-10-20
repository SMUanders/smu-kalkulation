// ============================================================================
// SMU Kalkulation — datalag
// ----------------------------------------------------------------------------
// Eneste sted, appen taler med databasen om kalkulationer. Al adgang er RLS:
//   kalk_kalkulationer / kalk_versioner  (Kalkulation-ejet)
//   kalkulation_sag(uuid)                (OS-ejet read-contract — sagen kopieres ikke)
// Låsning, SMU-snapshot og "højst én kladde" håndhæves af databasen; her vises
// fejlene blot pænt.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { lavVersionsdata, nyKalkulation, type SagHoved } from "../domain/versionsdata";
import type { Kalkulation } from "../domain/typer";

export interface SagVisning extends SagHoved {
  sagId: string;
  arbejdsstatus: string | null;
}

export interface KalkulationRaekke {
  id: string;
  sagId: string;
  losningId: string | null;
  smuNummerVisning: string;
  titel: string;
  aktivVersionId: string | null;
  createdAt: string;
}

export type Versionsstatus = "kladde" | "laast";

export interface VersionRaekke {
  id: string;
  kalkulationId: string;
  versionsnummer: number;
  status: Versionsstatus;
  laastAt: string | null;
  indhold: Kalkulation;
  kundevendtSamlet: number | null;
  updatedAt: string;
}

/** Fejl, appen kan vise uden teknisk støj. */
export class KalkulationFejl extends Error {}

function db(): SupabaseClient {
  if (!supabase) throw new KalkulationFejl("Appen er ikke forbundet til databasen (mangler Supabase-nøgler).");
  return supabase;
}

function fejlTekst(e: { message?: string; code?: string } | null): string {
  if (!e) return "Ukendt fejl";
  if (e.message?.includes("låst")) return e.message;
  if (e.code === "42501" || /row-level security|permission denied/i.test(e.message ?? ""))
    return "Du har ikke adgang til at gemme kalkulationer.";
  return e.message ?? "Ukendt fejl";
}

// --- mapning ---------------------------------------------------------------

type KalkDb = {
  id: string; sag_id: string; losning_id: string | null; smu_nummer_visning: string;
  titel: string; aktiv_version_id: string | null; created_at: string;
};
type VersionDb = {
  id: string; kalkulation_id: string; versionsnummer: number; status: Versionsstatus;
  laast_at: string | null; indhold: Kalkulation; kundevendt_samlet: number | string | null; updated_at: string;
};

const KALK_FELTER = "id, sag_id, losning_id, smu_nummer_visning, titel, aktiv_version_id, created_at";
const VERSION_FELTER = "id, kalkulation_id, versionsnummer, status, laast_at, indhold, kundevendt_samlet, updated_at";

function tilKalk(r: KalkDb): KalkulationRaekke {
  return {
    id: r.id, sagId: r.sag_id, losningId: r.losning_id, smuNummerVisning: r.smu_nummer_visning,
    titel: r.titel, aktivVersionId: r.aktiv_version_id, createdAt: r.created_at,
  };
}
function tilVersion(r: VersionDb): VersionRaekke {
  return {
    id: r.id, kalkulationId: r.kalkulation_id, versionsnummer: r.versionsnummer, status: r.status,
    laastAt: r.laast_at, indhold: r.indhold,
    kundevendtSamlet: r.kundevendt_samlet === null ? null : Number(r.kundevendt_samlet),
    updatedAt: r.updated_at,
  };
}

// --- sag (OS-kontrakt) -----------------------------------------------------

/** Sagen via OS' read-contract. null = findes ikke, er slettet, eller ingen adgang. */
export async function hentSag(sagId: string): Promise<SagVisning | null> {
  const { data, error } = await db().rpc("kalkulation_sag", { _sag_id: sagId });
  if (error) throw new KalkulationFejl(fejlTekst(error));
  const r = (data as Array<Record<string, string | null>> | null)?.[0];
  if (!r) return null;
  return {
    sagId: r.sag_id as string,
    smuNummer: r.smu_nummer ?? "",
    titel: r.titel ?? "",
    kundeNavn: r.kunde_navn ?? "",
    tegningsNummer: r.tegnings_nummer ?? "",
    arbejdsstatus: r.arbejdsstatus,
  };
}

// --- kalkulationer ---------------------------------------------------------

export interface KalkulationMedVersion {
  kalkulation: KalkulationRaekke;
  aktivVersion: VersionRaekke | null;
}

export async function listKalkulationer(sagId: string): Promise<KalkulationMedVersion[]> {
  const { data, error } = await db()
    .from("kalk_kalkulationer").select(KALK_FELTER)
    .eq("sag_id", sagId).eq("slettet", false).order("created_at");
  if (error) throw new KalkulationFejl(fejlTekst(error));
  const kalk = (data as KalkDb[]).map(tilKalk);
  const ider = kalk.map((k) => k.aktivVersionId).filter((x): x is string => !!x);
  let versioner: VersionRaekke[] = [];
  if (ider.length) {
    const v = await db().from("kalk_versioner").select(VERSION_FELTER).in("id", ider);
    if (v.error) throw new KalkulationFejl(fejlTekst(v.error));
    versioner = (v.data as VersionDb[]).map(tilVersion);
  }
  return kalk.map((k) => ({ kalkulation: k, aktivVersion: versioner.find((v) => v.id === k.aktivVersionId) ?? null }));
}

/** Kalkulationen med dens aktive version. Mangler versionen (afbrudt oprettelse), oprettes version 1. */
export async function hentKalkulation(kalkulationId: string, sag: SagVisning): Promise<KalkulationMedVersion> {
  const k = await db().from("kalk_kalkulationer").select(KALK_FELTER).eq("id", kalkulationId).eq("slettet", false).maybeSingle();
  if (k.error) throw new KalkulationFejl(fejlTekst(k.error));
  if (!k.data) throw new KalkulationFejl("Kalkulationen findes ikke.");
  const kalk = tilKalk(k.data as KalkDb);
  if (kalk.sagId !== sag.sagId) throw new KalkulationFejl("Kalkulationen hører ikke til denne sag.");
  if (!kalk.aktivVersionId) {
    return { kalkulation: kalk, aktivVersion: await opretVersion(kalk, 1, nyKalkulation(kalk.id, sag)) };
  }
  const v = await db().from("kalk_versioner").select(VERSION_FELTER).eq("id", kalk.aktivVersionId).single();
  if (v.error) throw new KalkulationFejl(fejlTekst(v.error));
  return { kalkulation: kalk, aktivVersion: tilVersion(v.data as VersionDb) };
}

/** Ny kalkulation på sagen med en tom kladde som version 1. */
export async function opretKalkulation(sag: SagVisning, titel: string): Promise<KalkulationMedVersion> {
  const id = crypto.randomUUID();
  // smu_nummer_visning sættes af serveren fra OS-kontrakten; værdien her overskrives.
  const k = await db().from("kalk_kalkulationer")
    .insert({ id, sag_id: sag.sagId, titel: titel.trim() || sag.titel, smu_nummer_visning: sag.smuNummer })
    .select(KALK_FELTER).single();
  if (k.error) throw new KalkulationFejl(fejlTekst(k.error));
  const kalk = tilKalk(k.data as KalkDb);
  const version = await opretVersion(kalk, 1, nyKalkulation(id, sag));
  return { kalkulation: { ...kalk, aktivVersionId: version.id }, aktivVersion: version };
}

async function opretVersion(kalk: KalkulationRaekke, nummer: number, indhold: Kalkulation): Promise<VersionRaekke> {
  const data = lavVersionsdata(indhold);
  const v = await db().from("kalk_versioner")
    .insert({ kalkulation_id: kalk.id, versionsnummer: nummer, ...data })
    .select(VERSION_FELTER).single();
  if (v.error) throw new KalkulationFejl(fejlTekst(v.error));
  const version = tilVersion(v.data as VersionDb);
  const u = await db().from("kalk_kalkulationer").update({ aktiv_version_id: version.id }).eq("id", kalk.id);
  if (u.error) throw new KalkulationFejl(fejlTekst(u.error));
  return version;
}

/**
 * Gem kladden. Optimistisk samtidighed: lykkes kun, hvis versionen ikke er
 * ændret siden den blev hentet. Ellers fejler gemningen i stedet for at
 * overskrive en andens ændring.
 */
export async function gemKladde(version: VersionRaekke, indhold: Kalkulation, laas = false): Promise<VersionRaekke> {
  const data = lavVersionsdata(indhold);
  const v = await db().from("kalk_versioner")
    .update({ ...data, ...(laas ? { status: "laast" as const } : {}) })
    .eq("id", version.id).eq("updated_at", version.updatedAt)
    .select(VERSION_FELTER);
  if (v.error) throw new KalkulationFejl(fejlTekst(v.error));
  const raekke = (v.data as VersionDb[])[0];
  if (!raekke) throw new KalkulationFejl("Kalkulationen er ændret et andet sted siden du åbnede den. Genindlæs siden.");
  return tilVersion(raekke);
}

/** Lås = intern godkendelse af versionen, gemt med præcis det indhold, der vises. */
export function laasVersion(version: VersionRaekke, indhold: Kalkulation): Promise<VersionRaekke> {
  return gemKladde(version, indhold, true);
}

/** Ny kladde som kopi af den låste version. */
export async function nyVersion(kalk: KalkulationRaekke, fra: VersionRaekke): Promise<VersionRaekke> {
  return opretVersion(kalk, fra.versionsnummer + 1, fra.indhold);
}
