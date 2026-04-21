import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'

const API_BASE = 'https://calcofi-api-270168887424.us-central1.run.app'

// CORS preflight headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '3600',
}

export const calcofiProxy = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v))
      res.status(204).send('')
      return
    }

    // Set CORS headers for actual request
    Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v))

    try {
      const path = req.path.replace(/^\//, '') // Remove leading slash
      const endpoint = `${API_BASE}/${path}`

      logger.info(`Proxying ${req.method} ${path} to ${endpoint}`, {
        bodyLength: req.body ? JSON.stringify(req.body).length : 0,
      })

      const response = await fetch(endpoint, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`API error: ${response.status} ${errorText}`)
        res.status(response.status).send(errorText)
        return
      }

      const data = await response.json()
      res.json(data)
    } catch (err) {
      logger.error('Proxy error:', err)
      res.status(500).json({ error: 'Proxy failed', details: String(err) })
    }
  }
)
