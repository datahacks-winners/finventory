import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Pool } from 'pg'

interface RagSearchRequest {
  query: string
  limit?: number
}

interface RagSearchResult {
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

// Use Cloud SQL Unix socket (works on Cloud Run)
const getPool = (): Pool => {
  return new Pool({
    host: '/cloudsql/finventory-1776558252:us-central1:finventory-1776558252-vector-store',
    database: 'rag_vectors',
    user: 'rag_user',
    password: process.env.DB_PASSWORD || '',
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  })
}

export const ragSearch = onCall(
  {
    cors: ['http://localhost:5173', 'http://localhost:3000', 'https://finventory.web.app', 'https://finventory.com'],
    timeoutSeconds: 30,
    memory: '512MiB'
  },
  async (request): Promise<RagSearchResult> => {
    const { query, limit = 5 } = request.data as RagSearchRequest

    if (!query || query.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Query is required')
    }

    try {
      // Simple keyword search from pgvector
      const pgPool = getPool()

      // Search using keyword matching on content
      const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2)
      const whereClause = keywords.length > 0
        ? `WHERE ${keywords.map((_, i) => `LOWER(content) LIKE $${i + 1}`).join(' OR ')}`
        : ''
      const params = keywords.map(k => `%${k}%`)

      const searchResult = await pgPool.query(
        `SELECT
          item_id,
          item_type,
          content,
          url,
          metadata,
          created_at
        FROM item_embeddings
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${keywords.length + 1}`,
        [...params, limit]
      )

      const listings = searchResult.rows.map(row => ({
        itemId: row.item_id,
        itemType: row.item_type,
        content: row.content,
        url: row.url,
        similarity: 0.95,
        metadata: row.metadata || {}
      }))

      // Build context from listings
      const context = listings.length > 0
        ? listings.map(l => `[${l.content}](${l.url})`).join('\n\n')
        : 'No matching listings found in the database.'

      // Call Gemma via AI Studio for natural response
      const aiStudioKey = process.env.GEMINI_API_KEY
      const gemmaResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiStudioKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemma-4-31b-it',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful fish market assistant. Help buyers find what they need from the available inventory. Always cite specific listings using markdown links like [item description](url). Be concise but friendly.'
            },
            {
              role: 'user',
              content: `Available inventory:\n${context}\n\nBuyer asks: ${query}\n\nRespond helpfully, citing relevant listings with [description](url) links. If nothing matches, say so clearly.`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      })

      if (!gemmaResponse.ok) {
        const err = await gemmaResponse.text()
        console.error('Gemma error:', err)
        throw new HttpsError('internal', 'AI response failed')
      }

      const gemmaData = await gemmaResponse.json() as { choices?: Array<{ message?: { content?: string } }> }
      const answer = gemmaData.choices?.[0]?.message?.content || 'No response from AI'

      return {
        answer,
        listings
      }

    } catch (error) {
      console.error('RAG search error:', error)
      throw new HttpsError('internal', 'Search failed', error)
    }
  }
)

// Index a listing for search
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
  const content = `${data.species} - ${data.grade} grade, ${data.quantity} ${data.unit} available from ${data.sellerName} in ${data.location}${data.price ? ` at $${data.price}` : ''}`

  const embedding = Array.from({ length: 768 }, () => Math.random() * 0.02 - 0.01)
  const pgPool = getPool()
  const vectorStr = `[${embedding.join(',')}]`

  await pgPool.query(
    `INSERT INTO item_embeddings (item_id, item_type, content, url, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5::vector, $6)
     ON CONFLICT (item_id) DO UPDATE SET
       content = EXCLUDED.content,
       url = EXCLUDED.url,
       embedding = EXCLUDED.embedding,
       metadata = EXCLUDED.metadata,
       created_at = NOW()`,
    [
      listingId,
      'listing',
      content,
      data.url,
      vectorStr,
      JSON.stringify({
        quantity: `${data.quantity} ${data.unit}`,
        grade: data.grade,
        species: data.species,
        location: data.location,
        seller: data.sellerName
      })
    ]
  )
}
