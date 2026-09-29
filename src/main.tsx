import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/plugins' // register built-in extra detectors
import { useStore } from './store/useStore'
import { getAllLocales, setCustomLocales } from './lib/i18n'
import App from './App.tsx'

// Применяем сохранённые пользовательские языки к реестрам после rehydration
setCustomLocales(useStore.getState().customLocales ?? [])
useStore.subscribe(s => setCustomLocales(s.customLocales ?? []))
// Сброс на английский, если активная локаль неизвестна
if(!getAllLocales().some(l => l.code === useStore.getState().locale)){
  useStore.getState().setLocale('en')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
