import { useState, useCallback } from 'react'
import { analyzeFishPhoto, FishAnalysisResult } from '../services/gemini'

interface UseFishAnalysisReturn {
  analyze: (photoUrl: string, location?: { latitude: number; longitude: number }) => Promise<void>
  result: FishAnalysisResult | null
  loading: boolean
  error: string | null
  reset: () => void
}

export function useFishAnalysis(): UseFishAnalysisReturn {
  const [result, setResult] = useState<FishAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (
    photoUrl: string,
    location?: { latitude: number; longitude: number }
  ): Promise<void> => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const analysis = await analyzeFishPhoto(photoUrl, location)
      setResult(analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze photo')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setLoading(false)
  }, [])

  return { analyze, result, loading, error, reset }
}
