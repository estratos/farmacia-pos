import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { migrateLocalData } from './migration.ts'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'

// Migración única de datos locales (IDs numéricos → UUID) antes del primer render
migrateLocalData()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
