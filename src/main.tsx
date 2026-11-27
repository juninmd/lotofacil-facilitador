import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@juninmd/sonido/styles.css'
import './sonido-bridge.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
