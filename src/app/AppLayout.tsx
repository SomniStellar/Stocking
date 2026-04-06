import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/holdings', label: 'Holdings' },
  { to: '/favorites', label: 'Favorites' },
  { to: '/ideas', label: 'Ideas' },
  { to: '/settings', label: 'Settings' },
]

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">US Stock Monitor</p>
          <h1>Stocking</h1>
          <p className="brand-copy">
            Google Sheets and GOOGLEFINANCE based monitoring workspace.
          </p>
        </div>

        <nav className="nav-menu" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Version 0.1</p>
            <h2>Portfolio Workspace</h2>
          </div>
          <div className="topbar-card">
            <span className="status-dot" />
            Sheets-first MVP skeleton
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  )
}
