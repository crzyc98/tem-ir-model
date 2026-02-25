import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, useNavigate, useParams, useBlocker } from 'react-router-dom'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { getScenario, updateScenario } from '../services/api'
import PlanDesignForm from '../components/PlanDesignForm'
import type { LayoutContext } from '../types/workspace'
import type { ScenarioResponse } from '../types/scenario'
import type { PlanDesign } from '../types/plan-design'

export default function ScenarioEditPage() {
  const { activeWorkspace } = useOutletContext<LayoutContext>()
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const navigate = useNavigate()

  const [scenario, setScenario] = useState<ScenarioResponse | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty],
    ),
  )

  useEffect(() => {
    if (!activeWorkspace || !scenarioId) return

    setLoading(true)
    setError(null)
    getScenario(activeWorkspace.id, scenarioId)
      .then((data) => {
        setScenario(data)
        setName(data.name)
        setDescription(data.description ?? '')
      })
      .catch((err) => {
        const message = (err as Error).message
        if (message.includes('404')) {
          setNotFound(true)
        } else {
          setError(message)
        }
      })
      .finally(() => setLoading(false))
  }, [activeWorkspace, scenarioId])

  if (!activeWorkspace) {
    navigate('/dashboard')
    return null
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="h-6 w-1/3 rounded bg-gray-200" />
          <div className="mt-4 h-4 w-2/3 rounded bg-gray-200" />
          <div className="mt-8 space-y-4">
            <div className="h-10 rounded bg-gray-200" />
            <div className="h-10 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Scenario not found</h2>
        <p className="mt-2 text-sm text-gray-500">
          This scenario may have been deleted.{' '}
          <button
            type="button"
            className="font-medium text-brand-500 hover:text-brand-600"
            onClick={() => navigate('/scenarios')}
          >
            Back to Scenarios
          </button>
        </p>
      </div>
    )
  }

  if (!scenario) return null

  const handleSubmit = async (planDesign: PlanDesign) => {
    setError(null)
    setIsSubmitting(true)
    try {
      await updateScenario(activeWorkspace.id, scenarioId!, {
        name: name.trim(),
        description: description.trim() || undefined,
        plan_design: { ...planDesign, name: name.trim() },
      })
      setIsDirty(false)
      navigate('/scenarios')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          type="button"
          className="hover:text-brand-500"
          onClick={() => navigate('/scenarios')}
        >
          Scenarios
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-800">{scenario.name}</span>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
              Scenario Name
            </label>
            <input
              id="edit-name"
              type="text"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setIsDirty(true)
              }}
            />
          </div>

          <div>
            <label htmlFor="edit-desc" className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              id="edit-desc"
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setIsDirty(true)
              }}
            />
          </div>

          {scenario.warnings.length > 0 && (
            <div className="space-y-2">
              {scenario.warnings.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
              <button
                type="button"
                className="ml-2 font-medium underline"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <PlanDesignForm
            initialValues={scenario.plan_design}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/scenarios')}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800">Unsaved Changes</h3>
            <p className="mt-2 text-sm text-gray-500">
              You have unsaved changes. Are you sure you want to leave?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => blocker.reset()}
              >
                Stay
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                onClick={() => blocker.proceed()}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
