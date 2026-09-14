import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { platformAuthStorage } from '../platform-nav/platformStorage'

// SMU Kalkulation bruger SAMME Supabase-projekt som de øvrige SMU-apps (delt login,
// delte brugere, RLS). Kun anon key i frontend.
//
// MIDLERTIDIGT I DETTE TRIN: appen læser og skriver ingen domænedata i databasen.
// Klienten bruges kun til at identificere brugeren og læse brugerens egen
// app-adgang. Derfor må `npm run dev` køre uden nøgler på lokale demo-data —
// jf. SMU_APP_STANDARD §4 ("lokal dev uden keys må være åben"). I et
// produktionsbuild nægter appen at starte uden nøgler, så produktion aldrig kan
// være åben. Når kalkulationer persisteres, fjernes den lokale udviklingstilstand.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseKonfigureret = Boolean(url && anonKey)

if (!supabaseKonfigureret && !import.meta.env.DEV) {
  throw new Error(
    'Supabase URL og anon key mangler. Kopiér .env.example til .env.local og udfyld dem.',
  )
}

/** Én delt singleton-klient, eller null i lokal udvikling uden nøgler. */
export const supabase: SupabaseClient | null = supabaseKonfigureret
  ? createClient(url, anonKey, {
      auth: {
        // Delt platform-session: cookie på *.smu.signmeup.dk, ellers localStorage.
        storage: platformAuthStorage(),
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
