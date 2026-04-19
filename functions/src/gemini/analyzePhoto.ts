import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getVisionModel } from './client.js'
import * as admin from 'firebase-admin'

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

interface AnalyzePhotoRequest {
  photoUrl: string
  location?: {
    latitude: number
    longitude: number
  }
}

const FISH_ANALYSIS_PROMPT = `Analyze this seafood photo and provide a detailed assessment for a marketplace listing.

Return ONLY a JSON object with this exact structure:
{
  "species": "common name (e.g., 'Pacific Salmon', 'Atlantic Cod')",
  "confidence": 0.0-1.0,
  "grade": "sushi" | "A" | "B",
  "gradeReasoning": "brief explanation for grade assignment",
  "estimatedWeight": {
    "value": number,
    "unit": "lb" | "kg",
    "confidence": 0.0-1.0
  },
  "freshnessIndicators": {
    "eyeClarity": "clear" | "cloudy" | "sunken",
    "gillColor": "bright_red" | "pale" | "brown",
    "skinTexture": "firm_shiny" | "dull" | "slimy",
    "overall": "excellent" | "good" | "fair" | "poor"
  },
  "suggestedPrice": {
    "min": number,
    "max": number,
    "currency": "USD",
    "reasoning": "brief market context"
  },
  "description": "compelling 2-3 sentence product description emphasizing freshness and quality",
  "tags": ["relevant", "search", "tags"]
}

Grading criteria:
- sushi: Highest quality, suitable for raw consumption, firm flesh, clear eyes, bright gills
- A: Premium quality, excellent freshness, minor cosmetic imperfections ok
- B: Good quality, standard commercial grade, may have slight blemishes

Be conservative with grades. Only assign "sushi" if clearly premium quality.`

export const analyzeFishPhoto = onCall(
  {
    cors: ['http://localhost:5173', 'http://localhost:3000', 'https://finventory.web.app', 'https://finventory.com', 'https://web-eodwatsp5q-uc.a.run.app'],
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (request): Promise<FishAnalysisResult> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const data = request.data as AnalyzePhotoRequest

    if (!data.photoUrl) {
      throw new HttpsError('invalid-argument', 'photoUrl is required')
    }

    try {
      // Fetch image from Cloud Storage
      const response = await fetch(data.photoUrl)
      if (!response.ok) {
        throw new HttpsError('not-found', 'Could not fetch image from URL')
      }

      const imageBuffer = await response.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')

      // Determine MIME type from URL or default to JPEG
      const mimeType = data.photoUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

      // Analyze with Gemini Vision
      const visionModel = getVisionModel()
      const result = await visionModel.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: FISH_ANALYSIS_PROMPT },
            {
              inlineData: {
                mimeType,
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      })

      const responseText = result.response.text()

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
                         responseText.match(/```\n?([\s\S]*?)\n?```/) ||
                         responseText.match(/(\{[\s\S]*\})/)

      const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim()
      const analysis = JSON.parse(jsonString) as FishAnalysisResult

      // Validate required fields
      if (!analysis.species || !analysis.grade || !analysis.estimatedWeight) {
        throw new HttpsError('internal', 'Incomplete analysis from AI')
      }

      // Store analysis in Firestore for analytics/improvement
      const db = admin.firestore()
      await db.collection('ai_analyses').add({
        userId: request.auth.uid,
        photoUrl: data.photoUrl,
        analysis,
        location: data.location || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return analysis

    } catch (error) {
      console.error('Error analyzing photo:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      if (error instanceof SyntaxError) {
        throw new HttpsError('internal', 'Failed to parse AI response')
      }

      throw new HttpsError('internal', 'Failed to analyze photo')
    }
  }
)
