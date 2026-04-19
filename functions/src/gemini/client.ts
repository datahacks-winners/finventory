import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

// Initialize Gemini client with API key from environment
const getGeminiClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not set')
  }
  return new GoogleGenerativeAI(apiKey)
}

// Lazy initialization
let _visionModel: GenerativeModel | null = null
let _textModel: GenerativeModel | null = null

export const getVisionModel = (): GenerativeModel => {
  if (!_visionModel) {
    _visionModel = getGeminiClient().getGenerativeModel({ model: 'gemini-2.0-flash' })
  }
  return _visionModel
}

export const getTextModel = (): GenerativeModel => {
  if (!_textModel) {
    _textModel = getGeminiClient().getGenerativeModel({ model: 'gemini-2.0-flash' })
  }
  return _textModel
}
