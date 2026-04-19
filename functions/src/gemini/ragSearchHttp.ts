import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'

interface RagSearchRequest {
  query: string
  limit?: number
}

interface _RagSearchResult {
  answer: string
  listings: Array<{
    itemId: string
    itemType: string
    content: string
    url: string
    similarity: number
    metadata?: Record<string, unknown>
  }>
}

// Mock inventory data - in production this would come from pgvector
const MOCK_INVENTORY = [
  {
    itemId: 'listing_001',
    itemType: 'listing',
    content: 'Pacific Bluefin Tuna - A grade, 500 lb available from Pacific Seafood Co in Seattle, WA at $12.50/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_001',
    similarity: 0.95,
    metadata: { species: 'Bluefin Tuna', grade: 'A', quantity: '500 lb', location: 'Seattle, WA', seller: 'Pacific Seafood Co', price: 12.50 }
  },
  {
    itemId: 'listing_002',
    itemType: 'listing',
    content: 'Yellowfin Tuna - sushi grade, 300 lb from Ocean Fresh in Portland, OR at $18/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_002',
    similarity: 0.88,
    metadata: { species: 'Yellowfin Tuna', grade: 'sushi', quantity: '300 lb', location: 'Portland, OR', seller: 'Ocean Fresh', price: 18.00 }
  },
  {
    itemId: 'listing_003',
    itemType: 'listing',
    content: 'Albacore Tuna - B grade, 200 lb bulk lot from Fisherman Joe in San Diego, CA at $8/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_003',
    similarity: 0.82,
    metadata: { species: 'Albacore Tuna', grade: 'B', quantity: '200 lb', location: 'San Diego, CA', seller: 'Fisherman Joe', price: 8.00 }
  },
  {
    itemId: 'listing_004',
    itemType: 'listing',
    content: 'Bigeye Tuna - A grade, 450 lb fresh catch from Deep Sea Fisheries in Los Angeles, CA at $15/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_004',
    similarity: 0.79,
    metadata: { species: 'Bigeye Tuna', grade: 'A', quantity: '450 lb', location: 'Los Angeles, CA', seller: 'Deep Sea Fisheries', price: 15.00 }
  },
  {
    itemId: 'listing_005',
    itemType: 'listing',
    content: 'Skipjack Tuna - commercial grade, 1000 lb pallet from Global Seafood Trading in Miami, FL at $6/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_005',
    similarity: 0.75,
    metadata: { species: 'Skipjack Tuna', grade: 'commercial', quantity: '1000 lb', location: 'Miami, FL', seller: 'Global Seafood Trading', price: 6.00 }
  },
  {
    itemId: 'listing_006',
    itemType: 'listing',
    content: 'Salmon - King/Chinook, A grade, 350 lb from Alaska Wild Catch in Juneau, AK at $22/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_006',
    similarity: 0.71,
    metadata: { species: 'King Salmon', grade: 'A', quantity: '350 lb', location: 'Juneau, AK', seller: 'Alaska Wild Catch', price: 22.00 }
  },
  {
    itemId: 'listing_007',
    itemType: 'listing',
    content: 'Halibut - Pacific, B grade, 180 lb from North Coast Fisheries in Anchorage, AK at $14/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_007',
    similarity: 0.68,
    metadata: { species: 'Pacific Halibut', grade: 'B', quantity: '180 lb', location: 'Anchorage, AK', seller: 'North Coast Fisheries', price: 14.00 }
  },
  {
    itemId: 'listing_008',
    itemType: 'listing',
    content: 'Cod - Atlantic, A grade, 600 lb from Boston Fish Market in Boston, MA at $9/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_008',
    similarity: 0.65,
    metadata: { species: 'Atlantic Cod', grade: 'A', quantity: '600 lb', location: 'Boston, MA', seller: 'Boston Fish Market', price: 9.00 }
  }
]

// Simple keyword matching
function findListings(query: string, limit: number) {
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2)

  const scored = MOCK_INVENTORY.map(item => {
    const content = item.content.toLowerCase()
    let score = 0
    let matches = 0

    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        matches++
        // Higher score for species names
        if (['tuna', 'salmon', 'cod', 'halibut'].includes(keyword)) score += 3
        else if (['grade', 'lb', 'pounds'].includes(keyword)) score += 2
        else score += 1
      }
    }

    // Bonus for quantity matches
    const quantityMatch = query.match(/(\d+)\s*(lb|pounds?|kg)/i)
    if (quantityMatch && item.content.includes(quantityMatch[1])) {
      score += 2
    }

    return { ...item, similarity: Math.min(0.95, 0.5 + (matches * 0.15) + (score * 0.05)) }
  }).filter(item => item.similarity > 0.5)

  // Sort by similarity and return top results
  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
}

