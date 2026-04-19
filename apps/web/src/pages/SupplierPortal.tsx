import SparklineChart from '../components/SparklineChart'
import OceanCanvas from '../components/OceanCanvas'

const SPARKLINE_DATA = {
  crates: [80, 95, 110, 105, 120, 130, 142],
  lbs: [2100, 2600, 3000, 2900, 3400, 3600, 3820],
  revenue: [7200, 8800, 10100, 9800, 11200, 11900, 12400],
  pickup: [55, 50, 48, 46, 45, 43, 42],
}

const KPI_CARDS = [
  { label: 'Crates listed', value: '142', icon: 'inventory_2', key: 'crates' as const },
  { label: 'lbs rescued', value: '3,820', icon: 'set_meal', key: 'lbs' as const },
  { label: 'revenue', value: '$12.4k', icon: 'payments', key: 'revenue' as const },
  { label: 'pickup time', value: '42m', icon: 'schedule', key: 'pickup' as const },
]

const LISTINGS = [
  {
    name: 'Sea Bass', type: 'Whole Round', weight: '28 lbs', price: '$18.00/lb', distance: '0.4 mi',
    status: 'Live', statusClass: 'bg-primary-container/20 text-primary-container',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQUnTXp9XvAvpadxAG1UMxRAbSuqNlBr4QsMdkem3uiBumAQM56LDBXfVOIf4qTLSy3ehsitKw5paZ19MHRiWNg7jqrP_1f5-c0To3FEtUgPth64a2vaQQcjSdAx50icphtFvXaKQU2J6YeZB90w1_z8rzEJEgIH1uolDhcopuizeAv1NhSDCdvxQ5fMkwUrebVjm9IMlZS4UQPIJ4s2Mip-6Wdzd0GDrXYi3mewiJAwtFsioFGWV0SmkULl-YPgRh3givZDUX75A',
  },
  {
    name: 'Blue Crabs', type: 'Crate', weight: '12 lbs', price: '$45.00/ea', distance: '1.2 mi',
    status: 'Reserved', statusClass: 'bg-secondary-container/20 text-secondary',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0uOILm6AVT2u4Cmlha744d7MTkFWtMDc0gCvY9byiZhAhDIa58dclXHFSGOeMdiCaQ75vnZvpSHNi_0QMNkMdJMgBm2_plT1sDlI_fLL9ZdUQVPZa6a2aL6ze7Vc4hg--STKlMsAqcRhF9v8Uu80SKSRPCFp7svxx7KVLT7FbecZDvGxxlyWIeYARJ5xjub73BuX9EcBuQjvdq7akgaTqommraowIxQvi0J3Q4hEI8gp99OL9F8aYbfdM6w1nk3hSZN2UWy52rw0',
  },
  {
    name: 'Scallops', type: 'Shucked', weight: '5 lbs', price: '$22.00/lb', distance: 'Picked up',
    status: 'Picked up', statusClass: 'bg-outline-variant/20 text-outline',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH2B8HqQnzSEvlRmOG-4-rANVnXVskJDQsHE_b7b9UdBBRzXbMHDqpRFQDMgfzGv7BC-x4KRQtC7eSNWm5RO9eVSD5eJwwl5TtWw1J2vB4PKGM69q6qrOGKRsxZpv6ArI-yVh9kPIYO84DFM2jj4a5ZXkkhSKS5vl7_Y_6kiv8ZUANifI_LQsU010Ve4TiamNuWh8Jk-urmXhEmfH_PFMS4GTDMcElwzJsyc-e4y_uzPC9eVNU_3bqNHr0FGdoYSoZ8_eTfEkOoI',
  },
]

