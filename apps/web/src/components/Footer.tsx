import { Link } from 'react-router-dom'

const FOOTER_LINKS: Record<string, { label: string; to: string }[]> = {
  Marketplace: [
    { label: "Today's Catch", to: '/marketplace' },
    { label: 'Harbors & Ports', to: '/marketplace' },
    { label: 'Suppliers List', to: '/suppliers' },
  ],
  Company: [
    { label: 'Sustainability', to: '/impact' },
    { label: 'Impact Report', to: '/impact' },
    { label: 'About', to: '/about' },
  ],
  Legal: [
    { label: 'Privacy Policy', to: '#' },
    { label: 'Terms of Service', to: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-[#fff8f5] w-full relative pt-24 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-6 lg:px-12 w-full max-w-7xl mx-auto font-['Plus_Jakarta_Sans'] tracking-tight">
        <div className="col-span-1">
          <div className="text-3xl font-black text-white mb-8 italic-accent-caveat">Finventory</div>
          <p className="text-slate-400 leading-relaxed">
            Curating the ocean's bounty. Connecting harvesters and buyers for a waste-free coast.
          </p>
        </div>

        {Object.entries(FOOTER_LINKS).map(([col, links]) => (
          <div key={col}>
            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-sm">{col}</h4>
            <ul className="space-y-4">
              {links.map(({ label, to }) => (
                <li key={label}>
                  <Link 
                    to={to} 
                    className="text-slate-400 hover:text-orange-50 hover:translate-x-1 transition-all inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="px-6 lg:px-12 py-8 mt-16 border-t border-slate-800/50 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="text-slate-500 text-sm">© 2026 Finventory. Curating the ocean's bounty.</span>
        <div className="flex gap-6">
          {['public', 'waves', 'anchor'].map(icon => (
            <a key={icon} href="#" className="text-slate-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined">{icon}</span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
