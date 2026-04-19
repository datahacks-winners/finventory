import { httpsCallable, getFunctions } from 'firebase/functions'

const functions = getFunctions()

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

export async function analyzeFishPhoto(
  photoUrl: string,
  location?: { latitude: number; longitude: number }
): Promise<FishAnalysisResult> {
  const analyzeCallable = httpsCallable<
    FishAnalysisRequest,
    FishAnalysisResult
  >(functions, 'analyzeFishPhoto')

  const result = await analyzeCallable({ photoUrl, location })
  return result.data
}
