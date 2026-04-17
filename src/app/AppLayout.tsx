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

  const workspaceStatus = !envConfigured
    ? {
        label: 'AUTH',
        title: '[Dev/Test] Client ID missing',
        detail: 'Configure Google sign-in',
      }
    : session
      ? spreadsheet
        ? {
            label: 'SHEET',
            title: 'Sheet connected',
            detail: spreadsheet.title,
          }
        : {
            label: 'SHEET',
            title: 'Sheet pending',
            detail: 'Signed in, connect a spreadsheet',
          }
      : clientReady
        ? {
            label: 'AUTH',
            title: 'Google ready',
            detail: 'Sign-in available',
          }
        : {
            label: 'AUTH',
            title: 'Preparing sign-in',
            detail: 'Loading Google Identity',
          }

  const accountTitle = session
    ? `${session.profile.name} (${session.profile.email})`
    : ''
  const statusTitle = `${workspaceStatus.title} (${workspaceStatus.detail})`

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <h1>Stock_ing</h1>
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
            <h2>Portfolio Workspace</h2>
          </div>
          <div className="topbar-cluster">
            {session ? (
              <div className="profile-chip" title={accountTitle}>
                <span className="chip-badge">ACC</span>
                <div className="chip-copy">
                  <strong>{session.profile.name}</strong>
                </div>
              </div>
            ) : null}
            <div className="topbar-card" title={statusTitle}>
              <span className="chip-badge">{workspaceStatus.label}</span>
              <div className="chip-copy">
                <strong>{workspaceStatus.title}</strong>
              </div>
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  )
}
