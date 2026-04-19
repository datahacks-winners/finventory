import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Tab = 'login' | 'signup'
type Role = 'logistician' | 'vendor'

export default function Auth() {
  const navigate = useNavigate()
  const { signIn, signUp, error: authError } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [role, setRole] = useState<Role>('logistician')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/suppliers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signUp(email, password, displayName || email.split('@')[0])
      navigate('/suppliers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#F2EDE4] text-slate-900 min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-5xl bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col md:flex-row min-h-[700px]"
          style={{ boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.1)' }}>

          {/* ── Left panel: editorial ── */}
          <div className="md:w-5/12 relative text-white flex flex-col justify-between overflow-hidden">
            <img
              alt="Coastal Maritime"
              className="absolute inset-0 w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHctEIxOAWMw-vDqwIHe51t0RZBNdsv3cxVEWAy4sR-_9TPkFNfjyVqfs6BjFCZMpH1ZiJCedyqimQa5WEhWYb_hXtdAh1iFCVtMLx2iPX6j2Ukycu4VRvCcOvLHf5620bEOu5-YtuHdjgRBnu8uzQUtgPjAk_KrcMZg_46YjQqfzmxSwxbeXwL3O7W8TMje76gPsSVUbmEsNgUw-08s0aqrwUWFDQYpjqee1U8E5V0sHsJyWYKhziD9CxkeSrYlxskUgcU9G1lEM"
            />
            <div className="absolute inset-0 editorial-overlay" />

            <div className="relative z-10 p-8 md:p-12">
              <Link to="/" className="flex items-center gap-2 mb-16">
                <span className="material-symbols-outlined text-3xl text-primary">anchor</span>
                <span className="text-2xl font-bold tracking-tighter uppercase italic">Finventory</span>
              </Link>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6 tracking-tight">
                Secure Identity Portal
              </h1>
            </div>

            <div className="relative z-10 p-8 md:p-12">
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-6">
                <div className="h-[1px] w-8 bg-primary" />
                Standards of Excellence
              </div>
              <div className="space-y-4">
                {[
                  { icon: 'encrypted', label: 'End-to-End Encryption' },
                  { icon: 'waves', label: 'Global Fleet Network' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 text-sm font-medium text-stone-200">
                    <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right panel: form ── */}
          <div className="md:w-7/12 p-8 md:p-16 bg-[#F9F6F1] flex flex-col justify-center">
            {/* Tabs */}
            <div className="flex gap-10 border-b border-stone-200 mb-10">
              {(['login', 'signup'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`pb-4 font-bold text-sm tracking-wide transition-colors ${
                    tab === t
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-stone-400 hover:text-primary'
                  }`}
                >
                  {t === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {/* ── Login form ── */}
            {tab === 'login' && (
              <div>
                <div className="mb-10">
                  <button className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full border border-stone-200 bg-white hover:bg-stone-50 transition-all font-bold text-stone-700 text-sm shadow-sm">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google Cloud SSO
                  </button>
                </div>

                <div className="relative my-10">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-bold tracking-[0.3em] uppercase text-stone-400">
                    <span className="bg-[#F9F6F1] px-4">Internal Access</span>
                  </div>
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-full text-sm font-medium text-center">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 px-1">
                      Organization Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      className="w-full bg-white border border-stone-200 rounded-full py-4 px-6 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest">Password</label>
                      <a href="#" className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">Lost Token?</a>
                    </div>
                    <input
                      type="password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white border border-stone-200 rounded-full py-4 px-6 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary-container transition-all shadow-lg shadow-primary/20 mt-4 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Entering...' : 'Enter Portal'}
                  </button>
                </form>
              </div>
            )}

            {/* ── Signup form ── */}
            {tab === 'signup' && (
              <div>
                <div className="mb-8">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-4 text-center">
                    Identity Type
                  </label>
                  <div className="segmented-control">
                    {(['logistician', 'vendor'] as Role[]).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`flex-1 py-3 px-4 rounded-full text-xs font-bold transition-all text-center capitalize ${
                          role === r
                            ? 'bg-white shadow text-primary'
                            : 'text-stone-400'
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <form className="space-y-5" onSubmit={handleSignup}>
                  {(error || authError) && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-full text-sm font-medium text-center">
                      {error || authError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 px-1">Business Name</label>
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Pacific Blue LTD" 
                        className="w-full bg-white border border-stone-200 rounded-full py-3.5 px-6 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 px-1">Location</label>
                      <input type="text" placeholder="Port of Rotterdam" className="w-full bg-white border border-stone-200 rounded-full py-3.5 px-6 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 px-1">Corporate Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hello@business.com" 
                      required
                      className="w-full bg-white border border-stone-200 rounded-full py-3.5 px-6 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 px-1">Password</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        required
                        className="w-full bg-white border border-stone-200 rounded-full py-3.5 px-6 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 px-1">Confirm</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-white border border-stone-200 rounded-full py-3.5 px-6 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary-container transition-all shadow-lg shadow-primary/20 uppercase tracking-widest disabled:opacity-50"
                    >
                      {loading ? 'Creating Account...' : 'Request Access'}
                    </button>
                    <p className="mt-6 text-[10px] text-center text-stone-400 font-medium leading-relaxed max-w-xs mx-auto">
                      All registration requests are reviewed by our logistics compliance board.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Auth-specific footer */}
      <footer className="w-full py-10 border-t border-stone-200 bg-[#F9F6F1]">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-primary">anchor</span>
            <span className="text-xs font-bold text-stone-900 tracking-tighter uppercase italic">Finventory Systems</span>
          </div>
          <div className="flex gap-10 text-[10px] font-bold uppercase tracking-widest text-stone-400">
            {['Status', 'Privacy', 'Audit'].map(l => (
              <a key={l} href="#" className="hover:text-primary transition-colors">{l}</a>
            ))}
          </div>
          <div className="text-[10px] text-stone-400 font-medium tracking-wide">
            © 2024 Finventory Inc. Maritime Division.
          </div>
        </div>
      </footer>
    </div>
  )
}
