import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const RAG_SEARCH_URL = 'https://ragsearchhttp-593576627371.us-central1.run.app'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  listings?: Array<{
    itemId: string
    content: string
    url: string
    similarity: number
    metadata?: Record<string, unknown>
  }>
}

export default function SlopNavBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "🦀 Hi there! I'm **Shelby**! 🦀\n\nI scuttle around the docks helping folks find the perfect catch! Ask me about:\n• 🐟 \"500 lbs of tuna near Seattle\"\n• 🍣 \"Best salmon for sushi\"\n• 💰 \"Cheapest cod available\"\n\n*Click my claws if you need anything!* 🦀✨"
    }
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close on outside click
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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setLoading(true)

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Use HTTP endpoint instead of Firebase callable
      const response = await fetch(RAG_SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg, limit: 5 })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json() as { answer: string; listings?: Message['listings'] }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        listings: data.listings
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Search error:', err)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "🦀 Oh no! I got a little tangled in my nets there... Can you try again? I promise to scuttle faster next time! *snip snap* 🦀"
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const quickReplies = [
    "500 lbs of tuna 🐟",
    "Sushi grade salmon 🍣",
    "Cheapest cod 💰",
    "Fresh halibut today 🎣"
  ]

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-96 max-w-[calc(100vw-3rem)] bg-surface rounded-2xl shadow-2xl border border-surface-variant overflow-hidden flex flex-col" style={{ height: '500px', maxHeight: 'calc(100vh - 120px)' }}>
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl">
                🦀
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Shelby</h3>
                <p className="text-white/80 text-xs">Your friendly dockside helper 🦀</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-low">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-surface text-on-surface rounded-bl-sm shadow-sm border border-surface-variant'
                  }`}
                >
                  <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Listing previews for assistant messages */}
                  {msg.role === 'assistant' && msg.listings && msg.listings.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-surface-variant space-y-2">
                      {msg.listings.slice(0, 2).map((listing) => (
                        <a
                          key={listing.itemId}
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 bg-surface-container rounded-lg hover:bg-surface-container-high transition-colors text-xs"
                        >
                          <div className="font-medium text-on-surface truncate">{listing.content.substring(0, 60)}...</div>
                          <div className="text-on-surface-variant mt-1">
                            🎯 {(listing.similarity * 100).toFixed(0)}% match
                          </div>
                        </a>
                      ))}
                      {msg.listings.length > 2 && (
                        <div className="text-xs text-on-surface-variant text-center">
                          🦀 +{msg.listings.length - 2} more treasures found!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="text-lg animate-bounce">🦀</span>
                    <span className="text-sm text-on-surface-variant">Scuttling around...</span>
                    <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length < 3 && (
            <div className="px-4 py-2 bg-surface-container border-t border-surface-variant">
              <p className="text-xs text-on-surface-variant mb-2">🦀 Popular searches:</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => {
                      setInput(reply.replace(/ [🐟🍣💰🎣]$/, ''))
                      inputRef.current?.focus()
                    }}
                    className="px-3 py-1.5 text-xs bg-surface-container-high hover:bg-primary hover:text-white text-on-surface rounded-full transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-surface border-t border-surface-variant flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What are you looking for, sailor? ⚓"
              className="flex-1 px-4 py-2 bg-surface-container border border-outline-variant rounded-full text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-primary hover:bg-primary-container disabled:bg-surface-variant text-white rounded-full transition-colors"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span className="text-lg">🦀</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-full shadow-xl transition-all hover:scale-105 hover:shadow-2xl min-w-[140px] ${
          isOpen ? 'bg-on-surface text-white' : 'bg-primary text-white'
        }`}
      >
        {isOpen ? (
          <>
            <span className="text-xl">🦀</span>
            <span className="hidden sm:inline font-medium">Bye bye!</span>
          </>
        ) : (
          <>
            <span className="text-xl animate-bounce">🦀</span>
            <span className="hidden sm:inline font-bold">Chat with Shelby!</span>
          </>
        )}
      </button>
    </div>
  )
}
