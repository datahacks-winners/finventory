import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/impact', label: 'Impact' },
  { to: '/about', label: 'About' },
]

const FOOTER_COLS: Record<string, string[]> = {
  Marketplace: ["Today's Catch", 'Harbors & Ports', 'Suppliers List'],
  Company: ['Sustainability', 'Impact Report', 'About'],
  Legal: ['Privacy Policy', 'Terms of Service'],
}

type Tab = 'login' | 'signup'
type Role = 'buyer' | 'supplier'

export default function Auth() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')
  const [role, setRole] = useState<Role>('buyer')
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
      // TODO: Integrate with Firebase Auth when config is available
      console.log('Login:', email, password)
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
      // TODO: Integrate with Firebase Auth when config is available
      console.log('Signup:', email, password, displayName)
      navigate('/suppliers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#FAF9F6] text-slate-900 min-h-screen flex flex-col font-body">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,95,147,0.06)]">
        <div className="flex justify-between items-center px-6 lg:px-12 py-5 w-full max-w-screen-2xl mx-auto">
          <Link
            to="/"
            className="text-2xl font-bold text-sky-900 italic-accent-caveat tracking-[-0.02em]"
          >
            Finventory
          </Link>

          <div className="hidden md:flex gap-10 items-center">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="tracking-[-0.02em] leading-relaxed transition-transform duration-300 hover:scale-[1.02] font-['Plus_Jakarta_Sans'] text-slate-600 hover:text-sky-800 font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex gap-4 items-center">
            <button
              onClick={() => setTab('login')}
              className={`text-slate-600 font-medium px-6 py-2 hover:scale-[1.02] transition-transform hover:text-sky-800 ${tab === 'login' ? 'text-sky-700 font-bold' : ''}`}
            >
              Log in
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`px-8 py-3 rounded-full font-bold shadow-lg transition-all ${tab === 'signup' ? 'bg-primary text-white shadow-primary/10 hover:scale-[1.05]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Sign up
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-md">
          {/* ── Header ── */}
          <div className="text-center mb-10">
            <span className="italic-accent-caveat text-primary text-2xl mb-2 block">
              {tab === 'login' ? 'welcome back' : 'join the coast'}
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              {tab === 'login' ? 'Sign in to your account' : 'Create your account'}
            </h1>
            <p className="text-slate-600 text-lg">
              {tab === 'login'
                ? 'Continue rescuing the catch and feeding the coast.'
                : 'Start listing surplus catch or sourcing fresh seafood.'}
            </p>
          </div>

          {/* ── Login form ── */}
          {tab === 'login' && (
            <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-8 md:p-10">
              <div className="mb-6">
                <button className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs font-bold tracking-widest uppercase text-slate-400">
                  <span className="bg-white px-4">or continue with email</span>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleLogin}>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
                    <a href="#" className="text-xs font-bold text-primary hover:underline">Forgot password?</a>
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary-container transition-all shadow-lg shadow-primary/20 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Don't have an account?{' '}
                <button
                  onClick={() => setTab('signup')}
                  className="font-bold text-primary hover:underline"
                >
                  Sign up
                </button>
              </p>
            </div>
          )}

          {/* ── Signup form ── */}
          {tab === 'signup' && (
            <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-8 md:p-10">
              <div className="mb-6">
                <button className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs font-bold tracking-widest uppercase text-slate-400">
                  <span className="bg-white px-4">or create with email</span>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleSignup}>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    I am a
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['buyer', 'supplier'] as Role[]).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-3 px-4 rounded-xl text-sm font-bold transition-all text-center capitalize ${
                          role === r
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {r === 'buyer' ? 'Chef or Buyer' : 'Fisher or Supplier'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Business Name</label>
                    <input type="text" placeholder="Pacific Catch Co." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Confirm</label>
                    <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary-container transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </button>
                  <p className="mt-4 text-xs text-center text-slate-400 font-medium leading-relaxed">
                    By signing up, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <button
                  onClick={() => setTab('login')}
                  className="font-bold text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-[#fff8f5] w-full relative pt-24 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-6 lg:px-12 w-full max-w-7xl mx-auto font-['Plus_Jakarta_Sans'] tracking-tight">
          <div className="col-span-1">
            <div className="text-3xl font-black text-white mb-8 italic-accent-caveat">Finventory</div>
            <p className="text-slate-400 leading-relaxed">
              Curating the ocean's bounty. Connecting harvesters and buyers for a waste-free coast.
            </p>
          </div>

          {Object.entries(FOOTER_COLS).map(([col, links]) => (
            <div key={col}>
              <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-sm">{col}</h4>
              <ul className="space-y-4">
                {links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-slate-400 hover:text-orange-50 hover:translate-x-1 transition-all inline-block">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-6 lg:px-12 py-8 mt-16 border-t border-slate-800/50 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-slate-500 text-sm">© 2024 Finventory. Curating the ocean's bounty.</span>
          <div className="flex gap-6">
            {['public', 'waves', 'anchor'].map(icon => (
              <a key={icon} href="#" className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">{icon}</span>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
