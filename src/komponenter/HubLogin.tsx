const HUB_URL = 'https://smu.signmeup.dk'

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
      </div>
    </div>
  )
}