// Call Gemma 4 31B via AI Studio OpenAI-compatible endpoint
async function generateAIResponse(query: string, listings: typeof MOCK_INVENTORY): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey || listings.length === 0) {
    // Fallback to template response
    if (listings.length === 0) {
      return `I couldn't find any listings matching "${query}". Try searching for different fish species like "tuna", "salmon", or "cod", or adjust your quantity requirements.`
    }
    const totalAvailable = listings.reduce((sum, l) => {
      const qty = l.metadata?.quantity?.match(/(\d+)/)?.[1]
      return sum + (qty ? parseInt(qty) : 0)
    }, 0)
    let answer = `Found **${listings.length} listing${listings.length > 1 ? 's' : ''}** for "${query}" with ~${totalAvailable} lb total available:\n\n`
    answer += listings.map(l => {
      const meta = l.metadata as Record<string, unknown>
      return `- **[${meta.species || 'Fish'} - ${meta.grade || 'Unknown'} grade](${l.url})**\n  ${meta.quantity || ''} from ${meta.seller || 'Unknown'} in ${meta.location || 'Unknown'}${meta.price ? ` at **$${meta.price}/lb**` : ''}`
    }).join('\n\n')
    return answer
  }

  // Build context from listings
  const context = listings.map(l =>
    `- ${l.content} (Link: ${l.url})`
  ).join('\n')

  try {
    // Use AI Studio OpenAI-compatible endpoint with Gemma 4 31B
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemma-3-12b-it',
        messages: [
          {
            role: 'user',
            content: `You are a helpful fish market assistant. Help buyers find what they need from the available inventory. Always cite specific listings using markdown links like [item description](url). Be concise but friendly.

Available inventory:
${context}

Buyer asks: ${query}

Respond helpfully, citing relevant listings with [description](url) links. If nothing matches, say so clearly.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemma API error:', err)
      throw new Error(`Gemma API error: ${response.status}`)
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: { content?: string }
      }>
    }

    return data.choices?.[0]?.message?.content || 'No response from AI'
  } catch (error) {
    console.error('AI generation failed:', error)
    // Fallback response
    const totalAvailable = listings.reduce((sum, l) => {
      const qty = l.metadata?.quantity?.match(/(\d+)/)?.[1]
      return sum + (qty ? parseInt(qty) : 0)
    }, 0)
    let answer = `Found **${listings.length} listing${listings.length > 1 ? 's' : ''}** for "${query}" with ~${totalAvailable} lb total available:\n\n`
    answer += listings.map(l => {
      const meta = l.metadata as Record<string, unknown>
      return `- **[${meta.species || 'Fish'} - ${meta.grade || 'Unknown'} grade](${l.url})**\n  ${meta.quantity || ''} from ${meta.seller || 'Unknown'} in ${meta.location || 'Unknown'}${meta.price ? ` at **$${meta.price}/lb**` : ''}`
    }).join('\n\n')
    return answer
  }
}

// HTTP endpoint version - no auth required, CORS enabled
export const ragSearchHttp = onRequest(
  {
    cors: true,
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: ['GEMINI_API_KEY']
  },
  async (req, res): Promise<void> => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const { query, limit = 5 } = req.body as RagSearchRequest

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Query is required' })
      return
    }

    try {
      // Search using keyword matching
      const listings = findListings(query, limit)

      // Generate AI-powered natural language response
      const answer = await generateAIResponse(query, listings)

      res.json({
        answer,
        listings: listings.map(({ similarity, ...rest }) => ({ ...rest, similarity }))
      })

    } catch (error) {
      console.error('RAG search error:', error)
      res.status(500).json({ error: 'Search failed' })
    }
  }
)

// Index a listing - stores in Firestore for now (pgvector needs proper Cloud SQL setup)
export const indexListing = async (
  listingId: string,
  data: {
    species: string
    grade: string
    quantity: number
    unit: string
    location: string
    sellerName: string
    price?: number
    url: string
  }
): Promise<void> => {
  const db = getFirestore()
  const content = `${data.species} - ${data.grade} grade, ${data.quantity} ${data.unit} available from ${data.sellerName} in ${data.location}${data.price ? ` at $${data.price}` : ''}`

  await db.collection('searchable_listings').doc(listingId).set({
    content,
    url: data.url,
    metadata: {
      quantity: `${data.quantity} ${data.unit}`,
      grade: data.grade,
      species: data.species,
      location: data.location,
      seller: data.sellerName,
      price: data.price
    },
    createdAt: new Date()
  })
}
