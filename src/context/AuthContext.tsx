import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseKonfigureret } from '../lib/supabase'
import {
  APP_KEY,
  afgoerAdgang,
  tolkRolle,
  type Adgangstilstand,
  type KalkulationRolle,
} from '../auth/adgang'

/**
 * Fælles SMU-auth efter samme mønster som SMU Source og SMU ESG.
 *
 * Identiteten kommer fra det delte Supabase Auth + `profiler`. En gyldig SMU-session
 * giver IKKE i sig selv adgang: det kræver en aktiv `app_adgange`-række for app-key
 * `kalkulation` eller global super-admin. Selve afgørelsen er den rene funktion
 * `afgoerAdgang` i `auth/adgang.ts`.
 */
export interface Profil {
  id: string
  fuldt_navn: string | null
  aktiv: boolean
  er_super_admin: boolean
}

interface AuthState {
  tilstand: Adgangstilstand
  bruger: User | null
  profil: Profil | null
  rolle: KalkulationRolle | null
  logUd: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [bruger, setBruger] = useState<User | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [rolle, setRolle] = useState<KalkulationRolle | null>(null)
  const [indlaeser, setIndlaeser] = useState(supabase !== null)

  const hentAdgang = useCallback(async (brugerId: string) => {
    if (!supabase) return
    // RLS tillader kun at læse egen profil og egne app_adgange, så filtrene er eksplicitte.
    // App-key `kalkulation` findes endnu ikke i app_roller, så opslaget giver nul rækker.
    const [profilSvar, adgangSvar] = await Promise.all([
      supabase
        .from('profiler')
        .select('id, fuldt_navn, aktiv, er_super_admin')
        .eq('id', brugerId)
        .maybeSingle(),
      supabase
        .from('app_adgange')
        .select('rolle')
        .eq('user_id', brugerId)
        .eq('app', APP_KEY)
        .eq('aktiv', true)
        .maybeSingle(),
    ])
    setProfil((profilSvar.data as Profil | null) ?? null)
    setRolle(tolkRolle((adgangSvar.data as { rolle: string } | null)?.rolle))
  }, [])

  useEffect(() => {
    if (!supabase) return
    const klient = supabase
    let aktiv = true

    klient.auth.getSession().then(async ({ data }) => {
      const sessionBruger = data.session?.user ?? null
      if (!aktiv) return
      setBruger(sessionBruger)
      if (sessionBruger) await hentAdgang(sessionBruger.id)
      if (aktiv) setIndlaeser(false)
    })

    const {
      data: { subscription },
    } = klient.auth.onAuthStateChange((_haendelse, session) => {
      const sessionBruger = session?.user ?? null
      setBruger(sessionBruger)
      if (sessionBruger) {
        void hentAdgang(sessionBruger.id)
      } else {
        setProfil(null)
        setRolle(null)
      }
    })

    return () => {
      aktiv = false
      subscription.unsubscribe()
    }
  }, [hentAdgang])

  const tilstand = afgoerAdgang({
    supabaseKonfigureret,
    erUdvikling: import.meta.env.DEV,
    indlaeser,
    harSession: bruger !== null,
    profilAktiv: profil?.aktiv === true,
    erSuperAdmin: profil?.er_super_admin === true,
    rolle,
  })

  const logUd = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ tilstand, bruger, profil, rolle, logUd }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth skal bruges inden i AuthProvider')
  return ctx
}
