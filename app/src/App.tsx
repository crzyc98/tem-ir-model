import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import PersonaModelingPage from './pages/PersonaModelingPage'
import PlanComparisonPage from './pages/PlanComparisonPage'
import ScenariosPage from './pages/ScenariosPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/personas" element={<PersonaModelingPage />} />
        <Route path="/plans" element={<PlanComparisonPage />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
