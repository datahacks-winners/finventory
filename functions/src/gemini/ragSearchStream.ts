import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'

// Mock inventory data
const MOCK_INVENTORY = [
  {
    itemId: 'listing_001',
    itemType: 'listing',
    content: 'Pacific Bluefin Tuna - A grade, 500 lb available from Pacific Seafood Co in Seattle, WA at $12.50/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_001',
    metadata: { species: 'Bluefin Tuna', grade: 'A', quantity: '500 lb', location: 'Seattle, WA', seller: 'Pacific Seafood Co', price: 12.50 }
  },
  {
    itemId: 'listing_002',
    itemType: 'listing',
    content: 'Yellowfin Tuna - sushi grade, 300 lb from Ocean Fresh in Portland, OR at $18/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_002',
    metadata: { species: 'Yellowfin Tuna', grade: 'sushi', quantity: '300 lb', location: 'Portland, OR', seller: 'Ocean Fresh', price: 18.00 }
  },
  {
    itemId: 'listing_003',
    itemType: 'listing',
    content: 'Albacore Tuna - B grade, 200 lb bulk lot from Fisherman Joe in San Diego, CA at $8/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_003',
    metadata: { species: 'Albacore Tuna', grade: 'B', quantity: '200 lb', location: 'San Diego, CA', seller: 'Fisherman Joe', price: 8.00 }
  },
  {
    itemId: 'listing_004',
    itemType: 'listing',
    content: 'Bigeye Tuna - A grade, 450 lb fresh catch from Deep Sea Fisheries in Los Angeles, CA at $15/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_004',
    metadata: { species: 'Bigeye Tuna', grade: 'A', quantity: '450 lb', location: 'Los Angeles, CA', seller: 'Deep Sea Fisheries', price: 15.00 }
  },
  {
    itemId: 'listing_005',
    itemType: 'listing',
    content: 'Skipjack Tuna - commercial grade, 1000 lb pallet from Global Seafood Trading in Miami, FL at $6/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_005',
    metadata: { species: 'Skipjack Tuna', grade: 'commercial', quantity: '1000 lb', location: 'Miami, FL', seller: 'Global Seafood Trading', price: 6.00 }
  },
  {
    itemId: 'listing_006',
    itemType: 'listing',
    content: 'Salmon - King/Chinook, A grade, 350 lb from Alaska Wild Catch in Juneau, AK at $22/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_006',
    metadata: { species: 'King Salmon', grade: 'A', quantity: '350 lb', location: 'Juneau, AK', seller: 'Alaska Wild Catch', price: 22.00 }
  },
  {
    itemId: 'listing_007',
    itemType: 'listing',
    content: 'Halibut - Pacific, B grade, 180 lb from North Coast Fisheries in Anchorage, AK at $14/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_007',
    metadata: { species: 'Pacific Halibut', grade: 'B', quantity: '180 lb', location: 'Anchorage, AK', seller: 'North Coast Fisheries', price: 14.00 }
  },
  {
    itemId: 'listing_008',
    itemType: 'listing',
    content: 'Cod - Atlantic, A grade, 600 lb from Boston Fish Market in Boston, MA at $9/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_008',
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
        if (['tuna', 'salmon', 'cod', 'halibut'].includes(keyword)) score += 3
        else if (['grade', 'lb', 'pounds'].includes(keyword)) score += 2
        else score += 1
      }
    }

    const quantityMatch = query.match(/(\d+)\s*(lb|pounds?|kg)/i)
    if (quantityMatch && item.content.includes(quantityMatch[1])) {
      score += 2
    }

    return { ...item, similarity: Math.min(0.95, 0.5 + (matches * 0.15) + (score * 0.05)) }
  }).filter(item => item.similarity > 0.5)

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
}

// SSE streaming response
export const ragSearchStream = onRequest(
  {
    cors: true,
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type')
      res.status(204).send('')
      return
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const { query, limit = 5 } = req.body?.data || req.body || {}

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Query is required' })
      return
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    try {
      // Search listings
      const listings = findListings(query, limit)

      // Send metadata first
      res.write(`data: ${JSON.stringify({ type: 'metadata', listings })}\n\n`)

      if (listings.length === 0) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: "I couldn't find any listings matching your query. Try searching for different fish species like tuna, salmon, or cod." })}\n\n`)
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        res.end()
        return
      }

      // Build context
      const context = listings.map(l =>
        `Item: ${l.content}\nURL: ${l.url}`
      ).join('\n\n')

      const apiKey = process.env.GEMINI_API_KEY

      if (!apiKey) {
        // Fallback: send template response
        const totalAvailable = listings.reduce((sum, l) => {
          const qty = l.metadata?.quantity?.match(/(\d+)/)?.[1]
          return sum + (qty ? parseInt(qty) : 0)
        }, 0)

        let response = `Found **${listings.length} listing${listings.length > 1 ? 's' : ''}** for "${query}" with ~${totalAvailable} lb total available.\n\n`
        response += listings.map(l => {
          const meta = l.metadata as Record<string, unknown>
          return `- **[${meta.species || 'Fish'} - ${meta.grade || 'Unknown'} grade](${l.url})**: ${meta.quantity || ''} from ${meta.seller || 'Unknown'} in ${meta.location || 'Unknown'}${meta.price ? ` at $${meta.price}/lb` : ''}`
        }).join('\n\n')

        // Stream the fallback response word by word for effect
        const words = response.split(' ')
        for (const word of words) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: word + ' ' })}\n\n`)
          // Small delay for streaming effect
          await new Promise(r => setTimeout(r, 10))
        }
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        res.end()
        return
      }

      // Stream from Gemini API
      const gemmaResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-3-12b-it:streamGenerateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `You are a helpful fish market assistant. Help buyers find what they need from the available inventory. Always cite specific listings using markdown links like [item description](url). Be concise but friendly.

Available inventory:
${context}

Buyer asks: "${query}"

Respond helpfully, citing relevant listings with [description](url) links. If nothing matches, say so clearly.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      })

      if (!gemmaResponse.ok) {
        const err = await gemmaResponse.text()
        logger.error('Gemini streaming error:', err)
        // Fallback to non-streaming error
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service temporarily unavailable' })}\n\n`)
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        res.end()
        return
      }

      // Read the streaming response
      const reader = gemmaResponse.body?.getReader()
      if (!reader) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to read AI response' })}\n\n`)
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        res.end()
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              res.end()
              return
            }

            try {
              const parsed = JSON.parse(data)
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
              if (text) {
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`)
              }
            } catch {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      }

      // Send any remaining content in buffer
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6)
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data)
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
            if (text) {
              res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`)
            }
          } catch {
            // Ignore
          }
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()

    } catch (error) {
      logger.error('Streaming error:', error)
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Search failed' })}\n\n`)
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()
    }
  }
)
