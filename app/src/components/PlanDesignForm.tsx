import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type {
  PlanDesign,
  MatchTier,
  CoreContributionTier,
} from '../types/plan-design'
import { calculateSummaryRows } from '../utils/contribution-calculator'

const DEFAULT_PLAN_DESIGN: PlanDesign = {
  name: '',
  match_tiers: [],
  match_vesting: { type: 'immediate' },
  match_eligibility_months: 0,
  core_contribution_pct: 0,
  core_age_service_tiers: null,
  core_vesting: { type: 'immediate' },
  core_eligibility_months: 0,
  auto_enroll_enabled: false,
  auto_enroll_rate: 0,
  auto_escalation_enabled: false,
  auto_escalation_rate: 0,
  auto_escalation_cap: 0,
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
  }

  const validate = (current: PlanDesign): Record<string, string> => {
    const errs: Record<string, string> = {}

    if (current.auto_enroll_enabled && current.auto_escalation_enabled) {
      if (current.auto_escalation_cap < current.auto_enroll_rate) {
        errs.auto_escalation_cap = 'Escalation cap must be at least the auto-enroll rate'
      }
    }

    if (current.match_tiers.length > 3) {
      errs.match_tiers = 'Maximum 3 match tiers allowed'
    }

    current.match_tiers.forEach((tier, i) => {
      if (tier.match_rate < 0 || tier.match_rate > 1) {
        errs[`match_tier_${i}_rate`] = 'Match rate must be 0-100%'
      }
      if (tier.on_first_pct < 0 || tier.on_first_pct > 1) {
        errs[`match_tier_${i}_pct`] = 'Percentage must be 0-100%'
      }
    })

    // Core tier validation
    if (current.core_age_service_tiers) {
      current.core_age_service_tiers.forEach((tier, i) => {
        // At least one dimension must have bounds
        const hasAge = tier.min_age !== null || tier.max_age !== null
        const hasService = tier.min_service !== null || tier.max_service !== null
        if (!hasAge && !hasService) {
          errs[`core_tier_${i}_dimension`] = `Tier ${i + 1} must have at least age or service bounds`
        }

        // Min < max checks
        if (tier.min_age !== null && tier.max_age !== null && tier.min_age >= tier.max_age) {
          errs[`core_tier_${i}_age`] = 'Min age must be less than max age'
        }
        if (tier.min_service !== null && tier.max_service !== null && tier.min_service >= tier.max_service) {
          errs[`core_tier_${i}_service`] = 'Min service must be less than max service'
        }
      })

      // Pairwise overlap detection
      const tiers = current.core_age_service_tiers
      for (let i = 0; i < tiers.length; i++) {
        for (let j = i + 1; j < tiers.length; j++) {
          const a = tiers[i]
          const b = tiers[j]

          // Check age overlap
          const aHasAge = a.min_age !== null || a.max_age !== null
          const bHasAge = b.min_age !== null || b.max_age !== null
          if (aHasAge && bHasAge) {
            const aMin = a.min_age ?? 0
            const aMax = a.max_age ?? Infinity
            const bMin = b.min_age ?? 0
            const bMax = b.max_age ?? Infinity
            if (aMin < bMax && bMin < aMax) {
              // Check service overlap on shared dimension
              const aHasSvc = a.min_service !== null || a.max_service !== null
              const bHasSvc = b.min_service !== null || b.max_service !== null
              if (aHasSvc && bHasSvc) {
                const asMin = a.min_service ?? 0
                const asMax = a.max_service ?? Infinity
                const bsMin = b.min_service ?? 0
                const bsMax = b.max_service ?? Infinity
                if (asMin < bsMax && bsMin < asMax) {
                  errs[`core_tier_overlap_${i}_${j}`] = `Tiers ${i + 1} and ${j + 1} have overlapping age and service ranges`
                }
              } else if (!aHasSvc && !bHasSvc) {
                errs[`core_tier_overlap_${i}_${j}`] = `Tiers ${i + 1} and ${j + 1} have overlapping age ranges`
              }
            }
          }

          // Check service-only overlap (when neither has age)
          const aOnlySvc = (a.min_age === null && a.max_age === null) && (a.min_service !== null || a.max_service !== null)
          const bOnlySvc = (b.min_age === null && b.max_age === null) && (b.min_service !== null || b.max_service !== null)
          if (aOnlySvc && bOnlySvc) {
            const asMin = a.min_service ?? 0
            const asMax = a.max_service ?? Infinity
            const bsMin = b.min_service ?? 0
            const bsMax = b.max_service ?? Infinity
            if (asMin < bsMax && bsMin < asMax) {
              errs[`core_tier_overlap_${i}_${j}`] = `Tiers ${i + 1} and ${j + 1} have overlapping service ranges`
            }
          }
        }
      }
    }

    return errs
  }

  // Real-time validation
  useEffect(() => {
    const errs = validate(form)
    setErrors(errs)
  }, [form])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length === 0) {
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

  const handleAutoEnrollToggle = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      auto_enroll_enabled: checked,
      auto_enroll_rate: checked && prev.auto_enroll_rate === 0 ? 0.06 : prev.auto_enroll_rate,
      auto_escalation_enabled: checked ? prev.auto_escalation_enabled : false,
    }))
  }

  const handleAutoEscalationToggle = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      auto_escalation_enabled: checked,
      auto_escalation_rate: checked && prev.auto_escalation_rate === 0 ? 0.01 : prev.auto_escalation_rate,
      auto_escalation_cap: checked && prev.auto_escalation_cap === 0 ? 0.10 : prev.auto_escalation_cap,
    }))
  }

  const handleCoreTierToggle = (checked: boolean) => {
    if (checked) {
      updateField('core_age_service_tiers', [
        { min_age: null, max_age: null, min_service: null, max_service: null, contribution_pct: 0.03 },
      ])
    } else {
      // Clear tier data and tier-related errors
      setForm((prev) => ({ ...prev, core_age_service_tiers: null }))
      setErrors((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          if (key.startsWith('core_tier_')) delete next[key]
        }
        return next
      })
    }
  }

  const summaryRows = calculateSummaryRows(form.match_tiers, form.core_contribution_pct)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employer Match */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Employer Match</h3>
        <p className="text-xs text-gray-500 mb-3">
          Match tiers are applied sequentially — each tier matches on the next band of employee deferrals.
        </p>

        <div className="space-y-3">
          {form.match_tiers.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              No match tiers configured. Add a tier to define the employer match formula.
            </p>
          )}
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
                {errors[`match_tier_${i}_rate`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`match_tier_${i}_rate`]}</p>
                )}
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
                {errors[`match_tier_${i}_pct`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`match_tier_${i}_pct`]}</p>
                )}
              </div>
              <button
                type="button"
                className="mt-5 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => removeMatchTier(i)}
                aria-label={`Remove match tier ${i + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {errors.match_tiers && (
            <p className="text-sm text-red-600">{errors.match_tiers}</p>
          )}
          {form.match_tiers.length < 3 ? (
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
              onClick={addMatchTier}
            >
              <Plus className="h-4 w-4" />
              Add Match Tier
            </button>
          ) : (
            <p className="text-xs text-gray-400">Maximum 3 tiers</p>
          )}
        </div>

        <div className="mt-4">
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
      </div>

      {/* Core Contribution */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Core Contribution</h3>

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

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.core_age_service_tiers !== null}
              onChange={(e) => handleCoreTierToggle(e.target.checked)}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            Use age/service tiers
          </label>
        </div>

        {form.core_age_service_tiers && (
          <div className="mt-3 space-y-2">
            {form.core_age_service_tiers.map((tier, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
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
                    aria-label={`Remove core tier ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {errors[`core_tier_${i}_dimension`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`core_tier_${i}_dimension`]}</p>
                )}
                {errors[`core_tier_${i}_age`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`core_tier_${i}_age`]}</p>
                )}
                {errors[`core_tier_${i}_service`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`core_tier_${i}_service`]}</p>
                )}
                {/* Overlap errors for this tier */}
                {Object.entries(errors)
                  .filter(([key]) => key.startsWith(`core_tier_overlap_${i}_`) || key.endsWith(`_${i}`))
                  .filter(([key]) => key.startsWith('core_tier_overlap_'))
                  .map(([key, msg]) => (
                    <p key={key} className="mt-1 text-xs text-red-600">{msg}</p>
                  ))}
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

        <div className="mt-4">
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
      </div>

      {/* Auto-Enrollment */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Auto-Enrollment</h3>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.auto_enroll_enabled}
            onChange={(e) => handleAutoEnrollToggle(e.target.checked)}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Auto-enroll enabled
        </label>

        {form.auto_enroll_enabled && (
          <div className="mt-3 space-y-3 pl-6">
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
                onChange={(e) => handleAutoEscalationToggle(e.target.checked)}
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
      </div>

      {/* Contribution Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Contribution Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-600">Employee Deferral</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Employer Match</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Core Contribution</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Total Employer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summaryRows.map((row) => (
                <tr key={row.deferralRate}>
                  <td className="px-4 py-2 text-gray-700">{Math.round(row.deferralRate * 100)}%</td>
                  <td className="px-4 py-2 text-right text-gray-700">{Math.round(row.matchContribution * 100)}%</td>
                  <td className="px-4 py-2 text-right text-gray-700">{Math.round(row.coreContribution * 100)}%</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{Math.round(row.totalEmployer * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Summary uses flat core contribution rate. Age/service-tiered rates may vary by participant.
        </p>
      </div>

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
