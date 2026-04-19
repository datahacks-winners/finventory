import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface SearchResult {
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

export default function SlopNavBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Direct HTTP call to Cloud Function (bypasses Firebase callable issues)
      const response = await fetch('https://ragsearch-eodwatsp5q-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { query: query.trim(), limit: 5 }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json = await response.json()
      setResult(json.result as SearchResult)
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    "500 pounds of tuna",
    "sushi grade salmon near me",
    "cheap cod in Seattle",
    "fresh halibut today"
  ]

  return (
    <div ref={containerRef} className="relative">
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-ocean-600 hover:bg-ocean-700 text-white rounded-full transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">Find Fish</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-surface-800 border border-surface-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Input Area */}
          <div className="p-4 border-b border-surface-700">
            <form onSubmit={handleSearch} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-on-surface placeholder-surface-500 focus:outline-none focus:border-ocean-500"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-ocean-600 hover:bg-ocean-700 disabled:bg-surface-600 text-white rounded-md transition-colors"
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </form>

            {/* Suggestions */}
            {!result && !loading && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s)
                      inputRef.current?.focus()
                    }}
                    className="px-3 py-1 text-sm bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {error && (
              <div className="p-4 text-red-400 text-sm">{error}</div>
            )}

            {result && (
              <div className="p-4">
                {/* AI Response */}
                <div className="prose prose-invert prose-sm max-w-none mb-4">
                  <ReactMarkdown>{result.answer}</ReactMarkdown>
                </div>

                {/* Matching Listings */}
                {result.listings.length > 0 && (
                  <div className="border-t border-surface-700 pt-4">
                    <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                      {result.listings.length} Matches
                    </h4>
                    <div className="space-y-2">
                      {result.listings.slice(0, 3).map((listing) => (
                        <a
                          key={listing.itemId}
                          href={listing.url}
                          onClick={(e) => {
                            e.preventDefault()
                            window.location.href = listing.url
                          }}
                          className="block p-3 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="text-sm text-on-surface">
                              {listing.content.substring(0, 80)}...
                            </div>
                            <span className="text-xs text-ocean-400 ml-2 shrink-0">
                              {(listing.similarity * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {result.listings.length === 0 && (
                  <div className="text-center py-4 text-surface-500 text-sm">
                    No matching listings found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
