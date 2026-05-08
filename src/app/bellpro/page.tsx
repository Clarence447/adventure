import Link from 'next/link';

const engineLayers = [
  'Momentum ignition and early ignition scoring',
  'Liquidity sweep trap and halt-risk state memory',
  'VWAP acceptance, regime priority, and trend persistence',
  'Adaptive extension, exhaustion penalties, and momentum decay',
  'Execution microstructure checks for spread, chase, vacuum, and slippage risk',
  'Risk-adaptive position scaling and simulated AddOrder strategy events',
];

const duplicateFixes = [
  {
    title: 'Duplicate inputs removed',
    detail:
      'The v2.1 microstructure inputs should be declared once so ThinkScript does not reject repeated input names.',
  },
  {
    title: 'Microstructure engine consolidated',
    detail:
      'The estimated spread, chase risk, liquidity vacuum, slippage risk, deployment quality, and deployment score definitions should appear once.',
  },
  {
    title: 'HUD labels deduplicated',
    detail:
      'Spread, slippage, liquidity vacuum, chase risk, deployment score, and execution quality labels should only render once each.',
  },
  {
    title: 'Position-scale priority clarified',
    detail:
      'Microstructure risk reductions should be evaluated once before halt risk, explosive tempo, slow trend, and normal sizing.',
  },
];

const thinkScriptPatch = `# BellPro v2.1 cleanup patch
# Keep only one copy of these inputs near the rest of the v2.1 inputs.
input enableMicrostructureEngine = yes;
input spreadWarningPct = 1.50;
input chaseExtensionPct = 8.00;
input liquidityVacuumFactor = 0.40;
input slippageRiskFactor = 1.75;
input deploymentBonusPoints = 15;
input deploymentPenaltyPoints = 20;

# Keep only one copy of the execution microstructure engine.
def estimatedSpreadPct =
    if close > 0 then ((high - low) / close) * 100 else 0;

def spreadDanger =
    enableMicrostructureEngine and
    estimatedSpreadPct > spreadWarningPct;

def chaseRiskLong =
    enableMicrostructureEngine and
    orbLongExt > chaseExtensionPct and
    close > high[1];

def chaseRiskShort =
    enableMicrostructureEngine and
    orbShortExt > chaseExtensionPct and
    close < low[1];

def liquidityVacuumLong =
    enableMicrostructureEngine and
    volume < avgVol * liquidityVacuumFactor and
    explosiveBullTrend and
    close > close[1];

def liquidityVacuumShort =
    enableMicrostructureEngine and
    volume < avgVol * liquidityVacuumFactor and
    explosiveBearTrend and
    close < close[1];

def slippageRisk =
    enableMicrostructureEngine and
    estimatedSpreadPct > spreadWarningPct * slippageRiskFactor;

def deploymentQualityLong =
    !spreadDanger and
    !slippageRisk and
    !chaseRiskLong and
    !liquidityVacuumLong;

def deploymentQualityShort =
    !spreadDanger and
    !slippageRisk and
    !chaseRiskShort and
    !liquidityVacuumShort;

def deploymentScore =
    if tradeLong and deploymentQualityLong then deploymentBonusPoints
    else if tradeShort and deploymentQualityShort then deploymentBonusPoints
    else if spreadDanger or slippageRisk then -deploymentPenaltyPoints
    else if liquidityVacuumLong or liquidityVacuumShort then -10
    else if chaseRiskLong or chaseRiskShort then -10
    else 0;`;

const chartSnippet = `import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd

# Clean numeric columns before plotting.
df_tsla["Volume"] = df_tsla["Volume"].replace({",": ""}, regex=True).astype(float)
df_tsla["Date"] = pd.to_datetime(df_tsla["Date"])

fig, (ax_price, ax_volume) = plt.subplots(
    2,
    1,
    figsize=(14, 8),
    sharex=True,
    gridspec_kw={"height_ratios": [3, 1]},
)

width = 0.0005
for _, row in df_tsla.iterrows():
    color = "green" if row["Close"] >= row["Open"] else "red"
    ax_price.plot([row["Date"], row["Date"]], [row["Low"], row["High"]], color=color)
    ax_price.add_patch(
        plt.Rectangle(
            (mdates.date2num(row["Date"]) - width / 2, min(row["Open"], row["Close"])),
            width,
            abs(row["Close"] - row["Open"]),
            facecolor=color,
            edgecolor=color,
        )
    )

ax_price.set_ylabel("Price ($)")
ax_price.set_title("TSLA Intraday Candlestick Chart (2025-09-15)")
ax_price.xaxis_date()`;

export default function BellProPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          ← Back home
        </Link>

        <section className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Thinkorswim / ThinkScript
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
            BellPro v2.1 Execution Microstructure Intelligence
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            A cleaned implementation guide for the BellPro v2.1 strategy layer, focused on resolving duplicate
            declarations while preserving momentum, liquidity, halt-risk, VWAP, regime, scoring, and strategy
            simulation behavior.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">Engine layers</h2>
            <ul className="mt-5 space-y-3 text-slate-300">
              {engineLayers.map((layer) => (
                <li key={layer} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                  <span>{layer}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">Cleanup checklist</h2>
            <div className="mt-5 space-y-4">
              {duplicateFixes.map((fix) => (
                <div key={fix.title} className="rounded-2xl bg-slate-950/70 p-4">
                  <h3 className="font-semibold text-emerald-200">{fix.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{fix.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">ThinkScript patch</p>
              <h2 className="mt-2 text-2xl font-bold">Consolidated v2.1 microstructure block</h2>
            </div>
            <p className="text-sm text-slate-400">Paste once after extension/momentum definitions.</p>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-200">
            <code>{thinkScriptPatch}</code>
          </pre>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-300">Python companion</p>
          <h2 className="mt-2 text-2xl font-bold">TSLA intraday candlestick helper</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            The companion chart snippet keeps the provided matplotlib workflow, adds the missing pandas import,
            and documents the numeric cleanup step before plotting intraday candles.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-200">
            <code>{chartSnippet}</code>
          </pre>
        </section>
      </div>
    </main>
  );
}
