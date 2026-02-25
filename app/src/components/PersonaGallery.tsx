import type { Persona } from '../types/persona'
import PersonaCard from './PersonaCard'

interface PersonaGalleryProps {
  personas: Persona[]
  editingPersonaId: string | null
  onEdit: (personaId: string) => void
  onSave: (persona: Persona) => void
  onCancel: () => void
  onDelete: (personaId: string) => void
  onToggleHidden: (personaId: string) => void
  saving: boolean
}

export default function PersonaGallery({
  personas,
  editingPersonaId,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleHidden,
  saving,
}: PersonaGalleryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {personas.map((persona) => (
        <PersonaCard
          key={persona.id}
          persona={persona}
          isEditing={editingPersonaId === persona.id}
          onEdit={() => onEdit(persona.id)}
          onSave={onSave}
          onCancel={onCancel}
          onDelete={() => onDelete(persona.id)}
          onToggleHidden={() => onToggleHidden(persona.id)}
          saving={saving}
        />
      ))}
    </div>
  )
}
