const VALUES = [
  { icon: 'analytics', iconBg: 'bg-primary-container', iconColor: 'text-on-primary-container', title: 'Traceability', desc: 'Every catch is tracked from the specific GPS coordinate to the final delivery signature.', offset: false },
  { icon: 'payments', iconBg: 'bg-secondary-container', iconColor: 'text-on-secondary-container', title: 'Fair pay', desc: 'We cut out the middlemen to ensure harvesters take home 25% more than industry averages.', offset: true },
  { icon: 'recycling', iconBg: 'bg-tertiary-container', iconColor: 'text-on-tertiary-container', title: 'Zero waste', desc: 'Intelligent forecasting ensures we only harvest what is needed, reducing bycatch waste to near zero.', offset: false },
  { icon: 'waves', iconBg: 'bg-primary-container', iconColor: 'text-on-primary-container', title: 'Coastal community', desc: 'We reinvest 5% of profits into coastal preservation and local harbor infrastructure.', offset: true },
]

export default function About() {
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <main>
        {/* ── Hero ── */}
        <section className="relative px-6 py-20 lg:py-32 overflow-hidden">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <span className="font-accent text-2xl text-primary mb-4 block">Since 2018</span>
              <h1 className="text-6xl lg:text-8xl font-extrabold leading-[0.9] text-on-surface mb-8" style={{ letterSpacing: '-0.04em' }}>
                Built by people <br />who <span className="italic text-primary">love</span> the coast
              </h1>
              <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed">
                We started Finventory to bridge the gap between small-scale coastal harvesters and the world's most discerning kitchens.
              </p>
            </div>
            <div className="relative grid grid-cols-12 gap-4">
              <div className="col-span-7 pt-12">
                <img
                  className="rounded-lg shadow-2xl w-full h-80 object-cover hover:scale-[1.02] transition-transform duration-500"
                  alt="weathered fishing boat at dawn"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaGcmT4xkbM2CAh-0zHXdeKJ1TLklz7J6209T1RVTUfG4-cmZZY5yZ75mUC5OyWEP8uvYl0ZobGhASYnnnUb570svkaSwNrTtQiLNWOf8Zydz_w_yefpLOqQZps287Tqf_vaHrXwWmApe86W_WfuSgIs7nKsj7pEx43qtrmLNFQ80Gss2M5oEPsPMugcjXmGm2ESPhzEPF8b9J80B7f70kFDaxj1zqv9yFmhxiRpSybKzX7qkNBkjcp4bx8KxXAEnOt2unDYY6aTk"
                />
              </div>
              <div className="col-span-5">
                <img
                  className="rounded-lg shadow-xl w-full h-64 object-cover -mt-8 hover:scale-[1.02] transition-transform duration-500"
                  alt="chef plating fresh oysters"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBz3hPtKruK_-z519lqDTVb2Wr3vduGLQ5-fsdWKClyzVwVAOKq_9DMWMBvizD2cSBuPtrWNJ2uIAr8KFuy9q19wEGoJHrIjMwVsAfpYOmSd6PsN5A4MJBPxe8e4PBTgX-Qp1-uh8RQhRUw_2lesCiflFaX6KJF9yP0z9FYYuBoGl_PFR42elKXwH0Z79hgiSr7Y4rQNghYwYQZxP3oCwEMvvN4Izlmadwv4OscDECILqno149d898g06zF89hTe3rqVHQW0DEWQcY"
                />
              </div>
              <div className="col-span-12 -mt-12 px-12">
                <img
                  className="rounded-lg shadow-2xl w-full h-56 object-cover hover:scale-[1.02] transition-transform duration-500"
                  alt="vibrant coastal seafood market"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUeexc2_XNI2-RyQiri6jxMIDcQwGP8lDKerPkRIHcQHwYrhIUah7RM4vcvxNu1RDvHBqRLxCGmOXE3yKM6zQMj1K_FzaO6Y8AQPIcDGc3lrTXsM5BO5kM5pBqQZLjwvOe0H_pq4SZ7h1oFYNQ5e7hWMtP8SXGhq7hj_l28RyCKyR7kf9SX5ZGWL9Eo_4hJ8OAoqIixZkC0h8MpPzF9PLfPl3bh5Dif3g3oLR8O0XBMXZK4Tbe0REQiurTDfOvzCUf2lHzjc"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Wave divider */}
        <div className="w-full text-surface-container-low leading-[0]">
          <svg fill="currentColor" viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" />
          </svg>
        </div>

        {/* ── Story ── */}
        <section className="bg-surface-container-low px-6 py-24">
          <div className="max-w-3xl mx-auto">
            <p className="drop-cap text-on-surface-variant leading-relaxed mb-12 text-lg">
              It began with a simple observation at a harbor in Maine. While local chefs were clamoring for the morning's catch, the fishermen were struggling with antiquated logistics that favored industrial-scale volume over artisan-scale quality. We saw a future where technology didn't replace the human touch, but protected it.
            </p>
            <div className="my-16 flex flex-col items-center">
              <blockquote className="font-accent text-4xl text-primary text-center max-w-xl italic leading-tight">
                "The ocean doesn't have a clock. It has a rhythm. Our job is to listen to it and bring that honesty to every kitchen table."
              </blockquote>
            </div>
            <p className="text-on-surface-variant leading-relaxed mb-12 text-lg">
              Finventory was born from the belief that transparency is the most important ingredient. By connecting the dots directly from boat to kitchen, we ensure that every piece of seafood has a story, a face, and a legacy.
            </p>
            <div className="grid grid-cols-2 gap-8 my-16">
              <img
                className="rounded-lg shadow-lg rotate-1 hover:rotate-0 transition-transform duration-500"
                alt="weathered hands mending fishing net"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeq_X6W33dmjHEiMhKDzLLANmdrS37S43psr-cDeZoZU4ep6vUhhpvh__1KXCFYgYu2s3CzCBi2D5fYFbOjmww4iWwe5dWZ-aCik1GCBi2D5fYFbOjmww4iWwe5dWZ-aCik1GhI8i27Z8-SeX1o8M46HAiMyn9Ow58I10Mf6VSzs9jrHquiWvI2ub5HjU4X_0UQoaRtV_1RIAF3BxqwKIPobNsRUGE6oC8UeScKXb94vsnH6Tp4QYqKgw7y862HgmTJKtn0-LccVbUND3jIY9QWUkZ_IAS_Qx29HQ3n0wU"
              />
              <img
                className="rounded-lg shadow-lg -rotate-2 hover:rotate-0 transition-transform duration-500"
                alt="chef drizzling oil over seared scallop"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5VQS1Y-VIiDuMEddI2UckpX9cup-s5bX7mbb53JlAeFKRMmW2CvtIDxjVAls4gCuVYmNRaF2RiBZ6-jQyJS4oerIPqX1j_tCALfdqi_IyZphVzYmmEdWaKn-UuiBVRdMK898BXvP3l9j7sksD5zDVV7CW1Sxx-TsHvtrZP3apEfmb3Fy9JLfOOWhOUif_NoNZJr1jUHvRcPBApf6tfqrdUkfOwHxiV2jpOUsl2Xfco8q8s9uh-6zVS4osJB5MyLnaW3bsB_eEZO4"
              />
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="px-6 py-24 bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-16">
              <div>
                <span className="font-accent text-2xl text-secondary mb-2 block">Our North Star</span>
                <h2 className="text-5xl font-extrabold tracking-tighter">Anchored in Values</h2>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {VALUES.map(v => (
                <div
                  key={v.title}
                  className={`p-8 bg-surface-container-lowest rounded-lg shadow-[0_20px_40px_rgba(0,95,147,0.06)] hover:translate-y-[-8px] transition-all duration-300 ${v.offset ? 'lg:mt-8' : ''}`}
                >
                  <div className={`w-12 h-12 ${v.iconBg} rounded-full flex items-center justify-center ${v.iconColor} mb-6`}>
                    <span className="material-symbols-outlined">{v.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{v.title}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-6 py-32 bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="bg-tertiary-fixed rounded-xl p-12 lg:p-20 flex flex-col lg:flex-row items-center justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <span className="material-symbols-outlined" style={{ fontSize: '10rem' }}>anchor</span>
              </div>
              <div className="z-10 text-center lg:text-left mb-12 lg:mb-0">
                <h2 className="text-4xl lg:text-6xl font-black text-on-tertiary-fixed leading-tight mb-6 tracking-tight">
                  Ready to join <br />the crew?
                </h2>
                <p className="text-on-tertiary-fixed-variant text-xl max-w-md">
                  We're always looking for stewards of the sea and tech visionaries.
                </p>
              </div>
              <div className="z-10">
                <button className="bg-on-tertiary-fixed text-white px-10 py-5 rounded-full text-xl font-bold hover:scale-105 transition-transform shadow-lg">
                  Come work with us
                </button>
              </div>
            </div>

            <div className="mt-24 text-center">
              <p className="text-outline-variant font-bold uppercase tracking-[0.2em] text-xs mb-10">As featured in</p>
              <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-20 opacity-40 grayscale">
                <span className="text-2xl font-serif italic">The Daily Tide</span>
                <span className="text-2xl font-bold uppercase tracking-tighter">Ocean Quarterly</span>
                <span className="text-2xl font-bold italic-accent-caveat">Harbor Post</span>
                <span className="text-2xl font-sans font-extrabold">MARITIME</span>
                <span className="text-2xl font-serif tracking-widest">BEACON</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
