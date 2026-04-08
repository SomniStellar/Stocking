import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { useGoogleWorkspace } from './features/google/GoogleWorkspaceContext'
import { GoogleWorkspaceProvider } from './features/google/GoogleWorkspaceProvider'
import { CashPage } from './pages/CashPage'
import { DashboardPage } from './pages/DashboardPage'
import { HoldingsPage } from './pages/HoldingsPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { WatchlistsPage } from './pages/WatchlistsPage'

function ProtectedLayout() {
  const { session } = useGoogleWorkspace()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout />
}

function App() {
  return (
    <GoogleWorkspaceProvider>
      <Routes>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/holdings" element={<HoldingsPage />} />
          <Route path="/watchlists" element={<WatchlistsPage />} />
          <Route path="/cash" element={<CashPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </GoogleWorkspaceProvider>
  )
}

export default App