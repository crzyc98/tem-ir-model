import { useState } from 'react'
import { MoreVertical, Shield, ShieldOff, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import type { Persona, AssetAllocation } from '../types/persona'
import AllocationEditor from './AllocationEditor'

interface PersonaCardProps {
  persona: Persona
  isEditing: boolean
  onEdit: () => void
  onSave: (persona: Persona) => void
  onCancel: () => void
  onDelete: () => void
  onToggleHidden: () => void
  saving: boolean
}

interface ValidationErrors {
  name?: string
  label?: string
  age?: string
  salary?: string
  deferral_rate?: string
  current_balance?: string
  allocation?: string
}

function formatCurrency(value: number): string {
  return '$' + Math.round(value).toLocaleString('en-US')
}

function formatPercent(value: number): string {
  return Math.round(value * 100) + '%'
}

function allocationSummary(allocation: AssetAllocation): string {
  if (allocation.type === 'target_date') {
    return `TDF ${allocation.target_date_vintage}`
  }
  return `${Math.round(allocation.stock_pct * 100)} / ${Math.round(allocation.bond_pct * 100)} / ${Math.round(allocation.cash_pct * 100)}`
}

export default function PersonaCard({
  persona,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleHidden,
  saving,
}: PersonaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [form, setForm] = useState<Persona>({ ...persona })
  const [errors, setErrors] = useState<ValidationErrors>({})

  const validate = (p: Persona): ValidationErrors => {
    const errs: ValidationErrors = {}
    if (!p.name.trim()) errs.name = 'Name is required'
    if (!p.label.trim()) errs.label = 'Label is required'
    if (p.age < 18 || p.age > 80) errs.age = 'Age must be 18–80'
    if (p.salary < 0) errs.salary = 'Salary must be >= 0'
    if (p.deferral_rate < 0 || p.deferral_rate > 1) errs.deferral_rate = 'Must be 0–100%'
    if (p.current_balance < 0) errs.current_balance = 'Balance must be >= 0'
    if (p.allocation.type === 'custom') {
      const sum = p.allocation.stock_pct + p.allocation.bond_pct + p.allocation.cash_pct
      if (Math.abs(sum - 1.0) > 0.01) errs.allocation = 'Allocation must sum to 100%'
    }
    return errs
  }

  const updateField = <K extends keyof Persona>(field: K, value: Persona[K]) => {
    const updated = { ...form, [field]: value }
    setForm(updated)
    setErrors(validate(updated))
  }

  const hasErrors = Object.keys(errors).length > 0

  const handleSave = () => {
    const validationErrors = validate(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    onSave(form)
  }

  // Reset form state when entering edit mode
  if (isEditing && form.id !== persona.id) {
    setForm({ ...persona })
    setErrors({})
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-brand-300 bg-white p-5 shadow-md">
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={`mt-1 block w-full rounded-lg border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-gray-600">Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => updateField('label', e.target.value)}
              className={`mt-1 block w-full rounded-lg border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors.label ? 'border-red-300' : 'border-gray-300'}`}
            />
            {errors.label && <p className="mt-1 text-xs text-red-600">{errors.label}</p>}
          </div>

          {/* Age + Salary row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Age</label>
              <input
                type="number"
                min={18}
                max={80}
                value={form.age}
                onChange={(e) => updateField('age', parseInt(e.target.value) || 0)}
                className={`mt-1 block w-full rounded-lg border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors.age ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.age && <p className="mt-1 text-xs text-red-600">{errors.age}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Salary</label>
              <input
                type="number"
                min={0}
                value={form.salary}
                onChange={(e) => updateField('salary', parseFloat(e.target.value) || 0)}
                className={`mt-1 block w-full rounded-lg border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors.salary ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.salary && <p className="mt-1 text-xs text-red-600">{errors.salary}</p>}
            </div>
          </div>

          {/* Deferral Rate + Balance row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Deferral Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={Math.round(form.deferral_rate * 100)}
                onChange={(e) => updateField('deferral_rate', (parseFloat(e.target.value) || 0) / 100)}
                className={`mt-1 block w-full rounded-lg border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors.deferral_rate ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.deferral_rate && <p className="mt-1 text-xs text-red-600">{errors.deferral_rate}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Current Balance</label>
              <input
                type="number"
                min={0}
                value={form.current_balance}
                onChange={(e) => updateField('current_balance', parseFloat(e.target.value) || 0)}
                className={`mt-1 block w-full rounded-lg border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors.current_balance ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.current_balance && <p className="mt-1 text-xs text-red-600">{errors.current_balance}</p>}
            </div>
          </div>

          {/* Allocation Editor */}
          <AllocationEditor
            allocation={form.allocation}
            onChange={(allocation) => updateField('allocation', allocation)}
            errors={errors.allocation ? [errors.allocation] : []}
          />

          {/* Social Security Toggle */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-sm font-medium text-gray-700">Social Security</span>
            <button
              type="button"
              onClick={() => updateField('include_social_security', !form.include_social_security)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.include_social_security ? 'bg-brand-500' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.include_social_security ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={hasErrors || saving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving
                </span>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Display mode
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-opacity ${persona.hidden ? 'border-gray-200 opacity-50' : 'border-gray-100'}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">{persona.name}</h3>
          <p className="truncate text-xs text-gray-500">{persona.label}</p>
        </div>
        <div className="relative flex items-center gap-1">
          {persona.hidden && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              Hidden
            </span>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onEdit() }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onToggleHidden() }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {persona.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {persona.hidden ? 'Unhide' : 'Hide'}
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onDelete() }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-gray-500">Age:</span>{' '}
          <span className="font-medium text-gray-800">{persona.age}</span>
        </div>
        <div>
          <span className="text-gray-500">Salary:</span>{' '}
          <span className="font-medium text-gray-800">{formatCurrency(persona.salary)}</span>
        </div>
        <div>
          <span className="text-gray-500">Deferral:</span>{' '}
          <span className="font-medium text-gray-800">{formatPercent(persona.deferral_rate)}</span>
        </div>
        <div>
          <span className="text-gray-500">Balance:</span>{' '}
          <span className="font-medium text-gray-800">{formatCurrency(persona.current_balance)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2">
        <span className="text-xs font-medium text-gray-600">{allocationSummary(persona.allocation)}</span>
        <span className="flex items-center gap-1 text-xs">
          {persona.include_social_security ? (
            <Shield className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <ShieldOff className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className={persona.include_social_security ? 'text-green-600' : 'text-gray-400'}>
            SS
          </span>
        </span>
      </div>
    </div>
  )
}
