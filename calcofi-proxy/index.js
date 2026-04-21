const API_BASE = 'https://calcofi-api-270168887424.us-central1.run.app'

exports.calcofiProxy = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.set('Access-Control-Max-Age', '3600')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    const path = req.path?.replace(/^\//, '') || ''
    const endpoint = `${API_BASE}/${path}`

    console.log(`Proxying ${req.method} ${path} to ${endpoint}`)

    const response = await fetch(endpoint, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API error: ${response.status} ${errorText}`)
      res.status(response.status).send(errorText)
      return
    }

    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('Proxy error:', err)
    res.status(500).json({ error: 'Proxy failed', details: String(err) })
  }
}
