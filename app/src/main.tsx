import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import PersonaModelingPage from './pages/PersonaModelingPage'
import PlanComparisonPage from './pages/PlanComparisonPage'
import ScenariosPage from './pages/ScenariosPage'
import ScenarioCreatePage from './pages/ScenarioCreatePage'
import ScenarioEditPage from './pages/ScenarioEditPage'
import SettingsPage from './pages/SettingsPage'
import ResultsDashboardPage from './pages/ResultsDashboardPage'
import NotFoundPage from './pages/NotFoundPage'
import './index.css'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/personas', element: <PersonaModelingPage /> },
      { path: '/plans', element: <PlanComparisonPage /> },
      { path: '/scenarios/new', element: <ScenarioCreatePage /> },
      { path: '/scenarios/:scenarioId/results', element: <ResultsDashboardPage /> },
      { path: '/scenarios/:scenarioId', element: <ScenarioEditPage /> },
      { path: '/scenarios', element: <ScenariosPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
