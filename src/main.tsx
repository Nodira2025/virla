import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Portal } from './Portal'
import { AuthProvider } from './context/AuthContext'
import './components/TeamWorkspace.css'
import './institutional.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider><Portal /></AuthProvider>
  </StrictMode>,
)
