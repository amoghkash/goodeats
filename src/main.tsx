import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { isSupabaseConfigured } from './lib/supabase.ts'
import ConfigError from './components/ConfigError.tsx'

const root = createRoot(document.getElementById('root')!)

if (!isSupabaseConfigured) {
  // Missing env vars — show a clear message instead of a blank/grey screen.
  root.render(
    <StrictMode>
      <ConfigError />
    </StrictMode>,
  )
} else {
  // Register the service worker (handles offline shell + push notifications).
  registerSW({ immediate: true })

  root.render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}
