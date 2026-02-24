import { FolderOpen } from 'lucide-react'

export default function ScenariosPage() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-6 w-6 text-brand-500" />
        <h2 className="text-lg font-semibold text-gray-800">Scenarios</h2>
      </div>
      <p className="mt-3 text-sm text-gray-500">
        Create and manage simulation scenarios. Configure assumptions, run Monte
        Carlo simulations, and review projected retirement outcomes.
      </p>
    </div>
  )
}
