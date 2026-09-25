import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { AuthGate } from './components/LoginView'
import './components/TeamWorkspace.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider><AuthGate><App /></AuthGate></AuthProvider>
  </StrictMode>,
)
