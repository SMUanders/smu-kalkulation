import { LockKeyhole, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { APP_KEY } from '../auth/adgang'

/**
 * Vises til en gyldigt logget ind SMU-bruger UDEN adgang til SMU Kalkulation.
 * Skal ikke ligne en teknisk fejl.
 *
 * MIDLERTIDIGT: app-key `kalkulation` er besluttet, men endnu ikke oprettet i
 * platformens adgangsmodel. Indtil da kan kun global super-admin åbne appen.
 */
export default function IngenAdgang() {
  const { bruger, logUd } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="smu-card w-full max-w-[460px] px-8 py-10 text-center">
        <div className="mb-4 flex justify-center">
          <LockKeyhole size={28} style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <h1 className="text-[17px] font-extrabold text-navy">Du har ikke adgang til SMU Kalkulation</h1>
        <p className="mx-auto mt-2 max-w-[380px] text-sm font-semibold text-text-muted">
          SMU Kalkulation er under opbygning. Adgang tildeles senere som en aktiv række i
          <code> app_adgange</code> for app-nøglen <strong>{APP_KEY}</strong> — den er endnu
          ikke oprettet.
        </p>
        {bruger?.email && (
          <p className="mt-4 text-xs font-bold text-text-muted">Logget ind som {bruger.email}</p>
        )}
        <button type="button" className="smu-btn-secondary mt-5" onClick={() => void logUd()}>
          <span className="inline-flex items-center gap-2">
            <LogOut size={15} />
            Log ud
          </span>
        </button>
      </div>
    </div>
  )
}
