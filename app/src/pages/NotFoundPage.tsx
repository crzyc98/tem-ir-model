import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-lg font-semibold text-gray-800">
          Page Not Found
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
