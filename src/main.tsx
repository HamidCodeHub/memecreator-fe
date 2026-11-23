import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled with the app instead of loaded from Google Fonts: no visitor IP goes to a third party (GDPR)
import '@fontsource/anton/400.css'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import './styles.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
