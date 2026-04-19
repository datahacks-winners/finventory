import { useState } from 'react'

const API_BASE = 'https://calcofi-api-270168887424.us-central1.run.app'

const DEFAULT_FEATURES = {
  year: 2020,
  month_sin: 0.5,
  month_cos: 0.866,
  latitude: 33.5,
  longitude: -118.2,
  species_id: 1,
  tow_type_code: 1,
  log_volume_sampled: 3.2,
  standard_haul_factor: 1.0,
  log_matched_eggs: 0.5,
  frac_past_flexion: 0.3,
  mean_larva_size_mm: 2.5,
  bot_sst_100m: 14.2,
  bot_sal_100m: 33.8,
  bot_sigma_100m: 25.5,
  bot_o2_100m: 4.5,
  bot_chla_100m: 0.8,
  bot_po4_100m: 1.2,
  bot_no3_100m: 8.5,
  bot_sio3_100m: 12.0,
  bot_mld_05: 25.0,
  bot_strat_dT: 2.1,
  bot_chla_max: 1.5,
  bot_chla_int: 45.0,
  bot_o2_min_200: 2.5,
  bot_nitracline: 50.0,
  cast_wind_spd: 5.5,
  cast_wind_dir: 270,
  cast_barom: 1013.25,
  cast_dry_t: 18.5,
  cast_wet_t: 16.2,
  cast_secchi: 15.0,
}

const KEY_FEATURES = [
  { key: 'latitude', label: 'Latitude', min: 32, max: 42, step: 0.1 },
  { key: 'longitude', label: 'Longitude', min: -125, max: -117, step: 0.1 },
  { key: 'bot_sst_100m', label: 'Bottom Temp (°C)', min: 8, max: 22, step: 0.1 },
  { key: 'bot_sal_100m', label: 'Salinity (PSU)', min: 33, max: 34.5, step: 0.01 },
  { key: 'bot_o2_100m', label: 'Oxygen (ml/L)', min: 2, max: 8, step: 0.1 },
  { key: 'bot_chla_100m', label: 'Chlorophyll (mg/m³)', min: 0.1, max: 10, step: 0.1 },
  { key: 'year', label: 'Year', min: 2000, max: 2025, step: 1 },
  { key: 'species_id', label: 'Species ID', min: 1, max: 50, step: 1 },
]

export default function CalcofiInference() {
  const [features, setFeatures] = useState(DEFAULT_FEATURES)
  const [history, setHistory] = useState([2.5, 2.6, 2.4, 2.7, 2.5, 2.3, 2.6, 2.8])
  const [horizon, setHorizon] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [xgbResult, setXgbResult] = useState<number | null>(null)
  const [olsResult, setOlsResult] = useState<number | null>(null)
  const [forecastResult, setForecastResult] = useState<number[] | null>(null)
  const [activeTab, setActiveTab] = useState<'xgb' | 'ols' | 'forecast'>('xgb')

  const updateFeature = (key: string, value: number) => {
    setFeatures(f => ({ ...f, [key]: value }))
  }

  const predictXGB = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/v1/predict/xgb-binned-5yr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setXgbResult(data.log1p_mean_larvae_10m2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const predictOLS = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/v1/predict/ols-binned-10yr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setOlsResult(data.log1p_mean_larvae_10m2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const predictForecast = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/v1/forecast/timesfm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, horizon, variant: 'binned_5yr' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setForecastResult(data.point_forecast)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Forecast failed')
    } finally {
      setLoading(false)
    }
  }

  const runInference = () => {
    if (activeTab === 'xgb') predictXGB()
    else if (activeTab === 'ols') predictOLS()
    else predictForecast()
  }

  return (
    <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/30">
      <div className="mb-6">
        <h3 className="text-2xl font-black text-on-surface mb-2">CalCOFI ML Inference</h3>
        <p className="text-on-surface-variant text-sm">
          Predict larval fish density using oceanographic features from CalCOFI survey data.
        </p>
      </div>

      {/* Model Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'xgb', label: 'XGBoost', desc: '5-year bins' },
          { key: 'ols', label: 'OLS', desc: '10-year bins' },
          { key: 'forecast', label: 'TimesFM', desc: 'Time-series' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            {tab.label}
            <span className="block text-[10px] font-normal opacity-70">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Feature Inputs */}
      {activeTab !== 'forecast' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {KEY_FEATURES.map(f => (
            <div key={f.key}>
              <label className="text-xs font-bold text-outline uppercase block mb-1">
                {f.label}
              </label>
              <input
                type="number"
                min={f.min}
                max={f.max}
                step={f.step}
                value={features[f.key as keyof typeof features]}
                onChange={e => updateFeature(f.key, parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-surface-container-highest rounded-lg text-sm border border-outline-variant/30 focus:border-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-outline uppercase block mb-1">
              History (comma-separated CPUE values)
            </label>
            <textarea
              value={history.join(', ')}
              onChange={e => setHistory(e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)))}
              rows={3}
              className="w-full px-3 py-2 bg-surface-container-highest rounded-lg text-sm border border-outline-variant/30 focus:border-primary focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-outline uppercase block mb-1">
              Horizon (steps)
            </label>
            <input
              type="number"
              min={1}
              max={256}
              value={horizon}
              onChange={e => setHorizon(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-surface-container-highest rounded-lg text-sm border border-outline-variant/30 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={runInference}
        disabled={loading}
        className="w-full md:w-auto px-6 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Running Inference...' : 'Run Prediction'}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-error-container text-on-error-container rounded-lg text-sm">
          Error: {error}
        </div>
      )}

      {/* Results */}
      {activeTab === 'xgb' && xgbResult !== null && (
        <div className="mt-6 p-6 bg-primary-container rounded-xl">
          <div className="text-xs font-bold text-on-primary-container uppercase mb-1">XGBoost Prediction</div>
          <div className="text-4xl font-black text-on-primary-container">
            {xgbResult.toFixed(3)}
          </div>
          <div className="text-sm text-on-primary-container/70">log₁ₚ(mean larvae / 10m²)</div>
        </div>
      )}

      {activeTab === 'ols' && olsResult !== null && (
        <div className="mt-6 p-6 bg-secondary-container rounded-xl">
          <div className="text-xs font-bold text-on-secondary-container uppercase mb-1">OLS Prediction</div>
          <div className="text-4xl font-black text-on-secondary-container">
            {olsResult.toFixed(3)}
          </div>
          <div className="text-sm text-on-secondary-container/70">log₁ₚ(mean larvae / 10m²)</div>
        </div>
      )}

      {activeTab === 'forecast' && forecastResult !== null && (
        <div className="mt-6 p-6 bg-tertiary-container rounded-xl">
          <div className="text-xs font-bold text-on-tertiary-container uppercase mb-3">TimesFM Forecast</div>
          <div className="flex flex-wrap gap-2">
            {forecastResult.map((v, i) => (
              <div key={i} className="px-3 py-2 bg-surface-container-high rounded-lg">
                <div className="text-xs text-outline">+{i + 1}</div>
                <div className="font-bold text-on-tertiary-container">{v.toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="text-sm text-on-tertiary-container/70 mt-3">log₁ₚ(CPUE) forecast</div>
        </div>
      )}
    </div>
  )
}
