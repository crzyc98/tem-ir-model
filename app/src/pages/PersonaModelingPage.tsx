import { Users } from 'lucide-react'

export default function PersonaModelingPage() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-brand-500" />
        <h2 className="text-lg font-semibold text-gray-800">Persona Modeling</h2>
      </div>
      <p className="mt-3 text-sm text-gray-500">
        Define and manage employee personas for your retirement income analysis.
        Configure demographics, compensation, and career trajectories.
      </p>
    </div>
  )
}
