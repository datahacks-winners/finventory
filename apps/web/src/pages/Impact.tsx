import { useState } from 'react'
import TempBinsChart from '../components/TempBinsChart'
import { AnimatedNumber } from '../components/AnimatedNumber'
import CalcofiInference from '../components/CalcofiInference'

const ACCORDION_ITEMS = [
  {
    title: 'Waste Calculation Standard',
    body: 'Redirection metrics are audited monthly against NOAA Seafood Waste Metrics v2.4. We track actual redistribution through the Finventory ledger, subtracting standard packaging decay and logistics-related loss factors.',
  },
  {
    title: 'Economic Equity Framework',
    body: 'Community capital metrics reflect the direct financial gains returned to vessel owners versus traditional regional auction house pricing. We prioritize transparency in transaction fees and regional floor pricing.',
  },
]

export default function Impact() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(0)

  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <main>
        {/* ── Hero ── */}
        <section className="relative min-h-[819px] flex flex-col justify-center overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0">
            <img
              alt="Fishermen working on deck"
              className="w-full h-full object-cover opacity-60"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXGiSpzMu24sR6o-OzVoND0MXkdB3zGhvPf1Nj1iveYKwiBECCg9SuToln5pokYCc7YCQtH99DxtEpa5Z2pE558jrsOHq7BhGhIdct2h9JUVcqVpwNICSKyM8OCcPmIG0hlcSKjyZDA0HhtevXsj2c5tkpRuxH3qhcVSNuLIgfuqaRXNgOm5ixQ_RdjzaI3E5_fGp1c0JYK1qyJmhY5KNugO_N-UvRLO2J175Oo9GSof1YlL55eJwFoicmHWYM_TuMbiODeFWtvRI"
            />
            <div className="absolute inset-0 bg-slate-900/70" />
          </div>
          <div className="relative z-10 px-12 max-w-7xl mx-auto w-full pt-20">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-16 max-w-4xl" style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              The Raw Data of <br />
              <span className="italic font-light text-primary-fixed">Ocean Stewardship.</span>
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/20 pt-12">
              {[
                { value: 35, suffix: '%', label: 'Global Harvest Lost or Wasted', color: 'text-primary-fixed', source: 'Source: FAO State of World Fisheries' },
                { value: 0.86, decimals: 2, suffix: ' kg', label: 'CO2e Emitted per kg Landfilled', color: 'text-secondary-fixed', source: 'Source: EPA Methane Impact Study' },
                { value: 36.6, decimals: 1, suffix: '%', label: 'Fisher Share of Consumer Value', color: 'text-tertiary-fixed', source: 'Source: NOAA Economic Data' },
              ].map(s => (
                <div key={s.label}>
                  <div className={`text-5xl font-black mb-2 ${s.color}`}>
                    <AnimatedNumber
                      value={s.value}
                      suffix={s.suffix}
                      prefix={(s as { prefix?: string }).prefix || ''}
                      decimals={s.decimals}
                      separator=","
                      duration={2.5}
                    />
                  </div>
                  <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-300 mb-6">{s.label}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-white/10 pt-4">
                    {s.source}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Charts ── */}
        <section className="py-20 bg-white">
          <div className="px-4 md:px-8 lg:px-12 max-w-7xl mx-auto mb-10">
            <span className="italic-accent-caveat text-primary text-2xl block mb-2">CalCOFI Survey Data</span>
            <h2 className="text-4xl font-black tracking-tight text-on-surface">Warming Oceans, Fewer Fish</h2>
            <p className="text-on-surface-variant mt-4 max-w-2xl">
              CalCOFI larval egg surveys show egg density declining sharply beyond 14°C. As the Pacific warms, spawning success falls — making every rescued pound of existing catch more critical than ever.
            </p>
          </div>
          <div className="w-full bg-surface-container-low border-y border-outline-variant/20">
            <div className="px-4 md:px-8 lg:px-12 max-w-7xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-outline pt-4">Egg Density vs. Surface Temperature</p>
              <TempBinsChart className="w-full flex justify-center" />
            </div>
          </div>
        </section>

        {/* ── CalCOFI ML Inference ── */}
        <section className="px-12 py-20 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <span className="italic-accent-caveat text-primary text-2xl block mb-2">ML-Powered</span>
              <h2 className="text-4xl font-black tracking-tight text-on-surface">Ocean Health Predictions</h2>
              <p className="text-on-surface-variant mt-4 max-w-2xl">
                Using CalCOFI survey data and machine learning models (XGBoost, OLS, TimesFM) 
                to predict larval fish density from oceanographic features.
              </p>
            </div>
            <CalcofiInference />
          </div>
        </section>


        {/* ── Authentic story ── */}
        <section className="px-12 py-32 bg-surface-container-lowest">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <div className="relative group">
              <img
                alt="Real fishing crew on deck"
                className="w-full h-[700px] object-cover rounded-2xl shadow-xl grayscale hover:grayscale-0 transition-all duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcmvF9s30TTJoN5-HpPIL4KGHUUy1QfNCK5BHF__VXUsL5qHtkT4a8ff7CGroWhwZhtRTahjXJlEIuBeZuif4LIDYb9oZs463UiC3LdGEhM20cw_08IE6gNjYZ4-Z7zZZTQr6WptmFEcwYqzmLvhr4uIb0QCBIIyzcw-E5wGjZLkTqjjGDliM2T93PZBiIEDBu5GMaGoRCHrA1rD0IAVTnl_fBcBrLZ-WP-X9PpWBK9Sdek_Ih3Dfg-4Vw0RSqj1HPo0YZtGqZJwU"
              />
              <div className="absolute -bottom-8 -right-8 bg-slate-900 p-10 rounded-2xl text-white max-w-sm shadow-2xl">
                <p className="italic-accent-caveat text-3xl leading-snug mb-6">
                  "This isn't just technology; it's a lifeline for those of us who live by the tide."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-px w-8 bg-primary" />
                  <p className="font-bold uppercase tracking-widest text-xs opacity-70">Mark Jansen, Crew Lead, Northern Star</p>
                </div>
              </div>
            </div>
            <div>
              <span className="text-primary font-bold uppercase tracking-[0.2em] text-sm mb-6 block">Journal Entry: Oct 2024</span>
              <h2 className="text-5xl font-black text-on-surface mb-8 tracking-tight leading-[1.1]">
                The Authenticity of the <br />Daily Haul.
              </h2>
              <div className="space-y-6 text-xl text-on-surface-variant font-medium" style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                <p>We've moved away from the glossy depictions of 'maritime' to focus on the grit of the deck. Authenticity isn't a marketing buzzword for us—it's the data we track every single morning at 4:00 AM.</p>
                <p>Our impact is measured in cold hard metrics: the number of crates that didn't go to waste, the diesel not burned, and the checks that cleared for the families who have fished these waters for four generations.</p>
              </div>
              <div className="mt-12">
                <button className="flex items-center gap-4 text-primary font-bold text-lg group">
                  View Raw Impact Data
                  <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_right_alt</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Methodology Accordion ── */}
        <section className="px-12 py-32 bg-surface-container-low">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-black text-on-surface mb-4">Methodology & Veracity</h3>
              <p className="text-on-surface-variant font-medium">Transparent data auditing standards.</p>
            </div>
            <div className="space-y-4">
              {ACCORDION_ITEMS.map((item, i) => (
                <div key={item.title} className="bg-white rounded-2xl border border-outline-variant/30 overflow-hidden">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === i ? null : i)}
                    className="w-full flex justify-between items-center p-8 cursor-pointer font-bold text-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    {item.title}
                    <span
                      className="material-symbols-outlined transition-transform duration-200"
                      style={{ transform: openAccordion === i ? 'rotate(180deg)' : 'none' }}
                    >
                      expand_more
                    </span>
                  </button>
                  {openAccordion === i && (
                    <div className="px-8 pb-8 text-on-surface-variant font-medium leading-relaxed">
                      {item.body}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Partners ── */}
        <section className="px-12 py-24 bg-white border-t border-outline-variant/20">
          <div className="max-w-7xl mx-auto">
            <p className="text-center text-outline font-bold uppercase tracking-widest text-xs mb-12">
              Collaborating with Authentic Coastal Stewards
            </p>
            <div className="flex flex-wrap justify-center items-center gap-16 opacity-40 grayscale">
              {['OCEANIC+', 'HARBOR.CO', 'TIDEWATER', 'MARITIME.A', 'ECO-PORT'].map(p => (
                <span key={p} className="text-2xl font-black tracking-tighter">{p}</span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
