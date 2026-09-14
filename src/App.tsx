import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import HubLogin from './komponenter/HubLogin'
import IngenAdgang from './komponenter/IngenAdgang'
import KalkulationSide from './komponenter/KalkulationSide'

/**
 * Adgangsgate i fire trin:
 *   indlæser          -> rolig ventetilstand
 *   ingen session     -> "Log ind på SMU Hub" (ingen lokal login-formular)
 *   ingen app-adgang  -> IngenAdgang (rolig, ikke en fejlskærm)
 *   adgang / lokal udvikling -> appen
 *
 * Tjekket er UX. Appen har i dette trin ingen data i databasen.
 */
export default function App() {
  const { tilstand } = useAuth()

  if (tilstand === 'indlaeser') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm font-bold text-text-muted">
        Åbner SMU Kalkulation…
      </div>
    )
  }
  if (tilstand === 'ikke_logget_ind') return <HubLogin />
  if (tilstand === 'ingen_adgang') return <IngenAdgang />

  return (
    <Routes>
      <Route index element={<KalkulationSide />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
