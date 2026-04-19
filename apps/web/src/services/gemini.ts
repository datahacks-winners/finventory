import { getAuth } from 'firebase/auth'

export interface FishAnalysisRequest {
  photoUrl: string
  location?: {
    latitude: number
    longitude: number
  }
}

export interface FishAnalysisResult {
  species: string
  confidence: number
  grade: 'sushi' | 'A' | 'B'
  gradeReasoning: string
  estimatedWeight: {
    value: number
    unit: 'lb' | 'kg'
    confidence: number
  }
  freshnessIndicators: {
    eyeClarity: 'clear' | 'cloudy' | 'sunken'
    gillColor: 'bright_red' | 'pale' | 'brown'
    skinTexture: 'firm_shiny' | 'dull' | 'slimy'
    overall: 'excellent' | 'good' | 'fair' | 'poor'
  }
  suggestedPrice: {
    min: number
    max: number
    currency: 'USD'
    reasoning: string
  }
  description: string
  tags: string[]
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api-eodwatsp5q-uc.a.run.app'

export async function analyzeFishPhoto(
  photoUrl: string,
  location?: { latitude: number; longitude: number }
): Promise<FishAnalysisResult> {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('Must be authenticated to analyze fish photo')
  }

  const token = await user.getIdToken()

  const response = await fetch(`${API_URL}/api/analyze-fish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ photoUrl, location }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to analyze fish photo')
  }

  return response.json()
}
