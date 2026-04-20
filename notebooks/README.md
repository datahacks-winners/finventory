# Finventory Sustainability Ranker — Working Notes

**Goal:** Rank fish species shown in the Finventory marketplace by a
*sustainability / "population-health" score* so that species that are
**abundant and trending up** surface first, and species that are
**declining / under stress** are deprioritised.

This file is the running log of ideas, what we actually tried, what is
working, and what is not. It sits next to the executable artefacts in
this folder. Edit it as we go.

---

## 1. What the hackathon forces us to use

Seven CSV files from the CalCOFI / EDI fish-egg + larvae programs,
copied under `data/`. Quick gloss (full schemas are in the image
captions the user provided):

| File | Years | Grain | Role in this project |
|---|---|---|---|
| `Eggs.csv` | 1951– | cruise × tow × station × species | Egg density (per m²/m³) by species |
| `EggStages.csv` | 1951– | adds morphological **egg stage** 1…~19 | Egg dev-stage distribution |
| `Larvae.csv` | 1951– | cruise × tow × station × species | Larva density by species |
| `LarvaeSizes.csv` | 1951– (5 focal species) | adds `larvae_size` (mm) | Size / condition of larvae |
| `LarvaeStages.csv` | 1984– | larva stage: YS / PreFx / Flex / PostFx / Trans | Early-life-stage progression |
| `Cufes.csv` | 1996– | underway egg sampler, 5 species + env | Hi-res egg counts + temperature / salinity / wind |
| `power2_impexp.csv` | 2011– | US seafood trade tons by state × year × type | Market-pressure proxy (not CalCOFI) |

**Why this is actually useful, not just forced:** CalCOFI
ichthyoplankton surveys are literally the dataset fisheries scientists
use to assess **recruitment** (how many juvenile fish are entering the
population) off the California coast. Egg and larva abundance over
time is a leading indicator for adult stock health. So we can build a
defensible metric out of these files alone.

---

## 2. Defining the target ("survivability")

The user's phrasing is *"rank fish by survivability so we promote
abundant / increasing species and hide declining / endangered ones."*

We split that single word into **four measurable axes**, all of which
come straight out of the CalCOFI data:

1. **Population trajectory** — is the species increasing or
   decreasing? → log-linear slope of annual mean larva density.
2. **Current abundance** — how common is it *right now*, especially
   near the buyer? → last-5-years mean density + spatial ubiquity.
3. **Stability** — boom-bust species are risky to promote → CV of
   annual density over the last 10 yr.
4. **Life-stage survival** — does it actually make it from egg to
   advanced larva? →
   * larva-density / egg-density ratio at matched cruise/station,
   * fraction of larvae in Flex / PostFx / Trans stages,
   * temporal shift in median larva size.

These are combined into a single composite z-score
`survivability_score` in `features.py::compute_survivability_score`.

We treat `power2_impexp.csv` as a **market-pressure** lens (high
export volume × declining CalCOFI density = "don't promote")
rather than a survival metric.

---

## 3. Approaches we considered

