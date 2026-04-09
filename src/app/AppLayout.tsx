import { NavLink, Outlet } from 'react-router-dom'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/holdings', label: 'Holdings' },
  { to: '/watchlists', label: 'Watchlists' },
  { to: '/settings', label: 'Settings' },
]

export function AppLayout() {
  const { session, spreadsheet, clientReady, envConfigured } = useGoogleWorkspace()

  const statusText = !envConfigured
    ? 'Google client ID missing'
    : session
      ? spreadsheet
        ? `Connected to ${spreadsheet.title}`
        : 'Signed in, spreadsheet pending'
      : clientReady
        ? 'Ready for Google sign-in'
        : 'Preparing Google Identity'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">US Stock Monitor</p>
          <h1>Stocking</h1>
          <p className="brand-copy">Snapshot-based Google Sheets portfolio workspace.</p>
        </div>

        <nav className="nav-menu" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Version 0.3</p>
            <h2>Portfolio Workspace</h2>
          </div>
          <div className="topbar-cluster">
            {session ? (
              <div className="profile-chip">
                <span className="status-dot" />
                <div>
                  <strong>{session.profile.name}</strong>
                  <span>{session.profile.email}</span>
                </div>
              </div>
            ) : null}
            <div className="topbar-card">
              <span className="status-dot" />
              {statusText}
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  )
}
