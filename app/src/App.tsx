import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import GlobalSettingsPage from './pages/GlobalSettingsPage'
import PersonaModelingPage from './pages/PersonaModelingPage'
import PlanComparisonPage from './pages/PlanComparisonPage'
import ScenariosPage from './pages/ScenariosPage'
import ScenarioCreatePage from './pages/ScenarioCreatePage'
import ScenarioEditPage from './pages/ScenarioEditPage'
import SettingsPage from './pages/SettingsPage'
import ResultsDashboardPage from './pages/ResultsDashboardPage'
import AnalyzePage from './pages/AnalyzePage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/personas" element={<PersonaModelingPage />} />
        <Route path="/plans" element={<PlanComparisonPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/scenarios/new" element={<ScenarioCreatePage />} />
        <Route path="/scenarios/:scenarioId/results" element={<ResultsDashboardPage />} />
        <Route path="/scenarios/:scenarioId" element={<ScenarioEditPage />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/global-settings" element={<GlobalSettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