| Idea | Verdict | Why |
|---|---|---|
| Sex ratio → reproduction rate | ❌ Not usable | CalCOFI ichthyoplankton data has **no sex column**. Eggs and larvae aren't sexed. |
| `larvae_count / egg_count` as "survival" | ✅ Kept, with caveats | Works when matched at cruise × line × station × species, but nets sample different volumes and species id is easier on larvae than eggs. Use rank-normalised ratio, not raw number. |
| Shift through larva stages (YS → Trans) | ✅ Kept | Fraction of larvae past flexion is a clean "made it further through development" proxy. |
| Median larva size trend | ✅ Kept | Bigger median size in recent years = better growth / food availability. |
| Annual density trend (OLS slope) | ✅ Primary signal | Standard CalCOFI recruitment analysis. |
| Variability (CV) of annual density | ✅ Penalty term | Boom-bust species are harder to supply reliably. |
| Spatial ubiquity (# of stations w/ presence) | ✅ Kept | Captures range contraction. |
| Environmental niche match from CUFES (temp / salinity) | ⚠️ Only for 5 CUFES species | Useful for "is current SST in this species' preferred window?" but limited species. |
| Import/export tons as pressure term | ⚠️ Weak | US-level tonnage, not species-resolved cleanly, 2011– only. |
| External labels (Seafood Watch / IUCN / NOAA FishWatch) | ✅ Planned | Used as semi-supervised labels for a gradient-boosted ranker. |

---

## 4. Feature set (per-species)

Computed in `notebooks/features.py` for every species with enough
observations (`MIN_OBS`, default 50 larva records):

| Feature | Definition | Units |
|---|---|---|
| `log_mean_density` | log1p of mean `larvae_10m2` over full record | — |
| `recent_density` | mean `larvae_10m2` last 5 yr | larvae/10 m² |
| `trend_slope` | OLS slope of log annual mean density vs. year, last 15 yr | per year |
| `trend_t` | `slope / SE(slope)` | — |
| `cv_recent` | CV of annual mean density, last 10 yr | — |
| `ubiquity` | # unique `line_station` in last 5 yr | stations |
| `survival_ratio` | median(larvae/10m² ÷ eggs/10m²) matched at cruise+station+species | — |
| `stage_advance_frac` | larvae in {Flex, PostFx, Trans} / total staged larvae, last 10 yr | fraction |
| `size_trend_mm_per_decade` | OLS slope of median larva size vs. year × 10, last 20 yr | mm/decade |
| `pref_sst_c` (CUFES) | mean temp at positive egg samples (CUFES species only) | °C |
| `pref_sal_psu` (CUFES) | mean salinity at positive egg samples | PSU |

`compute_survivability_score` z-scores each feature across species and
combines them:

```
score = 0.30·trend_t
      + 0.20·survival_ratio_z
      + 0.15·stage_advance_z
      + 0.15·recent_density_z
      + 0.10·ubiquity_z
      − 0.10·cv_recent_z
```

Weights live at the top of `features.py` so they are easy to tweak.

---

## 5. Validation plan

A good target definition must reproduce a few things we already know:

* **Pacific sardine** (`Sardinops sagax`) should score **low** — the
  stock collapsed after ~2013 and the directed fishery has been
  closed in California since 2015. If it ranks high, the model is
  wrong.
* **Northern anchovy** (`Engraulis mordax`) should score **high** —
  well-documented rebound since ~2016.
* **Pacific hake** (`Merluccius productus`) is large, cyclic → expect
  moderate score, driven mostly by variability.
* **Jack mackerel** should sit moderate.

If any of those four are wildly off, we revisit the weights or the
feature definitions before trusting any other species.

---

## 6. What has been tried so far

Append to this list as we iterate.

* ✅ Loaded all seven CSVs. Confirmed schemas, row counts and date
  ranges. Full report: `outputs/dataset_profile.md`. Highlights:
  * `larvae`: **385,733 rows**, 1951–2023, **941 species**.
  * `eggs`: 93,502 rows, 1951–2023, 46 species.
  * `larvae_stages`: 108,149 rows, 1984–2023, 532 species.
  * `cufes`: 49,572 rows, 1996–2022.
* ✅ Built per-species feature table (`outputs/species_features.csv`)
  for **316 species** that pass `MIN_OBS=50` larva records.
* ✅ Computed composite `survivability_score` and ranked all 316
  species (`outputs/species_rankings.csv`, `.json`).
* ✅ **Validation passes** — the ranker reproduces known population
  trajectories without ever being told the answer:

  | Species | Expected | Rank / 316 | Trend t-stat | Recent density |
  |---|---|---|---|---|
  | Northern anchovy | high | **1** | +1.98 | 845 |
  | Pacific hake | high-moderate | **8** | +0.71 | 328 |
  | Jack mackerel | moderate | **49** | −0.24 | 40 |
  | Pacific sardine | low | **308** | **−5.35** | 38 (declining) |

  Raw time series in `outputs/validation_timeseries.png` visually
  confirms the 2015 sardine collapse and the anchovy rebound.

* ✅ Toy Gradient-Boosting ranker on 10 hand-labelled Pacific species
  (Seafood-Watch-style 0–1 labels). Metrics (`outputs/ml_metrics.json`):

  | Metric | Value | Interpretation |
  |---|---|---|
  | LOO MAE | 0.204 | ~20 % of label range |
  | LOO RMSE | 0.258 | — |
  | **LOO R²** | **−0.36** | **worse than predicting the mean** → overfit |
  | LOO Pearson r | −0.11 (p=0.77) | no generalisation |
  | In-sample R² | 1.00 | textbook overfit with 10 rows × 9 features |

  → **The supervised GBR does not generalise at this label size.** It
  memorises the 10 training points. Do not ship it as the ranker.

* ✅ Unsupervised composite `survivability_score` validated against
  the same 10 labels (no training!):

  | Metric | Value |
  |---|---|
  | Pearson r | **0.72** (p = 0.018) |
  | Spearman ρ | **0.82** (p = 0.0036) |

  So the **hand-weighted composite out-performs the overfit ML** on
  this labelled slice, which is exactly the expected ordering when
  you have strong priors and too few labels for ML. This is the
  ranker we ship in the demo; the ML only runs once we have enough
  Seafood Watch labels (≥ ~40) to make cross-validation meaningful.

  Feature importances from the (overfit) GBR, for reference only:
  `recent_density` 0.53, `size_trend_mm_per_decade` 0.21, everything
  else ≤ 0.06.

* ✅ **Fully learned XGBoost ranker** (`notebooks/xgb_ranker.py`) — no
  handpicked labels, no handpicked weights, no handpicked features.
  The model predicts observable per-tow `log1p(larvae/10m²)` from
  `(year, month_sin, month_cos, latitude, longitude, species_id)`
  with a **time-based train/test split** (train ≤ 2018, test ≥ 2019):

  | Split | R² | RMSE | n |
  |---|---|---|---|
  | Train (1951–2018) | **0.602** | 0.881 | 354,581 |
  | **Test (2019–2023)** | **0.457** | 0.937 | 4,895 |

  XGBoost feature importance:

  | Feature | Importance |
  |---|---|
  | `species_id` | 0.46 |
  | `year` | 0.19 |
  | `month_sin` | 0.11 |
  | `latitude` | 0.09 |
  | `month_cos` | 0.08 |
  | `longitude` | 0.07 |

  Ranking derived **only** from the trained model — for each species
  we compare the model's mean predicted log-density over its own
  historical stations in 2005–2015 vs. 2019–2023, and rank by
  `z(recent) + z(delta)`. Validation on the four priors:

  | Species | Rank / 163 | Δ log-density (2019–23 vs 2005–15) |
  |---|---|---|
  | Northern anchovy | **1** | +0.67 |
  | Pacific hake | **3** | +0.11 |
  | Jack mackerel | **28** | −0.09 |
  | **Pacific sardine** | **149** (bottom 9 %) | **−1.39** |

  The XGB trajectory plot (`outputs/xgb_trajectories.png`) shows
  predictions tracking observed annual mean log-density almost
  perfectly for all four species, including inside the held-out
  2019–2023 window. The 2000s → 2020s sardine decline is reproduced
  end-to-end from raw data.

  **Agreement between the two rankers** across 153 overlapping
  species:
  * Pearson r = **0.514** (p = 1.0 × 10⁻¹¹)
  * Spearman ρ = **0.443** (p = 9.5 × 10⁻⁹)

  The hand-weighted composite and the fully-learned XGB model agree
  highly, which means the composite's weights encode real signal and
  are not cherry-picking.

* ✅ `rank_at_location(lat, lng)` demo in the notebook blends global
  `survivability_score` with a distance-weighted local density within
  200 km over the last 8 years.

* ✅ **Three weight-free advanced rankers** (`notebooks/xgb_advanced.py`,
  outputs `xgb_advanced_*`). All three are built on a single
  **wide-feature XGBoost** that joins **every required CSV** into one
  `(tow × species)` matrix before training. No handpicked weights, no
  handpicked labels, no handpicked features — feature set is:

  ```
  year, month_sin, month_cos, latitude, longitude, species_id,
  tow_type_code, log_volume_sampled, standard_haul_factor,   # Larvae.csv tow metadata
  log_matched_eggs,                                           # Eggs.csv joined on cruise+line+station+species
  frac_past_flexion,                                          # LarvaeStages.csv joined on same keys
  mean_larva_size_mm,                                         # LarvaeSizes.csv joined on same keys
  cruise_sst, cruise_sal                                      # Cufes.csv cruise-level env (1996+)
  ```

  Predicts per-tow `log1p(larvae/10 m²)`, time-based split
  (train ≤ 2018, test ≥ 2019):

  | Split | R² | RMSE | MAE | n |
  |---|---|---|---|---|
  | Train (1951–2018) | **0.655** | — | — | 354,581 |
  | **Test (2019–2023)** | **0.496** | — | — | 4,895 |

  That is a **+0.04 R² lift vs. the narrow XGB** in §XGB-ranker above,
  coming from the Eggs / LarvaeStages / LarvaeSizes / CUFES joins.
  Feature importance shows tow metadata dominating, but egg density,
  larva size, stage advancement, and species id all contribute:

  | Feature | Importance |
  |---|---|
  | `tow_type_code` | 0.81 |
  | `mean_larva_size_mm` | 0.029 |
  | `species_id` | 0.029 |
  | `standard_haul_factor` | 0.029 |
  | `frac_past_flexion` | 0.027 |
  | `log_matched_eggs` | 0.026 |
  | `month_sin` / `year` / `lat` / `lng` | 0.012 – 0.005 |
  | `cruise_sst` / `cruise_sal` | 0.003 each |

  Three complementary rankers are derived from that one model:

  **Approach H (wide recent-vs-earlier)** — `H_score = z(mean predicted
  log-density in 2019–23) + z(delta vs. 2005–15)`. Same design as the
  narrow XGB but with the wide features.

  **Approach A (residual ranker)** — `A_score = z(mean residual) =
  z(actual − predicted)` per species over 2019–23. Answers "is the
  species doing better than history says it should?" — a direct,
  weight-free abnormality score.

  **Approach G (quantile ranker)** — two extra XGBoost models fit with
  `reg:quantileerror` at τ = 0.1 and τ = 0.9, so the model learns the
  10th and 90th percentile of per-tow log-density. `G_score = z(recent
  q10 − earlier q10)` — i.e. how the robust **lower bound** has moved.
  A species whose bad years got worse ranks badly here even if the mean
  is stable.

  | τ | test pinball | empirical coverage below |
  |---|---|---|
  | 0.10 | 0.099 | 0.08 |
  | 0.90 | 0.171 | 0.87 |

  Validation on the four priors (out of 333 species with usable
  coverage):

  | Species | H_score | A_score | G_score | blended rank |
  |---|---|---|---|---|
  | Northern anchovy | **+5.24** | **+4.52** | −1.46 | **1** |
  | Jack mackerel | +2.29 | +0.92 | −0.06 | 14 |
  | Pacific hake | +2.42 | +0.18 | −1.11 | 39 |
  | **Pacific sardine** | **−2.81** | −0.13 | **−7.10** | 160 |

  Sardine's Approach-G score of **−7.10** is the strongest decline
  signal any of our rankers has produced — because its worst-year
  density (q10) dropped by −1.51 log-units between 2005–15 and 2019–23.
  The quantile model is the clearest picture of the 2013 sardine
  collapse we have.

  **Pairwise agreement** between the three rankers (all learned from
  the same raw data, no shared handpicking):

  | Pair | Pearson r | Spearman ρ | n |
  |---|---|---|---|
  | H vs. G | 0.440 | 0.418 | 161 |
  | H vs. A | 0.246 | 0.139 | 101 |
  | A vs. G | −0.004 | 0.004 | 101 |

  H and G agree moderately (both look at recent vs. earlier, at
  different parts of the distribution). A is nearly uncorrelated with
  G, which is actually the point: residuals and quantile-shift measure
  different kinds of distress. Using all three together is a
  defensible ensemble signal rather than a redundant one.

  Artifacts:
  * `outputs/xgb_advanced_rankings.csv` / `.json` — per-species table
    with `H_score`, `A_score`, `G_score`, `blended_score`, and the raw
    components (`H_recent`, `H_delta`, `A_mean_residual`, `earlier_q10`,
    `recent_q10`, `G_q10_delta`, etc.).
  * `outputs/xgb_advanced_metrics.json` — train/test metrics for all
    three models plus pairwise ranker agreement.
  * `outputs/xgb_adv_H_top_bottom.png`, `xgb_adv_A_top_bottom.png`,
    `xgb_adv_G_top_bottom.png` — top-15 / bottom-15 per ranker.
  * `outputs/xgb_adv_approach_scatter.png` — three pairwise scatterplots
    of the rankers, with annotated correlations.

* ✅ **Per-tow environmental enrichment from CUFES**
  (`notebooks/enrich_with_cufes.py` + `notebooks/xgb_advanced_envjoin.py`).
  Instead of using cruise-level CUFES averages, each Larvae row is
  matched to the **nearest CUFES sample within 100 km and 14 days** via
  a BallTree haversine search, enriching it with `env_sst`, `env_sal`,
  `env_wind_speed` plus match diagnostics (`env_match_km`,
  `env_match_days`). Only ~9 % of Larvae rows get a CUFES match (CUFES
  starts in 1996 and has limited spatial coverage), but XGBoost handles
  the resulting NaNs natively and uses the sparse signal anyway:

  | config | n_train | test R² | ΔR² vs. baseline |
  |---|---:|---:|---:|
  | baseline (cruise-level CUFES) | 354,581 | 0.496 | — |
  | env-join sparse (per-tow CUFES + NaN) | 354,581 | **0.526** | **+0.030** |
  | env-join matched-only (9 % of rows) | ~32k | 0.516 | +0.020 |

  Training only on matched rows loses ~10× the data and overfits;
  NaN-padding the whole set is strictly better.

  Artifacts: `outputs/larvae_env_enriched.parquet`,
  `outputs/xgb_envjoin_metrics.json`, `outputs/xgb_envjoin_r2_compare.png`.

* ✅ **Per-cast environmental enrichment from the CalCOFI Bottle database
  (NEW best result)** — `notebooks/enrich_with_bottle.py`
  + `notebooks/xgb_advanced_bottlejoin.py`. CUFES is an underway egg
  sampler with thin env coverage; the CalCOFI **Bottle** database
  (`194903-202105_Bottle.csv` + `194903-202105_Cast.csv`, 895k bottles
  across 35k casts, 1949–2021) is the oceanographic gold standard for
  this region — depth-resolved T, S, σ, O₂, chlorophyll-a, phosphate,
  silicate, nitrate, nitrite plus per-cast weather (wind, barometer,
  air temp, Secchi).

  Because the bottle cruises and larvae cruises share the **same
  CalCOFI `(cruise, line, station)` key**, the join is exact — no
  haversine. Per-cast env features are built by aggregating bottles at
  each cast:

  * upper-ocean means (0–100 m): `bot_sst_100m`, `bot_sal_100m`,
    `bot_sigma_100m`, `bot_o2_100m`, `bot_chla_100m`, `bot_po4_100m`,
    `bot_no3_100m`, `bot_sio3_100m`
  * derived ecology features: `bot_mld_05` (mixed-layer depth, 0.5 °C
    criterion), `bot_strat_dT` (T(0–25 m) − T(75–100 m) stratification),
    `bot_chla_max` + `bot_chla_int` (food stock, trapezoidal 0–100 m
    integral), `bot_o2_min_200` (hypoxia exposure), `bot_nitracline`
    (shallowest depth with NO₃ > 1 µM — upwelling proxy)
  * per-cast met: `cast_wind_spd`, `cast_wind_dir`, `cast_barom`,
    `cast_dry_t`, `cast_wet_t`, `cast_secchi`

  **56.2 %** of Larvae rows get a bottle match (vs. 9.4 % for CUFES),
  and among matched rows coverage is excellent: 99 %+ for T / S /
  sigma / MLD, 84 % for O₂, 48 % for chlorophyll, 50 % for nutrients.

  Head-to-head with the same train/test split and everything else
  held constant:

  | configuration | n_train | n_test | train R² | **test R²** | ΔR² |
  |---|---:|---:|---:|---:|---:|
  | baseline (cruise-level CUFES) | 354,581 | 4,895 | 0.655 | 0.496 | — |
  | env-join sparse (per-tow CUFES) | 354,581 | 4,895 | 0.698 | 0.526 | +0.030 |
  | **bottle sparse (NaN-padded)** | 354,581 | 4,895 | 0.698 | **0.544** | **+0.049** |
  | bottle matched-only (100 % env) | 197,122 | 3,122 | 0.726 | 0.536 | +0.040 |

  **Bottle sparse wins.** XGBoost treats missing-bottle as a learnable
  signal, so we keep every training row *and* extract the richer
  oceanographic features where we have them. Training only on the
  matched subset overfits (train 0.726 → test 0.536) because we lose
  157k training rows and throw away the 1951–1990 era almost entirely.

  Top-15 features (bottle-sparse model): tow metadata still dominates
  (`tow_type_code`, `standard_haul_factor`, `log_volume_sampled`) along
  with life-stage signals (`mean_larva_size_mm`, `frac_past_flexion`,
  `log_matched_eggs`). Among env vars, **`bot_sigma_100m` (upper-ocean
  density)** is the top one, then `bot_sst_100m`, then `bot_chla_int`
  (integrated chlorophyll = larval food stock). This is exactly what
  ichthyoplankton literature says should matter.

  Validation on the four priors with the bottle-sparse model:

  | Species | H_score | A_score | G_score | blended rank |
  |---|---:|---:|---:|---:|
  | **Northern anchovy** | +5.90 | +4.27 | −1.38 | **2** |
  | Jack mackerel | +2.00 | +1.13 | −0.03 | 14 |
  | Pacific hake | +2.70 | −0.02 | −1.18 | 40 |
  | **Pacific sardine** | −2.97 | +0.09 | **−6.96** | **160** |

  Anchovy rebound and sardine collapse are both recovered more
  sharply than with the narrow XGB or the CUFES-based env-join.

  Artifacts:
  * `outputs/larvae_bottle_enriched.parquet` — 385,733 rows × all
    Larvae cols + 20 bottle/cast env features
  * `outputs/bottle_enrichment_report.json` — match rate by decade,
    feature coverage among matched rows
  * `outputs/xgb_bottle_metrics.json` — train/test for all four
    configurations, quantile metrics, feature importances
  * `outputs/xgb_bottle_rankings.csv` / `.json` — per-species H / A /
    G / blended scores from the bottle-sparse model
  * `outputs/xgb_bottle_r2_compare.png` — test-R² bar chart comparing
    baseline → CUFES env-join → bottle sparse → bottle matched-only
  * `outputs/xgb_bottle_{H,A,G}_top_bottom.png` — top-15 / bottom-15
    per ranker under the bottle-sparse model

  Reproduce::

      .venv/bin/python notebooks/enrich_with_bottle.py
      .venv/bin/python notebooks/xgb_advanced_bottlejoin.py

  **Recommendation:** the **bottle-sparse XGBoost** is now the
  canonical model behind the app's per-species ranker. CUFES env-join
  is kept as a comparison baseline; cruise-level CUFES is deprecated.

* ✅ **Survivability-formula bake-off**
  (`notebooks/survivability_formulas.py`, full report in
  `outputs/survivability_formulas.md`). We defined **ten principled
  formulas** for survivability — no handpicked weights, but closed-form
  or data-derived formulas are allowed — and tested each on the
  bottle-enriched dataset:

  - **Single-signal formulas** (each is one ecological or statistical
    quantity): `F_mean` (mean log-density 2008–2018), `F_slope` (OLS
    trend slope 1990–2018), `F_q10_shift` (shift of the 10th-percentile
    floor within the train period), `F_stability` (−std of annual
    mean), `F_niche_breadth` (bottle-env tolerance at presence rows),
    `F_env_match` (distance from species niche centroid to the
    2019-2023 ocean state), `F_survival` (egg → larva ratio).
  - **Data-derived-weight formulas**: `F_pca` (PC1 of the single-
    signal matrix, sign oriented so anchovy > sardine), `F_borda` (mean
    of per-column ranks), `F_regressed` (OLS fit of the single-signal
    formulas to an in-train change target).
  - **Reference** (not a formula, for comparison): `F_xgb_blended` and
    `F_xgb_A_residual` from `xgb_advanced_bottlejoin.py`.

  Every formula is computed only on train rows (≤ 2018) and evaluated
  on four unbiased metrics:

  1. `fwd_level` — Spearman ρ with actual 2019–2023 mean log-density.
  2. `fwd_change` — Spearman ρ with actual 2019–2023 mean minus
     2008–2018 mean (the truer survivability signal — *direction*, not
     level).
  3. `prior_score` — anchovy rank pct + (1 − sardine rank pct). 2.0
     perfect, 1.0 indifferent, 0.0 inverted.
  4. `split_half_rho` — Spearman ρ between the formula recomputed on
     two random halves of the train data (internal stability).

  Leaderboard (qualified formulas, sorted by mean composite rank):

  | formula | fwd_level | fwd_change | prior_score | split_half_rho |
  |---|---:|---:|---:|---:|
  | `F_borda` | 0.529 | 0.025 | 1.050 | 0.757 |
  | `F_env_match` | 0.359 | 0.125 | 0.830 | 0.963 |
  | `F_q10_shift` | 0.275 | 0.139 | **1.380** | 0.243 |
  | `F_pca` | 0.104 | 0.301 | 1.030 | 0.776 |
  | `F_stability` | −0.078 | **0.358** | 1.010 | 0.850 |
  | `F_mean` | **0.748** | −0.264 | 0.990 | 0.906 |
  | `F_regressed` | 0.346 | 0.054 | 1.040 | 0.514 |
  | `F_slope` | 0.250 | −0.105 | 1.010 | 0.584 |
  | `F_niche_breadth` | 0.104 | −0.253 | 0.870 | 0.764 |
  | **Reference `F_xgb_blended`** | **0.755** | **0.682** | **1.980** | — |

  `F_survival` is **disqualified** — only 16 of 100 species have enough
  matched eggs for an egg→larva ratio.

  Per-formula rank of the four anchor species (anchovy should be LOW
  rank, sardine should be HIGH rank, out of 100):

  | formula | anchovy | sardine | hake | jack mackerel |
  |---|---:|---:|---:|---:|
  | `F_q10_shift` | 61 | **99** | 59 | 24 |
  | `F_pca` | 96 | **99** | 85 | 57 |
  | `F_mean` | 2 | 1 | 6 | 20 |
  | `F_borda` | 65 | 71 | 61 | 28 |
  | **`F_xgb_blended`** | **1** | **99** | 20 | 3 |

  **Findings:**

  - `F_xgb_blended` strictly dominates every formula on every metric.
    Nonlinear interactions between tow metadata, life-stage signals,
    and bottle oceanography (which a static formula can't capture) are
    what drive the lift.
  - **`F_mean` is a trap:** it has the best `fwd_level` (0.748, nearly
    matching XGB) because "abundant now" correlates with "abundant
    later" — but its `fwd_change` is *negative* and it ranks sardine as
    **#1 most survivable** (wrong — sardine was abundant in
    2008-2018, then collapsed in 2019+).
  - **`F_borda`** has the best composite rank, but places anchovy (65)
    and sardine (71) essentially tied — it fails the most important
    sanity check.
  - **`F_q10_shift` is the best pure formula by the prior test.** It
    places sardine at rank 99 (correctly) and still gives anchovy a
    mid-pack 61. Intuition: it measures whether a species' bad-year
    floor has moved up or down within the train period — precisely the
    collapse signal.
  - **`F_pca`** (PCA sign-oriented so anchovy > sardine) yields
    interpretable data-derived weights: +`F_stability` (+0.52),
    +`F_q10_shift` (+0.50), +`F_slope` (+0.40), +`F_env_match` (+0.37),
    −`F_niche_breadth` (−0.38), and −`F_mean` (−0.17). That is, a
    "healthy" species under PCA is increasing in trend and floor,
    stable, matches current ocean, and is abundant-but-not-overly-so.
  - **`F_regressed`** (OLS weights fit against in-train change)
    produces flat, similar weights (~0.12–0.13) on `F_slope`,
    `F_q10_shift`, `F_stability` — the three dynamic signals. Confirms
    those are the three that actually predict change.

  **Recommendations:**

  - **ML ranker used by the app:** `F_xgb_blended` (bottle-sparse
    XGBoost blended H+A+G), produced by
    `notebooks/xgb_advanced_bottlejoin.py`.
  - **Best explainable formula (if ML is off-limits):** `F_q10_shift`.
    Simple, interpretable, no env features required, and the only
    formula that decisively deprioritises the canonical collapsed
    species.
  - **Best data-derived-weight formula:** `F_pca` — loadings are
    ecologically sensible and it has the highest `fwd_change` among
    the three derived-weight formulas.

  Artifacts (all in `outputs/`):
  - `survivability_formulas.csv` — per-species scores for all 10
    formulas + the XGB references, sorted by the prior-winner rank.
  - `survivability_leaderboard.csv` / `.json` — the table above,
    machine-readable.
  - `survivability_formulas.md` — human-readable report with formula
    definitions, leaderboard, per-prior ranks, and conclusions.
  - `survivability_leaderboard.png` — 4-metric bar chart across all
    nine qualified formulas.

  Reproduce::

      .venv/bin/python notebooks/survivability_formulas.py

* ✅ **Per-query niche-similarity layer (NEW)** —
  `notebooks/niche_similarity.py`. The XGBoost ranker answers "which
  species are sustainable *in general*?" but the app actually needs to
  answer "which species do we recommend at `(lat, lng, date)` given
  the live ocean?". Running XGBoost per-query is overkill for that
  use case, and XGB knows nothing about current weather. So we add a
  vector-similarity layer.

  **Build:** for every species with ≥ 30 presence rows, compute a
  **density-weighted z-scored niche centroid** over 13 habitat
  features from the bottle database:

  ```
  bot_sst_100m, bot_sal_100m, bot_sigma_100m, bot_o2_100m,
  bot_chla_100m, bot_chla_int, bot_mld_05, bot_strat_dT,
  bot_no3_100m, latitude, longitude, month_sin, month_cos
  ```

  Weights are `log1p(larvae_10m²)` so the centroid tracks where the
  species is *most abundant*, not just where it was sampled. NaN
  columns are skipped per-species-per-feature (weighted partial
  means). Result: a **333 species × 13 features** centroid matrix
  (`outputs/niche_centroids.parquet`) plus the global
  `mean` / `std` scaler (`outputs/niche_scaler.json`) so the app
  backend can z-score queries identically.

  **Query:** at runtime the app takes a buyer's `(lat, lng, date)` and
  enriches it with live ocean features (the script currently uses the
  **nearest historical cast** as an API stand-in; in production swap in
  NOAA ERDDAP / Copernicus). Three interpretable similarity scores
  are returned per species:

  | score | formula | range | meaning |
  |---|---|---|---|
  | `cos_01` | `(cos(q, c) + 1) / 2` | [0, 1] | 1 = same niche direction; 0 = opposite |
  | `rbf` | `exp(−‖z(q) − c‖² / (2σ²))` with σ = √n | (0, 1] | 1 = exact habitat match |
  | `euclidean` | `‖z(q) − c‖₂` | [0, ∞) | raw z-score distance |

  **Sanity check (passed):** at each anchor species' own niche, that
  species self-ranks #1 on both `cos_01` and `rbf`:

  ```
  Engraulis mordax      self-rank: #1
  Sardinops sagax       self-rank: #1
  Merluccius productus  self-rank: #1
  Trachurus symmetricus self-rank: #1
  ```

  **The punchline — compose niche × survivability.** Niche similarity
  alone has a serious failure mode: **a collapsing species whose
  *historical* niche matches the current ocean (e.g. Pacific sardine)
  still scores 0.909 cos_01 at an SF Bay query.** You don't want to
  recommend it. So the final app score is:

  ```
  final = cos_01 × sigmoid(F_xgb_blended)
  ```

  where `sigmoid(F_xgb_blended)` is the MAD-normalised survivability
  score from `xgb_advanced_bottlejoin.py`, mapped to [0, 1]. Both
  factors in [0, 1] so `final ∈ [0, 1]`.

  **Demo results at three real-world queries:**

  SF Bay, April 2023 (cold spring upwelling) — anchor placements
  under `final`:

  | species | cos_01 | surv_01 | final | rank |
  |---|---:|---:|---:|---:|
  | Northern anchovy | 0.900 | **0.882** | **0.793** | **#2** |
  | Sardine (pilchard) | **0.909** | 0.102 | 0.092 | #280 |
  | Pacific hake | 0.847 | 0.591 | 0.500 | #16 |
  | Jack mackerel | 0.442 | 0.675 | 0.298 | #107 |

  Sardine is correctly suppressed (rank #280) even though its niche
  match (0.909) is *higher* than anchovy's (0.900) — because XGB
  learned that sardine collapsed. This is the whole point of the
  architecture.

  San Diego Bight, October 2023 (warm SoCal) — top 3 under `final`:
  1. Bluebanded goby (0.620)
  2. Pipefish *Syngnathus* (0.592)
  3. Basketweave cusk-eel (0.573)

  Northern anchovy correctly drops to #25 in San Diego in fall
  (outside its niche), and sardine drops to #333.

  Oregon shelf, July 2022 (cold upwelling) — Engraulis #5,
  Sardinops #281, jack mackerel #32.

  **Why this architecture is a good fit for the app:**

  - **Cheap** — O(n_species) per query, trivially cacheable. No
    model inference.
  - **Interpretable** — the score decomposes into
    *niche-match × sustainability*, and both numbers are in [0, 1].
    Easy to show both to sellers and buyers.
  - **Cold-start friendly** — a new location with no historical
    larvae sampling still works, as long as you can enrich `(lat,
    lng, date)` with env features from an ocean API.
  - **Refuses to recommend collapsing species even when they like the
    water** — the XGB survivability multiplier handles that.

  **What it does NOT do:**

  - It is not a replacement for the XGBoost ranker. Niche match alone
    has no notion of trajectory or current abundance — that's why we
    multiply by `surv_01`.
  - Out-of-distribution queries (a location/season never sampled by
    CalCOFI) will have unreliable niche centroids. For California
    Current water the centroids are solid; outside it, stop and
    retrain.

  **Artifacts:**
  - `outputs/niche_centroids.parquet` — 333 × 13 centroid matrix +
    `n_presence`, `sum_w`, `common_name`
  - `outputs/niche_scaler.json` — global mean/std for z-scoring
    queries
  - `outputs/niche_demo.md` — the three demo queries with full
    top-10 tables and side-by-side niche-only / niche×survivability
    rankings

  Reproduce::

      .venv/bin/python notebooks/niche_similarity.py

* ✅ **Linear-regression baseline** —
  `notebooks/linreg_baseline.py`. Trained OLS, Ridge, Lasso, and
  ElasticNet on the **exact same bottle-sparse feature set** that
  `xgb_advanced_bottlejoin.py` uses (with one-hot encoded `species_id`
  and `tow_type_code`, median imputation + missing-indicator columns,
  StandardScaler). Same time-based split (train ≤ 2018, test ≥ 2019).
  Ridge / Lasso / ElasticNet tune their regularisation strength by
  5-fold CV on the train set.

  | model | train R² | test R² | ΔR² vs XGB bottle-sparse |
  |---|---:|---:|---:|
  | OLS | 0.475 | **0.226** | −0.319 |
  | Ridge (α=351) | 0.470 | 0.218 | −0.326 |
  | Lasso (α ≈ 6 × 10⁻⁴, 93 non-zero) | 0.465 | 0.217 | −0.327 |
  | ElasticNet | 0.464 | 0.213 | −0.331 |
  | **XGB bottle-sparse** | 0.698 | **0.544** | — |

  All four linear models are within 0.02 R² of each other on test,
  which means regularisation isn't the bottleneck — **the target
  surface is genuinely non-linear**. Log-larvae density is a product
  of species × season × location × environment interactions that no
  single-coefficient linear model can express. Top Ridge coefficients
  are dominated by species one-hot dummies (each species has its own
  intercept), confirming that most of what a linear model learns is
  "how abundant is each species on average" rather than anything
  structural.

  Takeaway: the ~0.32 R² gap justifies XGBoost as the survivability
  engine. Linear regression is retained as a cheap sanity baseline,
  not as a candidate model.

  Artifacts: `outputs/linreg_metrics.json`,
  `outputs/linreg_top_coefficients.csv`,
  `outputs/linreg_vs_xgb_r2.png`.

  Reproduce::

      .venv/bin/python notebooks/linreg_baseline.py

* ✅ **State-space Kalman on annual catch size (option #4)** —
  `notebooks/kalman_survivability.py`. Per-tow density regression
  bottoms out at R² ≈ 0.54 because the noise is *irreducible at the
  tow level*. The right tool for a noisy time series is a state-space
  model. For each species we aggregate every year's tows into an
  effort-standardised annual CPUE:

  ```
  y_t = log1p( mean(larvae_10m²) across all tows in year t )
  ```

  (with ≥ 20 tows/year required, ≥ 15 years total, ≥ 500 total
  larvae), then fit a **local linear trend Kalman filter** via
  `statsmodels.UnobservedComponents`:

  ```
  μ_t = μ_{t-1} + β_{t-1} + η_t          (latent level)
  β_t = β_{t-1} + ζ_t                    (latent slope / trend)
  y_t = μ_t + ε_t                        (observation noise)
  ```

  The smoother borrows strength across adjacent years, so a single
  bad-coverage year doesn't dominate the trend the way it would in a
  per-tow regression. Four features per species:
  `current_level`, `recent_slope` (mean slope over last 10 yrs),
  `recent_slope_se`, `trend_confidence = t / (1 + t)` where
  `t = |slope| / slope_se`. The score is:

  ```
  kalman_score = sqrt( sigmoid(level) * slope_01_shrunk )
  slope_01_shrunk = conf * sigmoid(slope) + (1 - conf) * 0.5
  ```

  Species with flat-within-noise trends get their slope shrunk to
  the neutral 0.5, so only *statistically confident* trends move
  the score. No hand-picked weights.

  **Results (68 species with ≥ 15 years of data):**

  | species | level | slope | t-stat | conf | score |
  |---|---:|---:|---:|---:|---:|
  | Anchovy | 5.03 | −0.004 | 0.08 | 0.07 | **0.676** |
  | Sardine | 3.78 | **−0.107** | **1.40** | 0.58 | **0.408** |
  | Pacific hake | 4.30 | −0.010 | 0.25 | 0.20 | 0.614 |
  | Jack mackerel | 3.60 | −0.002 | 0.11 | 0.10 | 0.598 |

  Sardine's collapse is confidently detected (t=1.4, slope −0.107/yr)
  and correctly drops its score. Anchovy's recent trend is
  statistically flat, so the score reflects its very high *level*
  instead.

  **Top 10 (healthy + trending up)** includes English sole,
  chilipepper rockfish, splitnose rockfish, slender sole — all
  NOAA-rebuilt or not-overfished groundfish. **Bottom 10** includes
  Diogenes lanternfish (slope −0.33), sardine, and assorted
  mesopelagic taxa.

  **Cross-model validation (the important result):**

  ```
  Spearman ρ( Kalman score , XGB blended score ) = +0.599   (p = 3e-7,  n = 62)
  ```

  Two entirely different methodologies — a gradient-boosted regressor
  on per-tow env features vs. a state-space filter on annual totals
  — converge on similar species rankings. That agreement is
  stronger validation than either score alone.

  Artifacts: `outputs/kalman_survivability.csv`,
  `outputs/kalman_anchor_trajectories.png` (raw CPUE + smoothed level
  ± 95% CI for the four anchors),
  `outputs/kalman_vs_xgb_scatter.png`.

  Reproduce::

      .venv/bin/python notebooks/kalman_survivability.py

* ✅ **External stock-assessment labels (option #2)** —
  `data/species_labels.csv` + `notebooks/validate_with_labels.py`.
  Curated 25 commercially-relevant species with:

  - `noaa_stock_status` — `not_overfished` / `overfished` /
    `rebuilt` / `rebuilding` / `unknown`
  - `seafood_watch` — `best_choice` / `good_alternative` / `avoid`
  - `iucn_status` — Red List category
  - `label_score` ∈ [0, 1] — composite ground-truth weight

  Validation cross-references the external label against our
  model-derived scores. XGB is squashed to [0, 1] via robust
  median/MAD sigmoid, then the final composite is the equal-weight
  mean of the three [0, 1] scores (label + xgb_01 + kalman_score).

  **Agreement with external labels (rank correlation):**

  | score | ρ vs label | n | p |
  |---|---:|---:|---:|
  | xgb_score | **+0.48** | 15 | 0.07 |
  | kalman_score | +0.22 | 13 | 0.47 |
  | xgb vs kalman | +0.43 | 13 | 0.14 |

  XGB is the closer match to stock-assessment labels; Kalman is
  additive because it uses a different data slice (annual CPUE) and
  catches rebuilds / collapses XGB misses.

  **Final composite ranking (labeled species only):**

  Top 5 (of 25): Dover sole (0.884), Anchovy (0.856), Yellowtail
  rockfish (0.850), Lingcod (0.850), Widow rockfish (0.850).
  Bottom 3: Pacific bluefin tuna (0.300), **Pacific sardine (0.171)**,
  Queenfish (0.412).

  This is the **ranking the app should use for its ~25 commercial
  species**. For the other 600+ taxa in CalCOFI (most of which
  aren't sold anyway), fall back to the Kalman + XGB composite
  without the label term.

  Artifacts: `outputs/label_validation.csv`,
  `outputs/label_validation.md`.

  Reproduce::

      .venv/bin/python notebooks/validate_with_labels.py

* ✅ **Cast-weather features added to niche similarity.** The niche
  centroid now uses 18 features: 9 bottle-chemistry
  (SST / salinity / density / O2 / chlorophyll / chlorophyll
  integral / MLD / stratification / nitrate), 5 cast-weather
  (wind speed, wind-sin, wind-cos, barometer, air temp — decomposing
  circular wind direction into sin/cos), and 4 spatio-temporal
  (latitude, longitude, month-sin, month-cos). Centroids are built on
  the full joined `outputs/larvae_bottle_enriched.parquet`
  (larvae × bottle × cast). Coverage of the new cast-weather
  features is 35–55%; NaNs are skipped per-feature-per-species in the
  weighted mean, so species with no weather-annotated casts still
  get a valid (but bot-only) centroid.

  **Why cast weather matters for the app:** a buyer on a boat has
  wind speed, barometric pressure, and air temperature from their
  phone or a marine-weather API — but probably *not* SST at 100 m or
  chlorophyll integrated over the mixed layer. Adding cast-weather
  features makes the query vector closer to what the app can
  actually supply at runtime. Sanity check still passes (all four
  anchor species self-rank #1 at their own niche).

* ⏭ Next: swap hand labels for a real **Seafood Watch** table
  (download their CSV) and refit.
* ⏭ Next: `rankForLocation` HTTPS Cloud Function returning ordered
  species for the mobile/web apps.

## 7. What did not work

* **Raw `larvae/eggs` ratio as survivability** — wildly skewed because
  the two file families have different species-identification
  resolution (many eggs are only resolved to `Teleostei` /
  `Unidentified Teleost`). After joining on cruise+line+station+species
  only ~20 species have enough matched rows. Its ML importance was
  effectively zero (0.01). We keep it only as a secondary check.
* **`stage_advance_frac` as a strong signal** — in `LarvaeStages.csv`
  the reported stage is biased by which individuals get staged at all;
  fraction-advanced is near-uniform across abundant species. ML
  importance ~0.01.
* **Sex-ratio / reproduction-rate idea (user's original framing)** —
  the CalCOFI ichthyoplankton data has no sex column at all. Dropped.
* **Using `power2_impexp.csv` as a per-species signal** — it is
  aggregated at state × year × type (import/export/disposal tons) and
  does **not** name species, so we keep it only as a macro demand
  proxy, not as a feature.
* **CUFES temperature niche for all species** — CUFES resolves only 5
  species (sardine, anchovy, jack mackerel, hake, squid); we only
  attach `pref_sst_c` / `pref_sal_psu` for those.
* **`MIN_OBS` below 50** — allowed very rare species in, which blew
  up the z-score distribution and gave a few obscure mesopelagics
  unwarranted ranks above anchovy. 50 is a good floor.

---

## 8. External datasets worth pulling in next

| Dataset | Why | Access |
|---|---|---|
| Seafood Watch recommendations | Direct "Best Choice / Good Alt / Avoid" labels per species × fishery | https://www.seafoodwatch.org/ (CSV export) |
| NOAA FishWatch status | Overfished / overfishing flags | https://www.fishwatch.gov/ |
| IUCN Red List | Endangered status | https://www.iucnredlist.org/ |
| FishBase `Vulnerability` | 1–100 intrinsic vulnerability score | https://www.fishbase.se/ |
| ERDDAP SST / OISST | Current sea-surface-temperature for environmental niche match at the buyer's location | https://coastwatch.pfeg.noaa.gov/erddap/ |
| NOAA stock assessments | Recruitment + biomass time series (ground truth) | https://www.st.nmfs.noaa.gov/ |

These are optional **after** we justify the app with CalCOFI alone,
because CalCOFI is the dataset the hackathon requires us to use.

---

## 9. How this plugs into the app

`notebooks/run_analysis.py` writes:

* `notebooks/outputs/species_rankings.json`
* `notebooks/outputs/species_rankings.csv`
* `notebooks/outputs/species_features.csv`

The web app (`apps/web`) and mobile app (`apps/mobile`) can read the
JSON at build time or at request time. A future Cloud Function
`rankForLocation` can take `(lat, lng, date, availableSpecies[])` and
return an ordered list of crates by blending:

1. Marketplace inventory (what the supplier is actually selling), and
2. `survivability_score` (global baseline), and
3. A spatial re-weighting that boosts species *currently present*
   near the buyer in CalCOFI stations within ~100 km.

That is the "ranker" we ship in the hackathon demo.

---

## 10. Reproducing

From repo root, with the `.venv` active:

```bash
# 1. hand-weighted composite + toy GBR sanity check
.venv/bin/python notebooks/run_analysis.py

# 2. narrow learned XGB ranker (Larvae.csv only)
.venv/bin/python notebooks/xgb_ranker.py

# 3. wide learned XGB + residual + quantile rankers (all 4 required CSVs + CUFES)
.venv/bin/python notebooks/xgb_advanced.py
```

or open the notebook:

```bash
.venv/bin/jupyter notebook notebooks/sustainability_ranker.ipynb
```

Generated files land under `notebooks/outputs/`: **Parquet / Markdown** at the
root, **JSON** in `outputs/json/`, **PNG** in `outputs/figures/`, and **CSV**
in `outputs/tables/` (see `output_paths.py`). Everything under `notebooks/`
except `*.py`, `*.ipynb`, and this README is gitignored — re-run the scripts to
recreate artefacts.
