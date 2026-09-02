import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import PointOfSale from './pages/PointOfSale'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import SettingsPage from './pages/Settings'
import Movements from './pages/Movements'
import CashPage from './pages/Cash'
import { AppProvider } from './contexts/AppContext'

function App() {
  return (
    <AppProvider>
      <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<PointOfSale />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/movements" element={<Movements />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/cash" element={<CashPage />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  )
}

export default App
