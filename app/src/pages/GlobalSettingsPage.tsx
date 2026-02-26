import { useEffect, useState } from 'react'
import { Save, CheckCircle, RotateCcw } from 'lucide-react'
import { getGlobalSettings, saveGlobalSettings, restoreGlobalSettings } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import type { GlobalSettings } from '../types/global-settings'
import { NUM_SIMULATIONS } from '../types/global-settings'

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
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600">
        {label} (%)
      </label>
      <input
        type="number"
        step="0.01"
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        value={toPercent(value)}
        onChange={(e) => onChange(fromPercent(e.target.value))}
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
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

function AgeInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600">
        {label} ({min}–{max})
      </label>
      <input
        type="number"
        min={min}
        max={max}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value)
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
        }}
      />
    </div>
  )
}

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getGlobalSettings()
      .then((data) => setSettings(data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const update = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
    setIsDirty(true)
    setValidationError(null)
  }

  const validate = (s: GlobalSettings): string | null => {
    if (s.planning_age <= s.retirement_age) {
      return `Planning Age (${s.planning_age}) must be greater than Retirement Age (${s.retirement_age}).`
    }
    if (s.ss_claiming_age < 62 || s.ss_claiming_age > 70) {
      return 'SS Claiming Age must be between 62 and 70.'
    }
    if (
      s.target_replacement_ratio_mode === 'flat_percentage' &&
      (s.target_replacement_ratio_override === null ||
        s.target_replacement_ratio_override < 0 ||
        s.target_replacement_ratio_override > 1)
    ) {
      return 'A flat replacement ratio percentage (0–100%) is required when override mode is selected.'
    }
    const limitFields: (keyof GlobalSettings)[] = [
      'comp_limit', 'deferral_limit', 'additions_limit',
      'catchup_limit', 'super_catchup_limit', 'ss_taxable_max',
    ]
    for (const f of limitFields) {
      if ((s[f] as number) <= 0) {
        return `All IRS limit fields must be positive.`
      }
    }
    return null
  }

  const handleSave = async () => {
    if (!settings) return
    const err = validate(settings)
    if (err) {
      setValidationError(err)
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const saved = await saveGlobalSettings(settings)
      setSettings(saved)
      setIsDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async () => {
    setRestoring(true)
    setError(null)
    try {
      const defaults = await restoreGlobalSettings()
      setSettings(defaults)
      setIsDirty(false)
      setValidationError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRestoring(false)
      setShowRestoreConfirm(false)
    }
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

  if (!settings) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 shadow-sm">
        <p className="text-sm text-red-600">{error ?? 'Failed to load global settings.'}</p>
        <button
          type="button"
          className="mt-3 text-sm font-medium text-red-600 underline"
          onClick={() => {
            setLoading(true)
            setError(null)
            getGlobalSettings()
              .then(setSettings)
              .catch((err) => setError((err as Error).message))
              .finally(() => setLoading(false))
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Global Settings</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Defaults applied to newly created workspaces. Existing workspaces are not affected.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Saved
            </span>
          )}
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setShowRestoreConfirm(true)}
            disabled={saving || restoring}
          >
            <RotateCcw className="h-4 w-4" />
            Restore System Defaults
          </button>
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
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {validationError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {validationError}
        </div>
      )}

      {/* Economic & IRS Assumptions */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">Economic &amp; IRS Assumptions</h3>

        <div className="mt-4 space-y-6">
          {/* Economic */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Economic</h4>
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <PercentInput
                label="Inflation Rate"
                value={settings.inflation_rate}
                onChange={(v) => update('inflation_rate', v)}
              />
              <PercentInput
                label="Salary Real Growth Rate"
                value={settings.salary_real_growth_rate}
                onChange={(v) => update('salary_real_growth_rate', v)}
                hint={`Nominal ≈ ${toPercent(
                  (1 + settings.salary_real_growth_rate) * (1 + settings.inflation_rate) - 1
                )}% at current inflation`}
              />
            </div>
          </div>

          {/* IRS Limits */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">IRS Limits</h4>
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CurrencyInput
                label="Compensation §401(a)(17)"
                value={settings.comp_limit}
                onChange={(v) => update('comp_limit', v)}
              />
              <CurrencyInput
                label="Deferral §402(g)"
                value={settings.deferral_limit}
                onChange={(v) => update('deferral_limit', v)}
              />
              <CurrencyInput
                label="Annual Additions §415(c)"
                value={settings.additions_limit}
                onChange={(v) => update('additions_limit', v)}
              />
              <CurrencyInput
                label="Catch-up 50+ §402(g)"
                value={settings.catchup_limit}
                onChange={(v) => update('catchup_limit', v)}
              />
              <CurrencyInput
                label="Super Catch-up 60–63"
                value={settings.super_catchup_limit}
                onChange={(v) => update('super_catchup_limit', v)}
              />
              <CurrencyInput
                label="SS Taxable Maximum"
                value={settings.ss_taxable_max}
                onChange={(v) => update('ss_taxable_max', v)}
              />
            </div>
          </div>

          {/* Target Replacement Ratio */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Target Replacement Ratio
            </h4>
            <div className="mt-2 space-y-3">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  className="mt-0.5"
                  checked={settings.target_replacement_ratio_mode === 'lookup_table'}
                  onChange={() => {
                    update('target_replacement_ratio_mode', 'lookup_table')
                    update('target_replacement_ratio_override', null)
                  }}
                />
                <span>
                  <span className="font-medium">Use income-based lookup table</span>
                  <span className="ml-1 text-gray-500">(default — ratio varies by income tier)</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  className="mt-0.5"
                  checked={settings.target_replacement_ratio_mode === 'flat_percentage'}
                  onChange={() => {
                    update('target_replacement_ratio_mode', 'flat_percentage')
                    if (settings.target_replacement_ratio_override === null) {
                      update('target_replacement_ratio_override', 0.80)
                    }
                  }}
                />
                <span className="font-medium">Override with flat percentage applied to all personas</span>
              </label>

              {settings.target_replacement_ratio_mode === 'flat_percentage' && (
                <div className="ml-6 w-40">
                  <PercentInput
                    label="Flat Replacement Ratio"
                    value={settings.target_replacement_ratio_override ?? 0.80}
                    onChange={(v) => update('target_replacement_ratio_override', v)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Configuration */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">Simulation Configuration</h3>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <AgeInput
            label="Retirement Age"
            value={settings.retirement_age}
            min={55}
            max={70}
            onChange={(v) => update('retirement_age', v)}
          />
          <AgeInput
            label="Planning Age"
            value={settings.planning_age}
            min={85}
            max={100}
            onChange={(v) => update('planning_age', v)}
          />
          <AgeInput
            label="SS Claiming Age"
            value={settings.ss_claiming_age}
            min={62}
            max={70}
            onChange={(v) => update('ss_claiming_age', v)}
          />
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Number of Simulations
            </label>
            <input
              type="number"
              className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500 shadow-sm"
              value={NUM_SIMULATIONS}
              disabled
              readOnly
            />
            <p className="mt-1 text-xs text-gray-400">
              Fixed by scenario matrix architecture — not configurable
            </p>
          </div>
        </div>
      </div>

      {/* Restore confirmation dialog */}
      <ConfirmDialog
        isOpen={showRestoreConfirm}
        title="Restore System Defaults"
        message="This will reset all global settings to the original system defaults. Existing workspaces are not affected."
        confirmLabel="Restore Defaults"
        cancelLabel="Cancel"
        isLoading={restoring}
        onConfirm={handleRestore}
        onCancel={() => setShowRestoreConfirm(false)}
      />
    </div>
  )
}
