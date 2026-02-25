import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Users, Plus, RotateCcw, AlertTriangle } from 'lucide-react'
import type { LayoutContext } from '../types/workspace'
import type { Persona } from '../types/persona'
import { getWorkspace, updateWorkspacePersonas, resetWorkspacePersonas } from '../services/api'
import PersonaGallery from '../components/PersonaGallery'
import ConfirmDialog from '../components/ConfirmDialog'

const MAX_PERSONAS = 12

function newDefaultPersona(): Persona {
  return {
    id: crypto.randomUUID(),
    name: 'New Persona',
    label: 'Custom',
    age: 30,
    tenure_years: 0,
    salary: 50000,
    deferral_rate: 0.06,
    current_balance: 0,
    allocation: { type: 'target_date', target_date_vintage: 2060 },
    include_social_security: true,
    ss_claiming_age: 67,
    hidden: false,
  }
}

export default function PersonaModelingPage() {
  const { activeWorkspace } = useOutletContext<LayoutContext>()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const loadPersonas = useCallback(async () => {
    if (!activeWorkspace) return
    setLoading(true)
    try {
      const workspace = await getWorkspace(activeWorkspace.id)
      setPersonas(workspace.personas)
    } catch (err) {
      console.error('Failed to load personas:', err)
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    loadPersonas()
  }, [loadPersonas])

  const savePersonas = async (updated: Persona[]) => {
    if (!activeWorkspace) return
    setSaving(true)
    try {
      const workspace = await updateWorkspacePersonas(activeWorkspace.id, updated)
      setPersonas(workspace.personas)
    } catch (err) {
      console.error('Failed to save personas:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (personaId: string) => {
    setEditingPersonaId(personaId)
  }

  const handleSave = async (persona: Persona) => {
    const updated = personas.map((p) => (p.id === persona.id ? persona : p))
    await savePersonas(updated)
    setEditingPersonaId(null)
  }

  const handleCancel = () => {
    setEditingPersonaId(null)
  }

  const handleAdd = async () => {
    if (personas.length >= MAX_PERSONAS) return
    const newPersona = newDefaultPersona()
    const updated = [...personas, newPersona]
    await savePersonas(updated)
    setEditingPersonaId(newPersona.id)
  }

  const handleToggleHidden = async (personaId: string) => {
    const updated = personas.map((p) =>
      p.id === personaId ? { ...p, hidden: !p.hidden } : p
    )
    await savePersonas(updated)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    // Prevent deleting the last persona
    if (personas.length <= 1) {
      setDeleteTarget(null)
      return
    }
    const updated = personas.filter((p) => p.id !== deleteTarget)
    await savePersonas(updated)
    if (editingPersonaId === deleteTarget) {
      setEditingPersonaId(null)
    }
    setDeleteTarget(null)
  }

  const handleReset = async () => {
    if (!activeWorkspace) return
    setSaving(true)
    try {
      const workspace = await resetWorkspacePersonas(activeWorkspace.id)
      setPersonas(workspace.personas)
      setEditingPersonaId(null)
    } catch (err) {
      console.error('Failed to reset personas:', err)
    } finally {
      setSaving(false)
      setShowResetConfirm(false)
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-sm text-gray-500">Select a workspace to manage personas.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          Loading personas...
        </div>
      </div>
    )
  }

  const activeCount = personas.filter((p) => !p.hidden).length
  const allHidden = personas.length > 0 && activeCount === 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-brand-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Persona Modeling</h2>
              <p className="text-sm text-gray-500">
                {personas.length} of {MAX_PERSONAS} personas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={personas.length >= MAX_PERSONAS || saving}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              title={personas.length >= MAX_PERSONAS ? `Maximum ${MAX_PERSONAS} personas` : undefined}
            >
              <Plus className="h-4 w-4" />
              Add Persona
            </button>
          </div>
        </div>
      </div>

      {/* Warning banner: all hidden */}
      {allHidden && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">
            No active personas — simulations require at least one active persona.
          </p>
        </div>
      )}

      {/* Empty state */}
      {personas.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No personas configured.</p>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="mt-2 text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Reset to Defaults
          </button>
        </div>
      ) : (
        <PersonaGallery
          personas={personas}
          editingPersonaId={editingPersonaId}
          onEdit={handleEdit}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={(id) => setDeleteTarget(id)}
          onToggleHidden={handleToggleHidden}
          saving={saving}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Persona"
        message={
          personas.length <= 1
            ? 'Cannot delete the last persona. Simulations require at least one persona.'
            : 'Are you sure you want to delete this persona? This cannot be undone.'
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isLoading={saving}
      />

      {/* Reset confirmation */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset to Defaults"
        message="Reset all personas to workspace defaults? Custom personas will be removed."
        confirmLabel="Reset"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
        isLoading={saving}
      />
    </div>
  )
}
