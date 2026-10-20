import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import HubLogin from './komponenter/HubLogin'
import IngenAdgang from './komponenter/IngenAdgang'
import KalkulationSide from './komponenter/KalkulationSide'
import SagKalkulationSide from './komponenter/SagKalkulationSide'

/**
 * Adgangsgate i fire trin:
 *   indlæser          -> rolig ventetilstand
 *   ingen session     -> "Log ind på SMU Hub" (ingen lokal login-formular)
 *   ingen app-adgang  -> IngenAdgang (rolig, ikke en fejlskærm)
 *   adgang / lokal udvikling -> appen
 *
 * Tjekket er UX. Den reelle grænse er RLS på kalk_-tabellerne og OS-kontrakten.
 *
 * Ruter:
 *   /                               demo (prototypens cases, gemmer intet)
 *   /sag/:sagId                     sagens kalkulationer — åbnes fra SMU OS
 *   /sag/:sagId/k/:kalkulationId    gemt kalkulation
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
      <Route path="sag/:sagId" element={<SagKalkulationSide />} />
      <Route path="sag/:sagId/k/:kalkulationId" element={<SagKalkulationSide />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