export default function SupplierPortal() {
  return (
    <div className="text-on-surface" style={{ backgroundColor: '#fff8f5' }}>
      {/* ── Hero ── */}
      <section className="relative h-[614px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover grayscale-[20%] contrast-[110%]"
            alt="busy harbor at sunrise"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYDyRIOV_XghhBrPerMfFY4uOSf1XoxcFNo0ZAajR1h69tLHU12DBqs1pq7Duem8NxK32EzUoMzE7ZyFFzJgQhY2oxZN4WU1A3eMdfWPYcvoX_qB9oDZ9zdDdZPt69aUSBegxog640-rVBE9Usk8wMFgsQSziaiKcEplRQZ_vTmAYNmJ2ECxNypdoCgoAH-8wkr4jjovqKnB2UvnhC5IdwsVDMyGmmVw0w8klb9fr9Fx9U6NnD2-AU8yurJPDLhTPaS3CKDuLfiic"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-transparent" />
        </div>
        <OceanCanvas className="absolute inset-0 z-[1] pointer-events-none opacity-20" />
        <div className="relative z-10 px-12 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
            <span className="italic-accent-caveat text-white text-3xl mb-4 block">From the Captain</span>
            <h1 className="text-7xl font-extrabold text-white leading-tight tracking-tighter">Your dock, digitized.</h1>
            <p className="text-white/90 text-xl mt-6 font-light leading-relaxed">
              Transform your daily catch into instant listings. Connect directly with buyers while the salt is still in the air.
            </p>
          </div>
        </div>
        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
          <svg className="relative block w-full h-[60px] fill-surface" preserveAspectRatio="none" viewBox="0 0 1200 120">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C58.05,117.26,132.89,121.23,196.41,114.33Z" />
          </svg>
        </div>
      </section>

      {/* ── KPI Row ── */}
      <section className="px-12 max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {KPI_CARDS.map(kpi => (
          <div key={kpi.label} className="bg-surface-container-lowest p-8 rounded-lg ocean-shadow group hover:scale-[1.02] transition-transform">
            <p className="text-outline text-sm uppercase tracking-widest font-bold">{kpi.label}</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-5xl font-black italic-accent-caveat text-primary">{kpi.value}</span>
              <span className="material-symbols-outlined text-primary-container">{kpi.icon}</span>
            </div>
            <div className="mt-4">
              <SparklineChart data={SPARKLINE_DATA[kpi.key]} color="#1e78b4" height={32} />
            </div>
          </div>
        ))}
      </section>

      {/* ── Form + Preview ── */}
      <section className="px-12 max-w-screen-2xl mx-auto flex flex-col lg:flex-row gap-12 items-start mt-20">
        {/* Form */}
        <div className="flex-1 bg-surface-container-lowest p-12 rounded-lg ocean-shadow">
          <header className="mb-10">
            <span className="italic-accent-caveat text-primary text-2xl">Fresh from the nets</span>
            <h2 className="text-4xl font-extrabold tracking-tighter">List a new crate</h2>
          </header>
          <form className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'Species', type: 'text', placeholder: 'e.g. Bluefin Tuna' },
                { label: 'Weight (lbs)', type: 'number', placeholder: '45' },
                { label: 'Price per lb', type: 'number', placeholder: '12.50', prefix: '$' },
                { label: 'Discount %', type: 'number', placeholder: '0' },
                { label: 'Pickup Windows', type: 'text', placeholder: 'ASAP - 6:00 PM' },
              ].map(field => (
                <div key={field.label} className="ghost-border p-2">
                  <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">{field.label}</label>
                  <div className="flex items-center">
                    {field.prefix && <span className="text-lg font-medium mr-1">{field.prefix}</span>}
                    <input
                      type={field.type}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-medium outline-none"
                      placeholder={field.placeholder}
                    />
                  </div>
                </div>
              ))}
              <div className="ghost-border p-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">Type</label>
                <select className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-medium outline-none cursor-pointer">
                  <option>Whole Round</option>
                  <option>H&G</option>
                  <option>Fillet</option>
                </select>
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-4">Photo dropzone</label>
              <div className="border-2 border-dashed border-outline-variant/30 rounded-lg p-12 text-center hover:bg-surface-container-low transition-colors group cursor-pointer">
                <span className="material-symbols-outlined text-5xl text-outline-variant group-hover:text-primary transition-colors">cloud_upload</span>
                <p className="mt-2 text-outline font-medium">
                  Drop your catch photo here or <span className="text-primary underline">browse</span>
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                className="bg-gradient-to-r from-primary to-primary-container text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform"
              >
                Publish Listing
              </button>
            </div>
          </form>
        </div>

        {/* Preview + Tip */}
        <div className="w-full lg:w-96 space-y-8">
          <div className="bg-surface-container-lowest rounded-lg overflow-hidden ocean-shadow relative">
            <div className="h-56 relative">
              <img
                className="w-full h-full object-cover"
                alt="fresh atlantic salmon fillets on crushed ice"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD71PYmTkULPrkQEzIPQ1SBiTzO9oYeYoTcaZuJmML_O7aPy-MsMiR9Amjx2mi7EWN0MOwNuAbeMVGCIJnLXKg-s59W5X-kQnhRZDFmt76RiIIqUg6I6lVGfHRLtxJCvzbXSshFzI5PFWDX5UAziAr9VQDhLM5CRyN8EM19l4Pi519fM5b5h6eI7uzVfZTVSu_JaWocyexNNbIOZCkhRj-u7HqBpOu51ipd30h70ktG5s-WUxAbCQQ1MfMQNBFcw9_QvZ_yLxUPL_8"
              />
              <div className="absolute top-4 left-4 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase shadow-lg">
                Live Preview
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Atlantic Salmon</h3>
                  <p className="text-outline text-sm">Whole Round • 45 lbs</p>
                </div>
                <span className="text-2xl font-black text-primary">$12.50<span className="text-sm font-normal text-outline">/lb</span></span>
              </div>
              <div className="mt-6 flex items-center text-sm font-medium text-on-surface-variant">
                <span className="material-symbols-outlined text-sm mr-2">location_on</span>
                Pier 42, North Harbor
              </div>
            </div>
          </div>

          <div className="bg-tertiary-container p-8 rounded-lg shadow-sm border-l-8 border-tertiary">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-on-tertiary-container">lightbulb</span>
              <div>
                <h4 className="font-bold text-on-tertiary-container mb-2">Captain's Tip</h4>
                <p className="text-on-tertiary-container/80 text-sm leading-relaxed">
                  Listings with high-quality daylight photos sell 40% faster. Try to avoid shadows from the boat's rigging!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Listings Table ── */}
      <section className="px-12 max-w-screen-2xl mx-auto flex flex-col md:flex-row gap-12 mt-20 pb-20">
        <div className="flex-grow">
          <header className="mb-8 flex justify-between items-end">
            <div>
              <span className="italic-accent-caveat text-primary text-2xl">Current Fleet</span>
              <h2 className="text-4xl font-extrabold tracking-tighter">Your active listings</h2>
            </div>
            <button className="flex items-center text-primary font-bold hover:gap-3 transition-all gap-2">
              View Archive <span className="material-symbols-outlined">arrow_right_alt</span>
            </button>
          </header>

          <div className="bg-surface-container-lowest rounded-lg overflow-hidden ocean-shadow">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Catch', 'Type', 'Weight', 'Price', 'Distance', 'Status', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {LISTINGS.map(row => (
                  <tr key={row.name} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                          <img className="w-full h-full object-cover" alt={row.name} src={row.img} />
                        </div>
                        <span className="font-bold">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-on-surface-variant font-medium">{row.type}</td>
                    <td className="px-6 py-6 text-on-surface-variant font-medium">{row.weight}</td>
                    <td className="px-6 py-6 text-on-surface-variant font-medium">{row.price}</td>
                    <td className="px-6 py-6 text-on-surface-variant font-medium">{row.distance}</td>
                    <td className="px-6 py-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${row.statusClass}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <button className="material-symbols-outlined text-outline hover:text-primary">more_vert</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar tips */}
        <aside className="w-full md:w-80 space-y-8 mt-20">
          <div className="bg-surface-container p-8 rounded-lg ocean-shadow">
            <h3 className="text-2xl font-black italic-accent-caveat text-primary mb-6">Sell faster</h3>
            <ul className="space-y-6">
              {[
                { icon: 'timer', title: 'Morning Rush', desc: 'Listings before 7:00 AM receive 3x more views from restaurant chefs.' },
                { icon: 'sell', title: 'Bundling Magic', desc: 'Try listing a "Soup Pack" with smaller off-cuts for quick liquidation.' },
                { icon: 'verified', title: 'Identity Counts', desc: 'Add a photo of your boat to your profile to build trust with high-end buyers.' },
              ].map(tip => (
                <li key={tip.title} className="flex gap-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{tip.icon}</span>
                  <div>
                    <p className="font-bold text-sm">{tip.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button className="w-full mt-10 py-3 rounded-full border border-primary/20 text-primary font-bold hover:bg-primary hover:text-white transition-all">
              Explore All Tips
            </button>
          </div>
        </aside>
      </section>
    </div>
  )
}
