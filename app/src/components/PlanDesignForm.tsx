import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type {
  PlanDesign,
  MatchTier,
  VestingSchedule,
  CoreContributionTier,
} from '../types/plan-design'

const DEFAULT_PLAN_DESIGN: PlanDesign = {
  name: '',
  match_tiers: [],
  match_vesting: { type: 'immediate' },
  match_eligibility_months: 0,
  core_contribution_pct: 0,
  core_age_service_tiers: null,
  core_vesting: { type: 'immediate' },
  core_eligibility_months: 0,
  auto_enroll_enabled: true,
  auto_enroll_rate: 0.06,
  auto_escalation_enabled: true,
  auto_escalation_rate: 0.01,
  auto_escalation_cap: 0.10,
}

const DEFAULT_GRADED_SCHEDULE: Record<string, number> = {
  '1': 0.2,
  '2': 0.4,
  '3': 0.6,
  '4': 0.8,
  '5': 1.0,
}

interface PlanDesignFormProps {
  initialValues?: PlanDesign
  onSubmit: (pd: PlanDesign) => void
  onCancel: () => void
  isSubmitting: boolean
}

function toPercent(val: number): string {
  return (val * 100).toFixed(1).replace(/\.0$/, '')
}

function fromPercent(val: string): number {
  const num = parseFloat(val)
  return isNaN(num) ? 0 : num / 100
}

