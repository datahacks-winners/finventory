import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { Pool } from 'pg'

const secrets = new SecretManagerServiceClient()

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

let pool: Pool | null = null

const getPool = async (): Promise<Pool> => {
  if (pool) return pool

  const [version] = await secrets.accessSecretVersion({
    name: 'projects/finventory-1776558252/secrets/vector-db-connection/versions/latest'
  })

  const creds = JSON.parse(version.payload?.data?.toString() || '{}')

  pool = new Pool({
    host: creds.host,
    port: creds.port || 5432,
    database: creds.database,
    user: creds.user,
    password: creds.password,
    ssl: false
  })

  return pool
}

// Generate embedding using Gemini Embeddings API
const generateEmbedding = async (text: string): Promise<number[]> => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'test') {
    throw new Error('GEMINI_API_KEY not configured')
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/embedding-001',
      content: { parts: [{ text }] }
    })
  })
  
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Embedding API error: ${response.status} ${response.statusText} - ${err}`)
  }
  
  const data = await response.json() as { embedding?: { values?: number[] } }
  return data.embedding?.values || []
}

export const ragSearch = onCall(
  {
    cors: ['http://localhost:5173', 'http://localhost:3000', 'https://finventory.web.app', 'https://finventory.com'],
    timeoutSeconds: 30,
    memory: '512MiB',
    secrets: ['GEMINI_API_KEY']
  },
  async (request): Promise<RagSearchResult> => {
    const { query, limit = 5 } = request.data as RagSearchRequest

    if (!query || query.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Query is required')
    }

    try {
      // Generate embedding for the query
      const embedding = await generateEmbedding(query)

      // Search vector store
      const pgPool = await getPool()
      const vectorStr = `[${embedding.join(',')}]`

      const searchResult = await pgPool.query(
        `SELECT
          item_id,
          item_type,
          content,
          url,
          metadata,
          1 - (embedding <=> $1::vector) as similarity
        FROM item_embeddings
        ORDER BY embedding <=> $1::vector
        LIMIT $2`,
        [vectorStr, limit]
      )

      const listings = searchResult.rows.map(row => ({
        itemId: row.item_id,
        itemType: row.item_type,
        content: row.content,
        url: row.url,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata || {}
      }))

      // Build context from listings
      const context = listings
        .map(l => `[${l.itemType} ${l.itemId}](${l.url}): ${l.content}${l.metadata.quantity ? ` (Qty: ${l.metadata.quantity})` : ''}`)
        .join('\n\n')

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

// Index a listing for search (call this when new listings are created)
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

  const embedding = await generateEmbedding(content)
  const pgPool = await getPool()
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
