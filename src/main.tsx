import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/serviceWorker'

createRoot(document.getElementById('root')!).render(<App />)

// Register service worker for offline support
registerServiceWorker()
