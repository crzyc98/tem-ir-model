import type { ConfidenceLevel } from '../types/simulation'

interface ConfidenceLevelToggleProps {
  value: ConfidenceLevel
  onChange: (level: ConfidenceLevel) => void
}

const LEVELS: { value: ConfidenceLevel; label: string }[] = [
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '90', label: '90%' },
]

export default function ConfidenceLevelToggle({ value, onChange }: ConfidenceLevelToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300">
      {LEVELS.map(({ value: level, label }, idx) => {
        const isSelected = level === value
        const isFirst = idx === 0
        const isLast = idx === LEVELS.length - 1
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              isFirst ? 'rounded-l-lg' : ''
            } ${isLast ? 'rounded-r-lg' : ''} ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } ${!isFirst ? 'border-l border-gray-300' : ''}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
