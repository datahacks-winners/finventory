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
                { value: 184200, suffix: ' lb', label: 'Rescued Surplus', color: 'text-primary-fixed' },
                { value: 92, suffix: ' Tons', label: 'CO2 emissions avoided', color: 'text-secondary-fixed' },
                { value: 420000, prefix: '$', suffix: '', label: 'Direct Fisher Revenue', color: 'text-tertiary-fixed' },
              ].map(s => (
                <div key={s.label}>
                  <div className={`text-5xl font-black mb-2 ${s.color}`}>
                    <AnimatedNumber
                      value={s.value}
                      suffix={s.suffix}
                      prefix={s.prefix}
                      separator=","
                      duration={2.5}
                    />
                  </div>
                  <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-300">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Charts ── */}
        <section className="px-12 py-20 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <span className="italic-accent-caveat text-primary text-2xl block mb-2">CalCOFI Survey Data</span>
              <h2 className="text-4xl font-black tracking-tight text-on-surface">Warming Oceans, Fewer Fish</h2>
              <p className="text-on-surface-variant mt-4 max-w-2xl">
                CalCOFI larval egg surveys show egg density declining sharply beyond 14°C. As the Pacific warms, spawning success falls — making every rescued pound of existing catch more critical than ever.
              </p>
              <p className="text-on-surface-variant mt-3 max-w-2xl text-sm">
                By reducing the amount of fish that gets thrown away, we cut the greenhouse gas emissions tied to food waste decomposition — emissions that accelerate the ocean warming driving down clutch sizes across Pacific spawning grounds.
                Research confirms that climate-driven sea surface temperature rise is a primary stressor on marine reproductive output; every pound rescued is a pound that doesn't rot in a landfill and compound that pressure.
              </p>
              <a
                href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8618751/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs font-bold text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
              >
                Source: Jacox et al., PMC8618751 — Climate forcing of Pacific fish populations
              </a>
            </div>
            <div className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/20">
              <p className="text-xs font-bold uppercase tracking-widest text-outline mb-4">Egg Density vs. Surface Temperature</p>
              <TempBinsChart className="w-full" />
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

        {/* ── Impact cards ── */}
        <section className="px-12 py-32 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: 'eco', iconBg: 'bg-primary/10', iconColor: 'text-primary',
                  title: 'Ocean Conservation',
                  desc: 'By redirecting surplus catch before it hits landfills, we maintain the delicate nitrogen balance of coastal shelf ecosystems.',
                  metric: 82, suffix: '%', metricLabel: 'Efficiency Increase', metricColor: 'text-primary',
                },
                {
                  icon: 'distance', iconBg: 'bg-secondary/10', iconColor: 'text-secondary',
                  title: 'Logistics Precision',
                  desc: 'Our routing algorithms eliminate cold-chain gaps, reducing the average transport distance by 314 miles per shipment.',
                  metric: 314, suffix: 'mi', metricLabel: 'Avg. Saved per Haul', metricColor: 'text-secondary',
                },
                {
                  icon: 'payments', iconBg: 'bg-tertiary/10', iconColor: 'text-tertiary',
                  title: 'Community Capital',
                  desc: 'Profit redirection back to independent fishers, ensuring the survival of heritage fishing fleets across New England.',
                  metric: 14, prefix: '+', suffix: '%', metricLabel: 'Net Margin Increase', metricColor: 'text-tertiary',
                },
              ].map(card => (
                <div key={card.title} className="bg-surface-container-low p-10 rounded-2xl flex flex-col justify-between h-full border border-outline-variant/30">
                  <div>
                    <div className={`w-12 h-12 ${card.iconBg} ${card.iconColor} rounded-lg flex items-center justify-center mb-6`}>
                      <span className="material-symbols-outlined">{card.icon}</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{card.title}</h3>
                    <p className="text-on-surface-variant leading-relaxed">{card.desc}</p>
                  </div>
                  <div className="mt-8 pt-6 border-t border-outline-variant/30">
                    <span className={`text-3xl font-black ${card.metricColor}`}>
                      <AnimatedNumber
                        value={card.metric}
                        prefix={card.prefix}
                        suffix={card.suffix}
                        duration={2}
                      />
                    </span>
                    <span className="text-sm font-bold text-outline block mt-1">{card.metricLabel}</span>
                  </div>
                </div>
              ))}
            </div>
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
