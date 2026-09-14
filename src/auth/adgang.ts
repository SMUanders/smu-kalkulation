// ============================================================================
// SMU Kalkulation — adgangsregel (ren funktion, ingen React og intet netværk)
// ----------------------------------------------------------------------------
// Fælles SMU-model: login sker i SMU Hub, sessionen deles via platform-cookien,
// og adgang til appen kræver en aktiv række i `app_adgange` for app-key
// `kalkulation` — eller global super-admin. Frontend-tjekket er UX; den reelle
// grænse bliver RLS, når appen får data i databasen.
//
// MIDLERTIDIGT (dokumenteret i README):
//   - App-key `kalkulation` og rollerne er BESLUTTET (TR-059), men ikke oprettet
//     i `app_roller`. Opslaget i `app_adgange` returnerer derfor nul rækker, og
//     i praksis kan kun global super-admin åbne appen. Der fakes ingen adgang.
//   - Når app-key og roller oprettes ved migration, giver samme kode adgang til
//     `bruger` og `admin` uden ændring.
//   - `lokal_udvikling` findes kun i `npm run dev` uden Supabase-nøgler. Appen har
//     i dette trin ingen data i databasen at beskytte.
// ============================================================================

export const APP_KEY = "kalkulation";

/** Besluttet adgangsmodel (TR-059). Bevidst ingen `observatoer`. */
export type KalkulationRolle = "bruger" | "admin";

const GYLDIGE_ROLLER: readonly KalkulationRolle[] = ["bruger", "admin"];

/** Tolker en rå `app_adgange.rolle`. Alt uden for modellen — også `observatoer` — giver null. */
export function tolkRolle(raa: string | null | undefined): KalkulationRolle | null {
  return GYLDIGE_ROLLER.includes(raa as KalkulationRolle) ? (raa as KalkulationRolle) : null;
}

export type Adgangstilstand =
  | "indlaeser"
  | "lokal_udvikling"
  | "ikke_logget_ind"
  | "ingen_adgang"
  | "adgang";

export interface AdgangsInput {
  supabaseKonfigureret: boolean;
  erUdvikling: boolean;
  indlaeser: boolean;
  harSession: boolean;
  profilAktiv: boolean;
  erSuperAdmin: boolean;
  rolle: KalkulationRolle | null;
}

export function afgoerAdgang(i: AdgangsInput): Adgangstilstand {
  // Uden Supabase findes der ingen identitet. Kun lokal udvikling må køre videre.
  if (!i.supabaseKonfigureret) return i.erUdvikling ? "lokal_udvikling" : "ingen_adgang";
  if (i.indlaeser) return "indlaeser";
  if (!i.harSession) return "ikke_logget_ind";
  // Som `har_app_adgang()`: en deaktiveret profil har ingen adgang, heller ikke som super-admin.
  if (!i.profilAktiv) return "ingen_adgang";
  if (i.erSuperAdmin || i.rolle !== null) return "adgang";
  return "ingen_adgang";
}
