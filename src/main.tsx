import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AsyncErrorBoundary } from './components/feedback/AsyncErrorBoundary'
import { ToastProvider } from './components/feedback/ToastProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AsyncErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AsyncErrorBoundary>
  </StrictMode>,
)
