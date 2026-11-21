import React from 'react'
import { BrainCircuit, GitBranch, Lightbulb, Database, Radar, BellRing, Scale, Info } from 'lucide-react'
import FactorBar from '../components/FactorBar'

import { useApi } from '../hooks/useApi'
import bundledMetadata from '../data/bundled-model-meta.json'

const FEATURE_NAMES = {
  soil_moisture: 'Soil Moisture',
  rainfall: 'Rainfall',
  rainfall_intensity: 'Rainfall Intensity',
  slope: 'Slope',
  elevation: 'Elevation',
  humidity: 'Humidity',
  temperature: 'Temperature',
  distance_to_drain: 'Distance to Drain',
  historical_occurrence: 'Historical Occurrence',
  soil_type_enc: 'Soil Type',
  land_cover_enc: 'Land Cover',
  rock_type_enc: 'Rock Type',
}

export default function AIInsights() {
  const { data, error } = useApi('/api/model-metadata')
  const meta = data ?? bundledMetadata
  const params = meta.hyperparameters
  const formatCount = (value) => value.toLocaleString('en-IN')
  const modelCard = [
    { label: 'Algorithm', value: `Random Forest Classifier (scikit-learn ${meta.library_versions['scikit-learn']})` },
    { label: 'Version', value: meta.model_version },
    { label: 'Trained at', value: new Date(meta.trained_at_utc).toISOString().slice(0, 19) + ' UTC' },
    { label: 'Training samples', value: `${formatCount(meta.n_samples)} (${formatCount(meta.n_samples_train)} train / ${formatCount(meta.n_samples_test)} test, stratified 80/20)` },
    { label: 'Features', value: `${meta.n_features} (weather, terrain, geology, history)` },
    { label: 'Target', value: 'Landslide occurrence (binary)' },
    { label: 'Hyperparameters', value: `n_estimators=${params.n_estimators} · class_weight=${params.class_weight} · random_state=${params.random_state}` },
    { label: 'Trained on', value: 'DEMO / sample dataset' },
  ]
  const metrics = [
    { key: 'accuracy', value: `${(meta.accuracy * 100).toFixed(1)}%` },
    { key: 'precision', value: meta.precision.toFixed(2) },
    { key: 'recall', value: meta.recall.toFixed(2) },
    { key: 'f1', value: meta.f1_score.toFixed(2) },
  ]
  const features = Object.entries(meta.feature_importance)
    .map(([key, weight]) => ({ key, label: FEATURE_NAMES[key] ?? key, share: Number((weight * 100).toFixed(2)) }))
  const topShare = Math.max(...features.map(({ share }) => share))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">AI Insights & Model Explainability</h1>
        <p className="text-sm text-muted-foreground">
          How the model works, what it was trained on, and what it can and cannot tell you.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Model card */}
        <div className="card">
          <h3 className="mb-4 flex items-center gap-2 font-bold">
            <BrainCircuit className="h-5 w-5 text-primary" /> The Prediction Model
          </h3>
          <div className="space-y-2.5">
            {modelCard.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 rounded-lg bg-muted px-3 py-2">
                <span className="shrink-0 text-sm text-muted-foreground">{r.label}</span>
                <span className="text-right text-sm font-semibold text-foreground">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {metrics.map((m) => (
              <div key={m.key} className="rounded-lg border border-border bg-muted p-2 text-center">
                <p className="text-xs font-bold text-primary">{m.value}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{m.key}</p>
              </div>
            ))}
          </div>
          {error && (
            <p className="mt-3 text-[11px] text-amber-300">Showing the bundled demo metrics. Current model metadata is unavailable.</p>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Metrics are held-out (20% test) results on the demo dataset. The label itself was
            generated from a synthetic rule over the features, so these numbers measure how well
            the forest recovers that rule — <b className="text-muted-foreground">not real-world landslide
            prediction accuracy</b>. Production deployment needs production-labelled data.
          </p>
        </div>

        {/* Explainability card */}
        <div className="card">
          <h3 className="mb-4 flex items-center gap-2 font-bold">
            <Scale className="h-5 w-5 text-primary" /> Global Feature Importance
          </h3>
          <p className="text-sm text-muted-foreground">
            Importance the trained forest assigns to each input across the whole model. These are
            model-wide weights, not a per-prediction explanation.
          </p>
          <div className="mt-4 space-y-3">
            {features.map((f) => (
              <FactorBar key={f.key} factor={f.label} contribution={f.share} max={topShare} display="share" />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            All 12 features sum to 100%. Weather and terrain dominate — consistent with the
            geology-driven landslides of the Northeast.
          </p>
        </div>
      </div>

      {/* Honest scope / known limitations */}
      <div className="card border-amber-900/50">
        <h3 className="mb-3 flex items-center gap-2 font-bold">
          <Info className="h-5 w-5 text-amber-400" aria-hidden="true" /> What these explanations are — and are not
        </h3>
        <ul className="grid gap-2 text-sm text-foreground sm:grid-cols-2">
          <li className="rounded-lg bg-muted px-3 py-2.5">
            <b className="text-foreground">Per-run factor bars</b> come from the API's rule-based
            contribution score (0–100 per input), shown on the Prediction page for that run.
          </li>
          <li className="rounded-lg bg-muted px-3 py-2.5">
            <b className="text-foreground">"Model certainty"</b> is how far the probability sits
            from 0.5 (range 55–95). It is not calibrated statistical confidence.
          </li>
          <li className="rounded-lg bg-muted px-3 py-2.5">
            <b className="text-foreground">Risk levels</b> use the published thresholds:
            LOW ≤ 30 · MODERATE ≤ 60 · HIGH ≤ 80 · CRITICAL ≤ 100.
          </li>
          <li className="rounded-lg bg-muted px-3 py-2.5">
            <b className="text-foreground">Not SHAP/LIME</b> and not causal: no per-prediction
            attribution of the forest's internals is claimed anywhere in this UI.
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Demo-data caveat: the training label was derived from a thresholded linear score over the
          features (label leakage), so held-out metrics overstate what a deployed model would
          achieve on unseen, naturally-occurring landslides.
        </p>
      </div>

      {/* Future scope */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: Radar, title: 'Live Sensor Integration', desc: 'Rain gauges, soil probes and IoT stations streaming telemetry to the risk engine in real time.' },
          { icon: GitBranch, title: 'Advanced Deep Learning', desc: 'LSTM/transformer time-series forecasting models can predict risk escalation hours in advance.' },
          { icon: Database, title: 'Satellite & Remote Sensing', desc: 'ISRO/NASA soil-moisture and SAR imagery can extend coverage to un-instrumented areas.' },
          { icon: BellRing, title: 'Public Warning Channels', desc: 'SMS and WhatsApp gateways for pushing alerts to communities and field officers.' },
          { icon: Lightbulb, title: 'Regional Calibration', desc: 'State-specific thresholds and models tuned to local geology and rainfall patterns.' },
          { icon: BrainCircuit, title: 'SHAP Explanations', desc: 'Per-prediction SHAP values could replace the rule-based factor bars for rigorous auditability.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card">
            <div className="mb-3 inline-flex rounded-lg bg-muted p-2.5">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <p className="font-bold">{title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Future-scope items are ideas, not shipped capabilities.
      </p>
    </div>
  )
}
