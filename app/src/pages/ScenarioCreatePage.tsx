import { useState, useRef, useCallback } from 'react'
import { useOutletContext, useNavigate, useBlocker } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { createScenario } from '../services/api'
import PlanDesignForm from '../components/PlanDesignForm'
import type { LayoutContext } from '../types/workspace'
import type { PlanDesign } from '../types/plan-design'

export default function ScenarioCreatePage() {
  const { activeWorkspace } = useOutletContext<LayoutContext>()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const isDirtyRef = useRef(false)

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
        isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
      [],
    ),
  )

  if (!activeWorkspace) {
    navigate('/dashboard')
    return null
  }

  const handleSubmit = async (planDesign: PlanDesign, runAfter = false) => {
    setNameError(null)
    setError(null)

    if (!name.trim()) {
      setNameError('Scenario name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const scenario = await createScenario(activeWorkspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        plan_design: { ...planDesign, name: name.trim() },
      })
      isDirtyRef.current = false
      navigate(runAfter ? `/scenarios/${scenario.id}/results` : '/scenarios')
    } catch (err) {
      const message = (err as Error).message
      if (message.includes('404')) {
        setError('Workspace not found. Redirecting to dashboard...')
        setTimeout(() => navigate('/dashboard'), 2000)
      } else {
        setError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitAndRun = (planDesign: PlanDesign) => {
    handleSubmit(planDesign, true)
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
        <span className="text-gray-800">New Scenario</span>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">New Scenario</h2>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="scenario-name" className="block text-sm font-medium text-gray-700">
              Scenario Name
            </label>
            <input
              id="scenario-name"
              type="text"
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                nameError ? 'border-red-300' : 'border-gray-300'
              }`}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                isDirtyRef.current = true
                if (nameError) setNameError(null)
              }}
              placeholder="e.g., Base Plan"
              autoFocus
            />
            {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
          </div>

          <div>
            <label htmlFor="scenario-desc" className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              id="scenario-desc"
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                isDirtyRef.current = true
              }}
              placeholder="Optional description..."
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <PlanDesignForm
            onSubmit={handleSubmit}
            onSubmitAndRun={handleSubmitAndRun}
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
