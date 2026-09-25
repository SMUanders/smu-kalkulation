import { LogOut } from 'lucide-react'
import { AppSwitcher } from '../platform-nav/AppSwitcher'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { APP_KEY } from '../auth/adgang'
import { appProductVersion } from '../lib/version'

/**
 * Platformens app-skifter og log ud — i kalkulationens eksisterende topbjælke, så der
 * ikke opstår en parallel navigation. Bjælken er fuld ved ~1440 px, derfor er
 * platform-delen kompakt: navn og rolle står i log ud-knappens tooltip.
 *
 * SMU Kalkulation står ikke i Hub-kataloget endnu og optræder derfor bevidst ikke
 * i app-skifterens liste.
 */
export default function PlatformHandlinger() {
  const { tilstand, profil, bruger, rolle, logUd } = useAuth()

  if (tilstand === 'lokal_udvikling' || !supabase) {
    return (
      <span
        className="platform-lokal"
        title="Lokal udvikling: npm run dev uden Supabase-nøgler. Intet login, ingen databaseforbindelse — kun lokale demo-data. Et produktionsbuild starter ikke uden nøgler."
      >
        Lokal dev
      </span>
    )
  }

  const navn = profil?.fuldt_navn?.trim() || bruger?.email || ''
  const rolleTekst = rolle ?? (profil?.er_super_admin ? 'super-admin' : null)
  const hvem = [navn, rolleTekst].filter(Boolean).join(' · ')

  return (
    <div className="platform-handlinger">
      {/* Diskret produktversion. Kilde: package.json (se lib/version.ts). */}
      <span
        className="hidden sm:inline text-[11px] font-semibold tabular-nums"
        style={{ color: 'rgba(255,255,255,0.45)' }}
      >
        {appProductVersion()}
      </span>
      <AppSwitcher supabase={supabase} currentAppKey={APP_KEY} />
      <button
        type="button"
        className="platform-logud"
        onClick={() => void logUd()}
        title={hvem ? `Log ud (${hvem})` : 'Log ud'}
        aria-label="Log ud"
      >
        <LogOut size={16} />
      </button>
    </div>
  )
}
