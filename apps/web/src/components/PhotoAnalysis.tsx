import { useEffect } from 'react'
import { useFishAnalysis } from '../hooks/useFishAnalysis'

export interface PhotoAnalysisProps {
  photoUrl: string
  onAnalysisComplete?: (data: {
    species: string
    grade: 'sushi' | 'A' | 'B'
    estimatedWeight: { value: number; unit: 'lb' | 'kg' }
    description: string
    suggestedPrice: { min: number; max: number }
  }) => void
  onCancel?: () => void
}

export default function PhotoAnalysis({ photoUrl, onAnalysisComplete, onCancel }: PhotoAnalysisProps) {
  const { analyze, result, loading, error, reset } = useFishAnalysis()

  // Auto-analyze when photoUrl is provided
  useEffect(() => {
    if (photoUrl && !result && !loading && !error) {
      analyze(photoUrl)
    }
  }, [photoUrl])

  const handleAccept = () => {
    if (result && onAnalysisComplete) {
      onAnalysisComplete({
        species: result.species,
        grade: result.grade,
        estimatedWeight: result.estimatedWeight,
        description: result.description,
        suggestedPrice: result.suggestedPrice
      })
    }
  }

  const handleRetry = () => {
    reset()
    analyze(photoUrl)
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">auto_awesome</span>
        <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">
          AI Photo Analysis
        </h3>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
          <p className="text-sm text-outline font-medium">Analyzing your catch...</p>
          <p className="text-xs text-outline-variant mt-1">Gemini AI is identifying species, grade, and freshness</p>
        </div>
      )}

      {error && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-container transition-all"
            >
              Retry Analysis
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-3 border border-outline-variant text-outline rounded-lg font-bold text-sm hover:bg-surface-container-low transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-3 rounded-lg">
              <div className="text-[10px] font-bold text-outline uppercase tracking-widest">Species</div>
              <div className="text-lg font-bold text-on-surface">{result.species}</div>
              <div className="text-xs text-outline-variant">{(result.confidence * 100).toFixed(0)}% confidence</div>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg">
              <div className="text-[10px] font-bold text-outline uppercase tracking-widest">Grade</div>
              <div className={`text-lg font-bold ${
                result.grade === 'sushi' ? 'text-emerald-600' :
                result.grade === 'A' ? 'text-blue-600' : 'text-amber-600'
              }`}>
                {result.grade === 'sushi' ? 'Sushi Grade' : `Grade ${result.grade}`}
              </div>
              <div className="text-xs text-outline">{result.gradeReasoning}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-3 rounded-lg">
              <div className="text-[10px] font-bold text-outline uppercase tracking-widest">Est. Weight</div>
              <div className="text-lg font-bold text-on-surface">
                {result.estimatedWeight.value} {result.estimatedWeight.unit}
              </div>
              <div className="text-xs text-outline-variant">{(result.estimatedWeight.confidence * 100).toFixed(0)}% confidence</div>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg">
              <div className="text-[10px] font-bold text-outline uppercase tracking-widest">Suggested Price</div>
              <div className="text-lg font-bold text-on-surface">
                ${result.suggestedPrice.min}-${result.suggestedPrice.max}/{result.estimatedWeight.unit}
              </div>
              <div className="text-xs text-outline">{result.suggestedPrice.reasoning}</div>
            </div>
          </div>

          <div className="bg-surface-container-low p-3 rounded-lg">
            <div className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Freshness Assessment</div>
            <div className="flex gap-4 text-sm flex-wrap">
              <span className={`px-2 py-1 rounded ${
                result.freshnessIndicators.overall === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                result.freshnessIndicators.overall === 'good' ? 'bg-blue-100 text-blue-700' :
                result.freshnessIndicators.overall === 'fair' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {result.freshnessIndicators.overall}
              </span>
              <span className="text-outline">Eyes: {result.freshnessIndicators.eyeClarity.replace('_', ' ')}</span>
              <span className="text-outline">Gills: {result.freshnessIndicators.gillColor.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="bg-surface-container-low p-3 rounded-lg">
            <div className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">AI Description</div>
            <p className="text-sm text-on-surface italic">"{result.description}"</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {result.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-surface-container-highest text-outline px-2 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-container transition-all"
            >
              Use This Data
            </button>
            <button
              onClick={handleRetry}
              className="px-4 py-3 border border-outline-variant text-outline rounded-lg font-bold text-sm hover:bg-surface-container-low transition-all"
            >
              Retry
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-3 border border-outline-variant text-outline rounded-lg font-bold text-sm hover:bg-surface-container-low transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