function VestingSelector({
  value,
  onChange,
  label,
}: {
  value: VestingSchedule
  onChange: (v: VestingSchedule) => void
  label: string
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-4">
        {(['immediate', 'cliff', 'graded'] as const).map((type) => (
          <label key={type} className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="radio"
              name={label}
              checked={value.type === type}
              onChange={() => {
                if (type === 'immediate') onChange({ type: 'immediate' })
                else if (type === 'cliff') onChange({ type: 'cliff', years: 3 })
                else onChange({ type: 'graded', schedule: { ...DEFAULT_GRADED_SCHEDULE } })
              }}
            />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </label>
        ))}
      </div>
      {value.type === 'cliff' && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-gray-600">Cliff Years (1-6)</label>
          <input
            type="number"
            min={1}
            max={6}
            className="mt-1 block w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={value.years}
            onChange={(e) =>
              onChange({ type: 'cliff', years: Math.min(6, Math.max(1, parseInt(e.target.value) || 1)) })
            }
          />
        </div>
      )}
      {value.type === 'graded' && (
        <div className="mt-2 space-y-1">
          <label className="block text-xs font-medium text-gray-600">Graded Schedule</label>
          {Object.entries(value.schedule).map(([year, pct]) => (
            <div key={year} className="flex items-center gap-2 text-sm">
              <span className="w-16 text-gray-500">Year {year}:</span>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={toPercent(pct)}
                onChange={(e) => {
                  const newSchedule = { ...value.schedule }
                  newSchedule[year] = fromPercent(e.target.value)
                  onChange({ type: 'graded', schedule: newSchedule })
                }}
              />
              <span className="text-gray-400">%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PlanDesignForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: PlanDesignFormProps) {
  const [form, setForm] = useState<PlanDesign>(initialValues ?? DEFAULT_PLAN_DESIGN)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = <K extends keyof PlanDesign>(key: K, value: PlanDesign[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    if (form.auto_enroll_enabled && form.auto_escalation_enabled) {
      if (form.auto_escalation_cap < form.auto_enroll_rate) {
        errs.auto_escalation_cap = 'Escalation cap must be >= auto-enroll rate'
      }
    }

    if (form.match_tiers.length > 3) {
      errs.match_tiers = 'Maximum 3 match tiers'
    }

    form.match_tiers.forEach((tier, i) => {
      if (tier.match_rate < 0 || tier.match_rate > 1) {
        errs[`match_tier_${i}_rate`] = 'Match rate must be 0-100%'
      }
      if (tier.on_first_pct < 0 || tier.on_first_pct > 1) {
        errs[`match_tier_${i}_pct`] = 'Percentage must be 0-100%'
      }
    })

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(form)
    }
  }

  const addMatchTier = () => {
    if (form.match_tiers.length >= 3) return
    updateField('match_tiers', [...form.match_tiers, { match_rate: 1.0, on_first_pct: 0.06 }])
  }

  const removeMatchTier = (index: number) => {
    updateField(
      'match_tiers',
      form.match_tiers.filter((_, i) => i !== index),
    )
  }

  const updateMatchTier = (index: number, field: keyof MatchTier, value: number) => {
    const tiers = [...form.match_tiers]
    tiers[index] = { ...tiers[index], [field]: value }
    updateField('match_tiers', tiers)
  }

  const addCoreTier = () => {
    const tiers = form.core_age_service_tiers ?? []
    if (tiers.length >= 5) return
    const newTier: CoreContributionTier = {
      min_age: null,
      max_age: null,
      min_service: null,
      max_service: null,
      contribution_pct: 0.03,
    }
    updateField('core_age_service_tiers', [...tiers, newTier])
  }

  const removeCoreTier = (index: number) => {
    const tiers = form.core_age_service_tiers ?? []
    const updated = tiers.filter((_, i) => i !== index)
    updateField('core_age_service_tiers', updated.length > 0 ? updated : null)
  }

  const updateCoreTier = (index: number, field: keyof CoreContributionTier, value: number | null) => {
    const tiers = [...(form.core_age_service_tiers ?? [])]
    tiers[index] = { ...tiers[index], [field]: value }
    updateField('core_age_service_tiers', tiers)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 2: Employer Match */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Employer Match</h3>

        <div className="space-y-3">
          {form.match_tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600">Match Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className={`mt-1 block w-full rounded-lg border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    errors[`match_tier_${i}_rate`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={toPercent(tier.match_rate)}
                  onChange={(e) => updateMatchTier(i, 'match_rate', fromPercent(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600">On First (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className={`mt-1 block w-full rounded-lg border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    errors[`match_tier_${i}_pct`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={toPercent(tier.on_first_pct)}
                  onChange={(e) => updateMatchTier(i, 'on_first_pct', fromPercent(e.target.value))}
                />
              </div>
              <button
                type="button"
                className="mt-5 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => removeMatchTier(i)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {errors.match_tiers && (
            <p className="text-sm text-red-600">{errors.match_tiers}</p>
          )}
          {form.match_tiers.length < 3 && (
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
              onClick={addMatchTier}
            >
              <Plus className="h-4 w-4" />
              Add Match Tier
            </button>
          )}
        </div>

        <VestingSelector
          label="Match Vesting"
          value={form.match_vesting}
          onChange={(v) => updateField('match_vesting', v)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Match Eligibility (months, 0-12)
          </label>
          <input
            type="number"
            min={0}
            max={12}
            className="mt-1 block w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.match_eligibility_months}
            onChange={(e) =>
              updateField('match_eligibility_months', Math.min(12, Math.max(0, parseInt(e.target.value) || 0)))
            }
          />
        </div>
      </section>

      {/* Section 3: Core Contribution */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Core Contribution</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Core Contribution Rate (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            className="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={toPercent(form.core_contribution_pct)}
            onChange={(e) => updateField('core_contribution_pct', fromPercent(e.target.value))}
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.core_age_service_tiers !== null}
              onChange={(e) =>
                updateField(
                  'core_age_service_tiers',
                  e.target.checked
                    ? [{ min_age: null, max_age: null, min_service: null, max_service: null, contribution_pct: 0.03 }]
                    : null,
                )
              }
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            Use age/service tiers
          </label>
        </div>

        {form.core_age_service_tiers && (
          <div className="space-y-2">
            {form.core_age_service_tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <div>
                  <label className="block text-xs text-gray-500">Min Age</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={tier.min_age ?? ''}
                    onChange={(e) =>
                      updateCoreTier(i, 'min_age', e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Max Age</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={tier.max_age ?? ''}
                    onChange={(e) =>
                      updateCoreTier(i, 'max_age', e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Min Svc</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={tier.min_service ?? ''}
                    onChange={(e) =>
                      updateCoreTier(i, 'min_service', e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Max Svc</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={tier.max_service ?? ''}
                    onChange={(e) =>
                      updateCoreTier(i, 'max_service', e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Contrib %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={toPercent(tier.contribution_pct)}
                    onChange={(e) => updateCoreTier(i, 'contribution_pct', fromPercent(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  className="mt-4 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  onClick={() => removeCoreTier(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {form.core_age_service_tiers.length < 5 && (
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
                onClick={addCoreTier}
              >
                <Plus className="h-4 w-4" />
                Add Tier
              </button>
            )}
          </div>
        )}

        <VestingSelector
          label="Core Vesting"
          value={form.core_vesting}
          onChange={(v) => updateField('core_vesting', v)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Core Eligibility (months, 0-12)
          </label>
          <input
            type="number"
            min={0}
            max={12}
            className="mt-1 block w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.core_eligibility_months}
            onChange={(e) =>
              updateField('core_eligibility_months', Math.min(12, Math.max(0, parseInt(e.target.value) || 0)))
            }
          />
        </div>
      </section>

      {/* Section 4: Auto-Enrollment */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Auto-Enrollment</h3>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.auto_enroll_enabled}
            onChange={(e) => updateField('auto_enroll_enabled', e.target.checked)}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Auto-enroll enabled
        </label>

        {form.auto_enroll_enabled && (
          <div className="space-y-3 pl-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Auto-Enroll Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                className="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={toPercent(form.auto_enroll_rate)}
                onChange={(e) => updateField('auto_enroll_rate', fromPercent(e.target.value))}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.auto_escalation_enabled}
                onChange={(e) => updateField('auto_escalation_enabled', e.target.checked)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Auto-escalation enabled
            </label>

            {form.auto_escalation_enabled && (
              <div className="space-y-3 pl-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Escalation Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={toPercent(form.auto_escalation_rate)}
                    onChange={(e) => updateField('auto_escalation_rate', fromPercent(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Escalation Cap (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className={`mt-1 block w-32 rounded-lg border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                      errors.auto_escalation_cap ? 'border-red-300' : 'border-gray-300'
                    }`}
                    value={toPercent(form.auto_escalation_cap)}
                    onChange={(e) => updateField('auto_escalation_cap', fromPercent(e.target.value))}
                  />
                  {errors.auto_escalation_cap && (
                    <p className="mt-1 text-sm text-red-600">{errors.auto_escalation_cap}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          disabled={isSubmitting || Object.keys(errors).length > 0}
        >
          {isSubmitting && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          Save
        </button>
      </div>
    </form>
  )
}
