import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { createWorkspace } from '../services/api'
import type { Workspace } from '../types/workspace'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (workspace: Workspace) => void
}

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreated,
}: CreateWorkspaceModalProps) {
  const [clientName, setClientName] = useState('')
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [inflationRate, setInflationRate] = useState('')
  const [wageGrowthRate, setWageGrowthRate] = useState('')
  const [compLimit, setCompLimit] = useState('')
  const [deferralLimit, setDeferralLimit] = useState('')
  const [additionsLimit, setAdditionsLimit] = useState('')
  const [catchupLimit, setCatchupLimit] = useState('')
  const [superCatchupLimit, setSuperCatchupLimit] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  if (!isOpen) return null

  const isDirty =
    clientName.trim() !== '' ||
    inflationRate !== '' ||
    wageGrowthRate !== '' ||
    compLimit !== '' ||
    deferralLimit !== '' ||
    additionsLimit !== '' ||
    catchupLimit !== '' ||
    superCatchupLimit !== ''

  const handleClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard?')) return
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setClientName('')
    setShowAssumptions(false)
    setInflationRate('')
    setWageGrowthRate('')
    setCompLimit('')
    setDeferralLimit('')
    setAdditionsLimit('')
    setCatchupLimit('')
    setSuperCatchupLimit('')
    setError(null)
    setNameError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError(null)
    setError(null)

    if (!clientName.trim()) {
      setNameError('Client name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const workspace = await createWorkspace({ client_name: clientName.trim() })
      resetForm()
      onCreated(workspace)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-800">New Workspace</h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
              Client Name
            </label>
            <input
              id="client-name"
              type="text"
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                nameError ? 'border-red-300' : 'border-gray-300'
              }`}
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value)
                if (nameError) setNameError(null)
              }}
              placeholder="e.g., Acme Corp"
              autoFocus
            />
            {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
          </div>

          <div>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              onClick={() => setShowAssumptions(!showAssumptions)}
            >
              {showAssumptions ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Customize Assumptions
            </button>

            {showAssumptions && (
              <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Leave blank to use 2026 IRS defaults.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Inflation Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(e.target.value)}
                      placeholder="2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Wage Growth Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={wageGrowthRate}
                      onChange={(e) => setWageGrowthRate(e.target.value)}
                      placeholder="3.0"
                    />
                  </div>
                </div>

                <h4 className="text-xs font-semibold text-gray-700">IRS Limits ($)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Compensation Limit
                    </label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={compLimit}
                      onChange={(e) => setCompLimit(e.target.value)}
                      placeholder="345,000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Deferral Limit
                    </label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={deferralLimit}
                      onChange={(e) => setDeferralLimit(e.target.value)}
                      placeholder="23,500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Additions Limit
                    </label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={additionsLimit}
                      onChange={(e) => setAdditionsLimit(e.target.value)}
                      placeholder="70,000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Catch-up Limit
                    </label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={catchupLimit}
                      onChange={(e) => setCatchupLimit(e.target.value)}
                      placeholder="7,500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Super Catch-up Limit
                    </label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={superCatchupLimit}
                      onChange={(e) => setSuperCatchupLimit(e.target.value)}
                      placeholder="11,250"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
