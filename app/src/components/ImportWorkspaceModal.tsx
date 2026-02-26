import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { importWorkspace, ImportConflictError } from '../services/api'
import type { ImportResult } from '../services/api'

interface ImportWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  onImported: (result: ImportResult) => void
}

type ModalState =
  | { stage: 'idle' }
  | { stage: 'uploading' }
  | { stage: 'conflict'; conflict: ImportConflictError }
  | { stage: 'renaming'; conflict: ImportConflictError; nameError: string | null }
  | { stage: 'confirming_replace'; conflict: ImportConflictError }
  | { stage: 'error'; message: string }

export default function ImportWorkspaceModal({
  isOpen,
  onClose,
  onImported,
}: ImportWorkspaceModalProps) {
  const [state, setState] = useState<ModalState>({ stage: 'idle' })
  const [newName, setNewName] = useState('')
  // Keep the File reference so we can re-submit on conflict resolution
  const fileRef = useRef<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const reset = () => {
    setState({ stage: 'idle' })
    setNewName('')
    fileRef.current = null
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // ── Initial upload ────────────────────────────────────────────────────────

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current
    if (!file) return

    setState({ stage: 'uploading' })
    try {
      const result = await importWorkspace(file)
      reset()
      onImported(result)
      onClose()
    } catch (err) {
      if (err instanceof ImportConflictError) {
        setState({ stage: 'conflict', conflict: err })
      } else {
        setState({ stage: 'error', message: (err as Error).message })
      }
    }
  }

  // ── Conflict resolution: rename ───────────────────────────────────────────

  const handleRename = async () => {
    if (state.stage !== 'renaming') return
    const file = fileRef.current
    if (!file) return
    if (!newName.trim()) {
      setState({ ...state, nameError: 'Please enter a new workspace name.' })
      return
    }

    setState({ stage: 'uploading' })
    try {
      const result = await importWorkspace(file, { onConflict: 'rename', newName: newName.trim() })
      reset()
      onImported(result)
      onClose()
    } catch (err) {
      if (err instanceof ImportConflictError) {
        // New name also conflicts — loop back to renaming
        setState({
          stage: 'renaming',
          conflict: err,
          nameError: `'${newName.trim()}' already exists. Please choose a different name.`,
        })
      } else {
        setState({ stage: 'error', message: (err as Error).message })
      }
    }
  }

  // ── Conflict resolution: replace ─────────────────────────────────────────

  const handleReplace = async () => {
    if (state.stage !== 'confirming_replace') return
    const file = fileRef.current
    if (!file) return

    setState({ stage: 'uploading' })
    try {
      const result = await importWorkspace(file, { onConflict: 'replace' })
      reset()
      onImported(result)
      onClose()
    } catch (err) {
      setState({ stage: 'error', message: (err as Error).message })
    }
  }

  const isLoading = state.stage === 'uploading'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Idle / File selection ── */}
        {(state.stage === 'idle' || state.stage === 'uploading') && (
          <>
            <h3 className="text-lg font-semibold text-gray-800">Import Workspace</h3>
            <p className="mt-1 text-sm text-gray-500">
              Select a workspace archive (.zip) to import. A new workspace will be created with all
              scenarios restored.
            </p>

            <form onSubmit={handleFileSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="import-file"
                  className="block text-sm font-medium text-gray-700"
                >
                  Archive file
                </label>
                <input
                  id="import-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                  onChange={(e) => {
                    fileRef.current = e.target.files?.[0] ?? null
                  }}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Import
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Conflict: choose action ── */}
        {state.stage === 'conflict' && (
          <>
            <h3 className="text-lg font-semibold text-gray-800">Name Conflict</h3>
            <p className="mt-2 text-sm text-gray-600">
              A workspace named{' '}
              <span className="font-medium">"{state.conflict.archive_workspace_name}"</span> already
              exists. How would you like to proceed?
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left text-sm hover:bg-gray-50"
                onClick={() =>
                  setState({ stage: 'renaming', conflict: state.conflict, nameError: null })
                }
              >
                <span className="font-medium text-gray-800">Rename</span>
                <p className="mt-0.5 text-gray-500">Import under a different name</p>
              </button>

              <button
                type="button"
                className="w-full rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-left text-sm hover:bg-orange-100"
                onClick={() => setState({ stage: 'confirming_replace', conflict: state.conflict })}
              >
                <span className="font-medium text-orange-800">Replace</span>
                <p className="mt-0.5 text-orange-700">
                  Overwrite the existing workspace — this cannot be undone
                </p>
              </button>

              <button
                type="button"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:bg-gray-50"
                onClick={handleClose}
              >
                <span className="font-medium text-gray-800">Skip</span>
                <p className="mt-0.5 text-gray-500">Cancel the import</p>
              </button>
            </div>
          </>
        )}

        {/* ── Conflict: rename input ── */}
        {state.stage === 'renaming' && (
          <>
            <h3 className="text-lg font-semibold text-gray-800">Rename Workspace</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter a new name for the imported workspace.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="new-name" className="block text-sm font-medium text-gray-700">
                  New workspace name
                </label>
                <input
                  id="new-name"
                  type="text"
                  autoFocus
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    state.nameError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    if (state.nameError) setState({ ...state, nameError: null })
                  }}
                  placeholder={`${state.conflict.archive_workspace_name} (copy)`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                  }}
                />
                {state.nameError && (
                  <p className="mt-1 text-sm text-red-600">{state.nameError}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setState({ stage: 'conflict', conflict: state.conflict })}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                  onClick={handleRename}
                >
                  Import as "{newName || '…'}"
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Conflict: confirm replace ── */}
        {state.stage === 'confirming_replace' && (
          <>
            <h3 className="text-lg font-semibold text-gray-800">Replace Workspace?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently overwrite{' '}
              <span className="font-medium">
                "{state.conflict.archive_workspace_name}"
              </span>{' '}
              and all its scenarios. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setState({ stage: 'conflict', conflict: state.conflict })}
              >
                Back
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                onClick={handleReplace}
              >
                Replace Workspace
              </button>
            </div>
          </>
        )}

        {/* ── Error ── */}
        {state.stage === 'error' && (
          <>
            <h3 className="text-lg font-semibold text-gray-800">Import Failed</h3>
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {state.message}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={handleClose}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                onClick={() => setState({ stage: 'idle' })}
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
