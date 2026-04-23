import { NavLink, Outlet } from 'react-router-dom'
import '../styles/layout.css'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/holdings', label: 'Holdings' },
  { to: '/settings', label: 'Settings' },
]

export function AppLayout() {
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
        </header>

        <Outlet />
      </main>
    </div>
  )
}
