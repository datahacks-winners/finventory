import { useState } from 'react'

export default function CrateDetail() {
  const [delivery, setDelivery] = useState(true)

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <main className="max-w-screen-2xl mx-auto px-12 py-12">
        {/* ── Editorial Header ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Large editorial photo */}
          <div className="lg:col-span-7 relative group">
            <div className="rounded-xl overflow-hidden ocean-shadow bg-surface-container-low aspect-[4/5] lg:aspect-auto lg:h-[720px]">
              <img
                alt="Wild King Salmon"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeU-D9hp_SzUFPHyOhIFeS46v6BJaQOECFocD1tykBNvkFu1ieaLu34xIjQd62ea56U8ALD6-WaXkt8ZfQnchtys91PSCeB51nDj8Y5SChuqlheN7dKeH0u9gjyUcKAwZDdGX_O4Np1AAjcWHyGendXiJUc-IVrHhQExgtlNXCOyY-osEH98D8CulLOIDwLku_P72MR3ZpxZwXVgipTfiHxueeGbcYQuHrpfLynAnj_Zx90H6MMujGUxTL7redwmJoXmbFoA4CJD0"
              />
            </div>
            {/* Accent annotation */}
            <div className="absolute -bottom-6 -right-6 bg-secondary-container p-6 rounded-xl ocean-shadow max-w-[240px] transform rotate-2">
              <span className="font-accent text-2xl text-on-secondary-container block mb-1">From the Captain</span>
              <p className="text-sm leading-relaxed text-on-secondary-container opacity-90">
                "Landed just before dawn in Bodega Bay. The fat content this season is exceptional."
              </p>
            </div>
          </div>

          {/* Right: Details canvas */}
          <div className="lg:col-span-5 flex flex-col gap-8 lg:pl-6">
            {/* Header info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-surface-container-highest text-primary font-bold px-3 py-1 rounded-full text-xs tracking-wider uppercase">Grade A+ Prime</span>
                <span className="text-outline-variant opacity-30">/</span>
                <span className="text-outline text-sm font-medium">Wild Caught</span>
              </div>
              <h1 className="text-6xl font-extrabold text-primary leading-tight">Wild King Salmon</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>anchor</span>
                  <span className="font-bold text-on-surface">Half Moon Bay Seafoods</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                <div className="text-outline font-medium">Caught Sept 24</div>
              </div>
            </div>

            {/* Pricing bento */}
            <div className="bg-surface-container-low rounded-xl p-8 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <span className="inline-block bg-secondary-container text-on-secondary-container font-bold px-3 py-1 rounded-full text-sm mb-4">
                    Sunset Discount -38%
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-primary">$8.40<span className="text-xl font-medium">/lb</span></span>
                    <span className="text-xl text-outline line-through decoration-error/40">$13.50</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-outline mb-1 uppercase tracking-widest font-bold">Total Crate</div>
                  <div className="text-2xl font-bold text-on-surface">$184.80</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-outline-variant/10">
                {[
                  { label: 'Weight', value: '22lb' },
                  { label: 'Harbor', value: 'Bodega Bay' },
                  { label: 'Window', value: '2pm–6pm' },
                ].map(d => (
                  <div key={d.label} className="flex flex-col">
                    <span className="text-xs text-outline font-bold uppercase tracking-widest mb-1">{d.label}</span>
                    <span className="text-lg font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Logistics & shipping */}
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl ocean-shadow border border-outline-variant/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">local_shipping</span>
                  </div>
                  <div>
                    <h4 className="font-bold">Last-Mile Delivery</h4>
                    <p className="text-sm text-outline">Powered by Uber Direct & DoorDash Drive</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={delivery} onChange={e => setDelivery(e.target.checked)} />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              {/* Trust signals */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white rounded-xl border border-outline-variant/10 flex items-start gap-4">
                  <div className="bg-tertiary/10 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  </div>
                  <div>
                    <div className="text-lg font-black text-on-surface">4.9/5.0</div>
                    <div className="text-xs text-outline uppercase font-bold tracking-tighter">Supplier Rating</div>
                  </div>
                </div>
                <div className="p-5 bg-white rounded-xl border border-outline-variant/10 flex items-start gap-4">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-primary">eco</span>
                  </div>
                  <div>
                    <div className="text-lg font-black text-on-surface">1,420 lbs</div>
                    <div className="text-xs text-outline uppercase font-bold tracking-tighter">Rescued so far</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button className="w-full py-6 bg-gradient-to-r from-primary to-primary-container text-white text-xl font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
              Reserve Crate
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* ── Bento Specs ── */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <h3 className="text-4xl font-extrabold text-on-surface">Crate Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-8 bg-surface-container-low rounded-xl">
                <h5 className="font-bold text-primary mb-2">Sustainable Sourcing</h5>
                <p className="text-on-surface/70 leading-relaxed">
                  Each king salmon is troll-caught, ensuring zero bycatch and the highest quality flesh with no bruising from nets.
                </p>
              </div>
              <div className="p-8 bg-surface-container-low rounded-xl">
                <h5 className="font-bold text-primary mb-2">Inventory Logic</h5>
                <p className="text-on-surface/70 leading-relaxed">
                  This crate represents the final landing of the morning. Price reduced to ensure zero waste before tomorrow's tide.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-8 relative overflow-hidden flex flex-col justify-end min-h-[300px]">
            <img
              alt="Fishing Vessel"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCS8Pa4BPGJ8svVGgsItGzhTcyS5mFXJjKJNomkYGH66L1Aqi1q6jbaxuDQpv9Wao_7bX22Exsvxjq27u6zec7kePcsqfPgMPdjfVUlb084Q2C0jkqAKs-GhZuQzc-XP9Irg_uASPAUcoP8mvx52jXAdH0fqHvmWM3ZQssUrG2mazeE-M-nmMKgZhgh5z4zOHEexHTyHVy_O_E5HYvReqym1mazQ1IztUYHKaFy2u-6ORUqEOsz9Dxf2v43l7OPUKaIVD4NCCgeWtk"
            />
            <div className="relative z-10">
              <span className="font-accent text-3xl text-secondary-container mb-2 block">Our Mission</span>
              <p className="text-lg font-medium leading-snug">
                Supporting local harbors by bridging the gap between excess catch and your kitchen.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
