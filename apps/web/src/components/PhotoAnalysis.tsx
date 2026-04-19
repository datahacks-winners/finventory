import { useState } from 'react'
import { useFishAnalysis } from '../hooks/useFishAnalysis'

interface PhotoAnalysisProps {
  onAnalysisComplete?: (data: {
    species: string
    grade: 'sushi' | 'A' | 'B'
    estimatedWeight: { value: number; unit: 'lb' | 'kg' }
    description: string
    suggestedPrice: { min: number; max: number }
  }) => void
}

export default function PhotoAnalysis({ onAnalysisComplete }: PhotoAnalysisProps) {
  const { analyze, result, loading, error, reset } = useFishAnalysis()
  const [photoUrl, setPhotoUrl] = useState('')

  const handleAnalyze = async () => {
    if (!photoUrl) return
    await analyze(photoUrl)
  }

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

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-stone-900 mb-4">
        AI Photo Analysis
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">
            Photo URL (Cloud Storage)
          </label>
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://storage.googleapis.com/..."
            className="w-full bg-stone-50 border border-stone-200 rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !photoUrl}
          className="w-full py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-container transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⟳</span> Analyzing...
            </span>
          ) : (
            'Analyze Fish Photo'
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="border-t border-stone-200 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-50 p-3 rounded-lg">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Species</div>
                <div className="text-lg font-bold text-stone-900">{result.species}</div>
                <div className="text-xs text-stone-400">{(result.confidence * 100).toFixed(0)}% confidence</div>
              </div>

              <div className="bg-stone-50 p-3 rounded-lg">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Grade</div>
                <div className={`text-lg font-bold ${
                  result.grade === 'sushi' ? 'text-emerald-600' :
                  result.grade === 'A' ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {result.grade === 'sushi' ? 'Sushi Grade' : `Grade ${result.grade}`}
                </div>
                <div className="text-xs text-stone-500">{result.gradeReasoning}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-50 p-3 rounded-lg">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Est. Weight</div>
                <div className="text-lg font-bold text-stone-900">
                  {result.estimatedWeight.value} {result.estimatedWeight.unit}
                </div>
                <div className="text-xs text-stone-400">{(result.estimatedWeight.confidence * 100).toFixed(0)}% confidence</div>
              </div>

              <div className="bg-stone-50 p-3 rounded-lg">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Suggested Price</div>
                <div className="text-lg font-bold text-stone-900">
                  ${result.suggestedPrice.min}-${result.suggestedPrice.max}/{result.estimatedWeight.unit}
                </div>
                <div className="text-xs text-stone-500">{result.suggestedPrice.reasoning}</div>
              </div>
            </div>

            <div className="bg-stone-50 p-3 rounded-lg">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Freshness Assessment</div>
              <div className="flex gap-4 text-sm">
                <span className={`px-2 py-1 rounded ${
                  result.freshnessIndicators.overall === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                  result.freshnessIndicators.overall === 'good' ? 'bg-blue-100 text-blue-700' :
                  result.freshnessIndicators.overall === 'fair' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {result.freshnessIndicators.overall}
                </span>
                <span className="text-stone-500">Eyes: {result.freshnessIndicators.eyeClarity.replace('_', ' ')}</span>
                <span className="text-stone-500">Gills: {result.freshnessIndicators.gillColor.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="bg-stone-50 p-3 rounded-lg">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">AI Description</div>
              <p className="text-sm text-stone-700 italic">"{result.description}"</p>
              <div className="flex gap-2 mt-2">
                {result.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-stone-200 text-stone-600 px-2 py-1 rounded-full">
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
                onClick={reset}
                className="px-4 py-3 border border-stone-200 text-stone-600 rounded-lg font-bold text-sm hover:bg-stone-50 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
