import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/base.css'
import './styles/common.css'
import './styles/auth.css'
import './styles/layout.css'
import './styles/holdings.css'
import './styles/dashboard.css'
import './styles/watchlists.css'
import './styles/settings.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
