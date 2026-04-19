import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/impact', label: 'Impact' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  const isActive = (to: string) =>
    to === '/marketplace' ? pathname.startsWith('/marketplace') : pathname === to

  return (
    <nav className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,95,147,0.06)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 lg:px-12 py-5 w-full max-w-screen-2xl mx-auto">
        {/* Left: Logo */}
        <Link
          to="/"
          className="text-2xl font-bold text-sky-900 italic-accent-caveat tracking-[-0.02em]"
        >
          Finventory
        </Link>

        {/* Center: Navigation - truly centered via grid */}
        <div className="hidden md:flex gap-10 items-center">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`tracking-[-0.02em] leading-relaxed transition-transform duration-300 hover:scale-[1.02] font-['Plus_Jakarta_Sans'] whitespace-nowrap ${
                isActive(link.to)
                  ? 'text-sky-700 font-bold border-b-2 border-sky-700 pb-1'
                  : 'text-slate-600 hover:text-sky-800 font-medium'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/orders"
              className={`tracking-[-0.02em] leading-relaxed transition-transform duration-300 hover:scale-[1.02] font-['Plus_Jakarta_Sans'] whitespace-nowrap ${
                isActive('/orders')
                  ? 'text-sky-700 font-bold border-b-2 border-sky-700 pb-1'
                  : 'text-slate-600 hover:text-sky-800 font-medium'
              }`}
            >
              My Orders
            </Link>
          )}
        </div>

        {/* Right: Auth buttons */}
        <div className="flex gap-4 items-center justify-end">
          {user ? (
            <>
              <span className="text-slate-600 text-sm hidden lg:inline">{user.displayName || user.email}</span>
              <Link
                to="/orders"
                className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-primary/10 hover:scale-[1.05] transition-all whitespace-nowrap"
              >
                My Orders
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-slate-600 font-medium px-6 py-2 hover:scale-[1.02] transition-transform hover:text-sky-800 whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                to="/auth"
                className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/10 hover:scale-[1.05] transition-all whitespace-nowrap"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function LogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="text-slate-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all"
      title="Sign out"
    >
      <span className="material-symbols-outlined text-xl">logout</span>
    </button>
  )
}
