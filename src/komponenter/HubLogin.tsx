import { useState } from 'react'
import { supabase } from '../lib/supabase'

const HUB_URL = 'https://smu.signmeup.dk'

/**
 * DEV-login — findes KUN i lokal udvikling mod et ikke-LIVE Supabase-projekt.
 * Samme mønster og samme to spærrer som SMU OS (smu-os/src/pages/Login.tsx):
 *   1. `import.meta.env.DEV` er false i ethvert produktionsbuild, så blokken
 *      fjernes af bundleren og kan ikke nå en deployet app.
 *   2. Ref'en skal være forskellig fra LIVE. Peger den lokale opsætning på LIVE,
 *      vises formularen ikke — heller ikke under `npm run dev`.
 * Der findes ingen DEV-Hub, så uden denne indgang kan DEV slet ikke bruges lokalt.
 */
const LIVE_REF = 'ggnnfzhhqhwmugubfxuj'
const AKTUEL_REF =
  /https?:\/\/([a-z0-9]{20})\.supabase\./.exec(import.meta.env.VITE_SUPABASE_URL ?? '')?.[1] ?? null
const DEV_LOGIN = import.meta.env.DEV && AKTUEL_REF !== null && AKTUEL_REF !== LIVE_REF

/**
 * SMU Kalkulation har intet eget login.
 *
 * SMU Platform har ét fælles login på SMU Hub (TR-051, TR-052). Sessionen deles via
 * platform-cookien på `.smu.signmeup.dk`, så login i Hub åbner appen uden nyt login.
 * Samme indgang som SMU OS og SMU Arkiv. Et Hub-login giver ikke i sig selv adgang
 * til denne app — det afgør `app_adgange`.
 */
export default function HubLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="smu-card w-full max-w-[380px] p-8">
        <div className="mb-6 text-center">
          <h1 className="text-[19px] font-extrabold text-navy">SMU Kalkulation</h1>
          <p className="mt-1 text-sm font-semibold text-text-muted">Kalkulation af opgaver</p>
        </div>

        <h2 className="text-[15px] font-extrabold text-navy">Log ind på SMU Hub</h2>
        <p className="mt-2 text-sm text-text-muted">
          SMU Platform har ét fælles login. Log ind på Hub med dit korte brugernavn og din
          personlige adgangskode — så åbner SMU Kalkulation uden at du skal logge ind igen.
        </p>

        <a href={HUB_URL} className="smu-btn-primary mt-5 block text-center" style={{ textDecoration: 'none' }}>
          Gå til SMU Hub
        </a>

        <p className="mt-4 text-xs font-semibold text-text-muted">
          Fælles login virker kun på <code>*.smu.signmeup.dk</code>. Lokalt kører appen uden
          login, når Supabase-nøglerne ikke er sat.
        </p>

        {DEV_LOGIN && <DevLogin />}
      </div>
    </div>
  )
}

function DevLogin() {
  const [email, setEmail] = useState('')
  const [kode, setKode] = useState('')
  const [fejl, setFejl] = useState<string | null>(null)
  const [arbejder, setArbejder] = useState(false)

  async function logInd(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setFejl(null)
    setArbejder(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: kode })
    setArbejder(false)
    if (error) setFejl(error.message)
  }

  return (
    <form onSubmit={logInd} className="mt-6 border-t border-border pt-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-orange-deep">
        DEV-login · {AKTUEL_REF}
      </p>
      <p className="mt-1 text-xs font-semibold text-text-muted">
        Kun lokal udvikling mod DEV. Findes ikke i den deployede app.
      </p>
      <input
        className="smu-input mt-3"
        type="email"
        autoComplete="username"
        placeholder="DEV-email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="smu-input mt-2"
        type="password"
        autoComplete="current-password"
        placeholder="DEV-adgangskode"
        value={kode}
        onChange={(e) => setKode(e.target.value)}
      />
      {fejl && <p className="mt-2 text-xs font-bold text-red-deep">{fejl}</p>}
      <button type="submit" className="smu-btn-secondary mt-3 w-full" disabled={arbejder}>
        {arbejder ? 'Logger ind …' : 'Log ind i DEV'}
      </button>
    </form>
  )
}
