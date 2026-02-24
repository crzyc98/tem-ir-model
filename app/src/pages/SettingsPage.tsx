import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-brand-500" />
        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
      </div>
      <p className="mt-3 text-sm text-gray-500">
        Configure workspace preferences, manage base assumptions, and adjust
        system-wide defaults for your retirement modeling analysis.
      </p>
    </div>
  )
}
