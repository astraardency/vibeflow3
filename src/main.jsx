import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TVApp from './TVApp.jsx'

const isTVMode = window.location.search.includes('mode=tv') || localStorage.getItem('tv_mode') === 'true';

import { ErrorBoundary } from './ErrorBoundary.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { PlayerProvider } from './contexts/PlayerContext.jsx'
import { LiveConnectProvider } from './contexts/LiveConnectContext.jsx'
import { AppProvider } from './contexts/AppContext.jsx'
import { PlaylistProvider } from './contexts/PlaylistContext.jsx'
import { PlayerTimeProvider } from './contexts/PlayerTimeContext.jsx'

import { DeviceConnectProvider } from './contexts/DeviceConnectContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <DeviceConnectProvider>
          <PlayerTimeProvider>
            <PlayerProvider>
              <LiveConnectProvider>
                <AppProvider>
                  <PlaylistProvider>
                    {isTVMode ? <TVApp /> : <App />}
                  </PlaylistProvider>
                </AppProvider>
              </LiveConnectProvider>
            </PlayerProvider>
          </PlayerTimeProvider>
        </DeviceConnectProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
