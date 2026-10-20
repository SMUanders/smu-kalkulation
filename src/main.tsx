import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'
import { PlatformUpdateBoundary } from './platform-update/PlatformUpdateBoundary'
import { UpdateBanner } from './platform-update/UpdateBanner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Fælles update-notifikation (platform-update): banner ved ny version, recovery-kort ved lazy-fejl. */}
    <PlatformUpdateBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </PlatformUpdateBoundary>
    <UpdateBanner />
  </StrictMode>,
)
