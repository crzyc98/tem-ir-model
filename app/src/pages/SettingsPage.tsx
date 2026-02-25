import { useEffect, useState, useCallback } from 'react'
import { useOutletContext, useBlocker, Link } from 'react-router-dom'
import { Save, CheckCircle } from 'lucide-react'
import { getWorkspace, updateWorkspace } from '../services/api'
import type { LayoutContext } from '../types/workspace'
import type { Assumptions } from '../types/assumptions'
import type { Persona, AssetAllocation } from '../types/persona'

function toPercent(val: number): string {
  return (val * 100).toFixed(2).replace(/\.?0+$/, '')
}

function fromPercent(val: string): number {
  const num = parseFloat(val)
  return isNaN(num) ? 0 : num / 100
}

function PercentInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600">{label} (%)</label>
      <input
        type="number"
        step="0.01"
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        value={toPercent(value)}
        onChange={(e) => onChange(fromPercent(e.target.value))}
      />
    </div>
  )
}

function CurrencyInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600">{label} ($)</label>
      <input
        type="number"
        min={0}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  )
}

function PersonaRow({
  persona,
  onChange,
}: {
  persona: Persona
  onChange: (p: Persona) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const updateField = <K extends keyof Persona>(key: K, value: Persona[K]) => {
    onChange({ ...persona, [key]: value })
  }

  const updateAllocation = (alloc: AssetAllocation) => {
    updateField('allocation', alloc)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-800">{persona.name}</span>
          <span className="text-xs text-gray-500">{persona.label}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Age {persona.age}</span>
          <span>${persona.salary.toLocaleString()}</span>
          <span>{toPercent(persona.deferral_rate)}% deferral</span>
          <span className="text-gray-400">{expanded ? '−' : '+'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={persona.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Label</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={persona.label}
                onChange={(e) => updateField('label', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Age (18-80)</label>
              <input
                type="number"
                min={18}
                max={80}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={persona.age}
                onChange={(e) => updateField('age', Math.min(80, Math.max(18, parseInt(e.target.value) || 18)))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Tenure (0-60 yrs)</label>
              <input
                type="number"
                min={0}
                max={60}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={persona.tenure_years}
                onChange={(e) => updateField('tenure_years', Math.min(60, Math.max(0, parseInt(e.target.value) || 0)))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Salary ($)</label>
              <input
                type="number"
                min={1}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={persona.salary}
                onChange={(e) => updateField('salary', Math.max(1, parseFloat(e.target.value) || 1))}
              />
            </div>
            <PercentInput
              label="Deferral Rate"
              value={persona.deferral_rate}
              onChange={(v) => updateField('deferral_rate', Math.min(1, Math.max(0, v)))}
            />
            <div>
              <label className="block text-xs font-medium text-gray-600">Current Balance ($)</label>
              <input
                type="number"
                min={0}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={persona.current_balance}
                onChange={(e) => updateField('current_balance', Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">SS Claiming Age (62-70)</label>
              <input
                type="number"
                min={62}
                max={70}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={persona.ss_claiming_age}
                onChange={(e) => updateField('ss_claiming_age', Math.min(70, Math.max(62, parseInt(e.target.value) || 67)))}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={persona.include_social_security}
                onChange={(e) => updateField('include_social_security', e.target.checked)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Include Social Security
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600">Allocation Type</label>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="radio"
                  checked={persona.allocation.type === 'target_date'}
                  onChange={() =>
                    updateAllocation({ type: 'target_date', target_date_vintage: new Date().getFullYear() + 30 })
                  }
                />
                Target Date
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="radio"
                  checked={persona.allocation.type === 'custom'}
                  onChange={() =>
                    updateAllocation({ type: 'custom', stock_pct: 0.6, bond_pct: 0.3, cash_pct: 0.1 })
                  }
                />
                Custom
              </label>
            </div>

            {persona.allocation.type === 'target_date' && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600">Vintage Year</label>
                <input
                  type="number"
                  min={new Date().getFullYear()}
                  className="mt-1 w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={persona.allocation.target_date_vintage}
                  onChange={(e) =>
                    updateAllocation({
                      type: 'target_date',
                      target_date_vintage: parseInt(e.target.value) || new Date().getFullYear(),
                    })
                  }
                />
              </div>
            )}

            {persona.allocation.type === 'custom' && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  <PercentInput
                    label="Stock"
                    value={persona.allocation.stock_pct}
                    onChange={(v) =>
                      updateAllocation({ ...persona.allocation, type: 'custom', stock_pct: v } as AssetAllocation)
                    }
                  />
                  <PercentInput
                    label="Bond"
                    value={persona.allocation.bond_pct}
                    onChange={(v) =>
                      updateAllocation({ ...persona.allocation, type: 'custom', bond_pct: v } as AssetAllocation)
                    }
                  />
                  <PercentInput
                    label="Cash"
                    value={persona.allocation.cash_pct}
                    onChange={(v) =>
                      updateAllocation({ ...persona.allocation, type: 'custom', cash_pct: v } as AssetAllocation)
                    }
                  />
                </div>
                {persona.allocation.type === 'custom' && (() => {
                  const total = (persona.allocation.stock_pct + persona.allocation.bond_pct + persona.allocation.cash_pct) * 100
                  const valid = Math.abs(total - 100) <= 1
                  return (
                    <p className={`text-xs ${valid ? 'text-green-600' : 'text-red-600'}`}>
                      Total: {total.toFixed(1)}% {valid ? '' : '(must sum to 100%)'}
                    </p>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { activeWorkspace, refreshWorkspaces } = useOutletContext<LayoutContext>()

  const [assumptions, setAssumptions] = useState<Assumptions | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty],
    ),
  )

  useEffect(() => {
    if (!activeWorkspace) return

    setLoading(true)
    setError(null)
    getWorkspace(activeWorkspace.id)
      .then((data) => {

        setAssumptions(data.base_config)
        setPersonas(data.personas)
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [activeWorkspace])

  const updateAssumption = <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => {
    setAssumptions((prev) => (prev ? { ...prev, [key]: value } : prev))
    setIsDirty(true)
  }

  const updatePersona = (index: number, persona: Persona) => {
    setPersonas((prev) => {
      const next = [...prev]
      next[index] = persona
      return next
    })
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!activeWorkspace || !assumptions) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const data = await updateWorkspace(activeWorkspace.id, {
        base_config: {
          inflation_rate: assumptions.inflation_rate,
          wage_growth_rate: assumptions.wage_growth_rate,
          wage_growth_std: assumptions.wage_growth_std,
          equity: assumptions.equity,
          intl_equity: assumptions.intl_equity,
          fixed_income: assumptions.fixed_income,
          cash: assumptions.cash,
          comp_limit: assumptions.comp_limit,
          deferral_limit: assumptions.deferral_limit,
          additions_limit: assumptions.additions_limit,
          catchup_limit: assumptions.catchup_limit,
          super_catchup_limit: assumptions.super_catchup_limit,
        },
      })
      setAssumptions(data.base_config)
      setPersonas(data.personas)
      setIsDirty(false)
      setSaved(true)
      await refreshWorkspaces()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-sm text-gray-500">
          Select a workspace to edit settings.{' '}
          <Link to="/dashboard" className="font-medium text-brand-500 hover:text-brand-600">
            Go to Dashboard
          </Link>
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="h-6 w-1/4 rounded bg-gray-200" />
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!assumptions) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Saved
            </span>
          )}
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => {
              setError(null)
              if (activeWorkspace) {
                setLoading(true)
                getWorkspace(activeWorkspace.id)
                  .then((data) => {
                    setAssumptions(data.base_config)
                    setPersonas(data.personas)
                  })
                  .catch((err) => setError((err as Error).message))
                  .finally(() => setLoading(false))
              }
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Base Assumptions */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">Base Assumptions</h3>

        <div className="mt-4 space-y-6">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Economic</h4>
            <div className="mt-2 grid grid-cols-3 gap-4">
              <PercentInput
                label="Inflation Rate"
                value={assumptions.inflation_rate}
                onChange={(v) => updateAssumption('inflation_rate', v)}
              />
              <PercentInput
                label="Wage Growth Rate"
                value={assumptions.wage_growth_rate}
                onChange={(v) => updateAssumption('wage_growth_rate', v)}
              />
              <PercentInput
                label="Wage Growth Std Dev"
                value={assumptions.wage_growth_std}
                onChange={(v) => updateAssumption('wage_growth_std', v)}
              />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Asset Returns</h4>
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(['equity', 'intl_equity', 'fixed_income', 'cash'] as const).map((assetClass) => (
                <div key={assetClass} className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <h5 className="text-xs font-medium capitalize text-gray-700">
                    {assetClass.replace('_', ' ')}
                  </h5>
                  <PercentInput
                    label="Expected Return"
                    value={assumptions[assetClass].expected_return}
                    onChange={(v) =>
                      updateAssumption(assetClass, {
                        ...assumptions[assetClass],
                        expected_return: v,
                      })
                    }
                  />
                  <PercentInput
                    label="Std Deviation"
                    value={assumptions[assetClass].standard_deviation}
                    onChange={(v) =>
                      updateAssumption(assetClass, {
                        ...assumptions[assetClass],
                        standard_deviation: v,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">IRS Limits</h4>
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <CurrencyInput
                label="Compensation"
                value={assumptions.comp_limit}
                onChange={(v) => updateAssumption('comp_limit', v)}
              />
              <CurrencyInput
                label="Deferral"
                value={assumptions.deferral_limit}
                onChange={(v) => updateAssumption('deferral_limit', v)}
              />
              <CurrencyInput
                label="Additions"
                value={assumptions.additions_limit}
                onChange={(v) => updateAssumption('additions_limit', v)}
              />
              <CurrencyInput
                label="Catch-up"
                value={assumptions.catchup_limit}
                onChange={(v) => updateAssumption('catchup_limit', v)}
              />
              <CurrencyInput
                label="Super Catch-up"
                value={assumptions.super_catchup_limit}
                onChange={(v) => updateAssumption('super_catchup_limit', v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personas */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">Personas</h3>
        <p className="mt-1 text-xs text-gray-500">
          Click on a persona to expand and edit all fields.
        </p>

        <div className="mt-4 space-y-2">
          {personas.map((persona, i) => (
            <PersonaRow
              key={persona.id}
              persona={persona}
              onChange={(p) => updatePersona(i, p)}
            />
          ))}
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
