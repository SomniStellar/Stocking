import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { useGoogleWorkspace } from './features/google/GoogleWorkspaceContext'
import { GoogleWorkspaceProvider } from './features/google/GoogleWorkspaceProvider'
import { DashboardPage } from './pages/DashboardPage'
import { HoldingsPage } from './pages/HoldingsPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { WatchlistsPage } from './pages/WatchlistsPage'

function ProtectedLayout() {
  const { session } = useGoogleWorkspace()
  const previewMode = new URLSearchParams(window.location.search).get('preview')
  const isLocalPreviewHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  const isPreviewWorkspace = isLocalPreviewHost && (previewMode === 'holdings' || previewMode === 'dashboard' || previewMode === 'settings' || previewMode === 'watchlists')

  if (!session && !isPreviewWorkspace) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout />
}

function App() {
  return (
    <GoogleWorkspaceProvider>
      <AppErrorBoundary>
        <Routes>
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/holdings" element={<HoldingsPage />} />
            <Route path="/watchlists" element={<WatchlistsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AppErrorBoundary>
    </GoogleWorkspaceProvider>
  )
}

export default App






