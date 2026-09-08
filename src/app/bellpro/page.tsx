import Link from 'next/link';

const repairHighlights = [
  {
    title: 'ORB no longer inherits premarket bars',
    detail:
      'The opening-range high/low now reset to 0 at the session boundary and only build during the configured ORB window.',
  },
  {
    title: 'Premarket levels reset safely',
    detail:
      'PMH/PML initialization handles the first premarket bar and avoids stale values carrying into the next trading day.',
  },
  {
    title: 'Strategy exits use locked trade levels',
    detail:
      'Entry, stop, target, and size are stored at signal time so AddOrder exits do not reference a NaN or drifting stop/target.',
  },
  {
    title: 'Cooldown follows actual accepted entries',
    detail:
      'Re-entry cooldowns update from the final entry signals, not raw candidates, reducing duplicate simulated orders.',
  },
  {
    title: 'Python companion snippet compiles',
    detail:
      'The chart helper includes pandas, calls xaxis_date(), and computes candle width from real timestamp spacing.',
  },
];

const thinkScriptRepairPatch = `#===========================================================
# BellPro v2.1 REPAIR PATCH
# Replace the matching blocks in the original strategy.
# Notes:
# - AddOrder() remains simulated/backtest-only.
# - True bid/ask spread is unavailable in this chart context, so the
#   microstructure layer still uses candle range as a proxy.
#===========================================================

# --- Safer day/session state --------------------------------
def newDay = GetYYYYMMDD() <> GetYYYYMMDD()[1];
def firstBar = BarNumber() == 1;

def inTradeWindow =
    if !useTimeWindow then yes
    else SecondsFromTime(startTime) >= 0 and SecondsTillTime(endTime) > 0;

def preMktWindow = SecondsFromTime(0400) >= 0 and SecondsTillTime(0930) > 0;
def inORBWindow = SecondsFromTime(orbStartTime) >= 0 and SecondsTillTime(orbEndTime) > 0;
def orbReady = SecondsFromTime(orbEndTime) >= 0;

rec barsFromOpen = CompoundValue(1,
    if newDay or SecondsFromTime(startTime) < 0 then 0
    else barsFromOpen[1] + 1,
    0);

def enoughBars = barsFromOpen >= minBarsAfterOpen;

# PMH/PML only exist if the chart includes premarket bars.
rec pmHigh = CompoundValue(1,
    if newDay then
        if preMktWindow then high else 0
    else if preMktWindow then
        if pmHigh[1] == 0 then high else Max(high, pmHigh[1])
    else pmHigh[1],
    0);

rec pmLow = CompoundValue(1,
    if newDay then
        if preMktWindow then low else 0
    else if preMktWindow then
        if pmLow[1] == 0 then low else Min(low, pmLow[1])
    else pmLow[1],
    0);

# ORB should not seed from premarket or overnight candles.
rec orbHigh = CompoundValue(1,
    if newDay then
        if inORBWindow then high else 0
    else if inORBWindow then
        if orbHigh[1] == 0 then high else Max(high, orbHigh[1])
    else orbHigh[1],
    0);

rec orbLow = CompoundValue(1,
    if newDay then
        if inORBWindow then low else 0
    else if inORBWindow then
        if orbLow[1] == 0 then low else Min(low, orbLow[1])
    else orbLow[1],
    0);

# --- Safer extension gates ----------------------------------
# Only judge a level extension after that level exists and price is on
# the breakout side. Otherwise disabled/missing levels should not veto.
def orbLongOK = if !useExtensionFilter or orbHigh <= 0 or close <= orbHigh then yes else orbLongExt <= maxExtensionPct;
def orbShortOK = if !useExtensionFilter or orbLow <= 0 or close >= orbLow then yes else orbShortExt <= maxExtensionPct;
def pmhOK = if !useExtensionFilter or pmHigh <= 0 or close <= pmHigh then yes else pmhExt <= maxExtensionPct;
def pmlOK = if !useExtensionFilter or pmLow <= 0 or close >= pmLow then yes else pmlExt <= maxExtensionPct;
def vwapLongOK = if !useExtensionFilter or close <= vwapVal then yes else vwapLongExt <= maxExtensionPct;
def vwapShortOK = if !useExtensionFilter or close >= vwapVal then yes else vwapShortExt <= maxExtensionPct;

# --- Strategy simulation repair -----------------------------
# Replace section 16 with this version. It locks entry/stop/target/size
# on the entry bar, prevents same-direction duplicate entries while a
# simulated position is open, and avoids same-bar long+short opens.
def longEntryCandidate = enableStrategyOrders and allowLongOrders and activeLong and validRisk and !IsNaN(targetExitLevel);
def shortEntryCandidate = enableStrategyOrders and allowShortOrders and activeShort and validRisk and !IsNaN(targetExitLevel);

rec barsSinceLongEntry = CompoundValue(1,
    if longEntrySignal[1] then 0 else barsSinceLongEntry[1] + 1,
    reentryCooldownBars + 1);
rec barsSinceShortEntry = CompoundValue(1,
    if shortEntrySignal[1] then 0 else barsSinceShortEntry[1] + 1,
    reentryCooldownBars + 1);

def longCooldownOK = barsSinceLongEntry >= reentryCooldownBars;
def shortCooldownOK = barsSinceShortEntry >= reentryCooldownBars;

rec simLongOpen = CompoundValue(1,
    if longExitSignal then 0
    else if longEntrySignal then 1
    else simLongOpen[1],
    0);
rec simShortOpen = CompoundValue(1,
    if shortExitSignal then 0
    else if shortEntrySignal then 1
    else simShortOpen[1],
    0);

def flatForLong = simLongOpen[1] == 0 and simShortOpen[1] == 0;
def flatForShort = simLongOpen[1] == 0 and simShortOpen[1] == 0;

def longEntrySignal = longEntryCandidate and longCooldownOK and flatForLong;
def shortEntrySignal = shortEntryCandidate and shortCooldownOK and flatForShort and !longEntrySignal;

rec lockedLongEntry = CompoundValue(1, if longEntrySignal then close else lockedLongEntry[1], close);
rec lockedLongStop = CompoundValue(1, if longEntrySignal then stopLevel else lockedLongStop[1], close);
rec lockedLongTarget = CompoundValue(1, if longEntrySignal then targetExitLevel else lockedLongTarget[1], close);
rec lockedLongSize = CompoundValue(1, if longEntrySignal then adjustedOrderSize else lockedLongSize[1], orderSize);

rec lockedShortEntry = CompoundValue(1, if shortEntrySignal then close else lockedShortEntry[1], close);
rec lockedShortStop = CompoundValue(1, if shortEntrySignal then stopLevel else lockedShortStop[1], close);
rec lockedShortTarget = CompoundValue(1, if shortEntrySignal then targetExitLevel else lockedShortTarget[1], close);
rec lockedShortSize = CompoundValue(1, if shortEntrySignal then adjustedOrderSize else lockedShortSize[1], orderSize);

def longStopExit = enableStrategyOrders and simLongOpen[1] == 1 and useStopOrders and low <= lockedLongStop[1];
def longTargetExit = enableStrategyOrders and simLongOpen[1] == 1 and useTargetOrders and high >= lockedLongTarget[1] and !longStopExit;
def longTimeExit = enableStrategyOrders and simLongOpen[1] == 1 and flattenAtEndTime and SecondsTillTime(endTime) <= 0 and !longStopExit and !longTargetExit;
def longExitSignal = longStopExit or longTargetExit or longTimeExit;

def shortStopExit = enableStrategyOrders and simShortOpen[1] == 1 and useStopOrders and high >= lockedShortStop[1];
def shortTargetExit = enableStrategyOrders and simShortOpen[1] == 1 and useTargetOrders and low <= lockedShortTarget[1] and !shortStopExit;
def shortTimeExit = enableStrategyOrders and simShortOpen[1] == 1 and flattenAtEndTime and SecondsTillTime(endTime) <= 0 and !shortStopExit and !shortTargetExit;
def shortExitSignal = shortStopExit or shortTargetExit or shortTimeExit;

AddOrder(OrderType.BUY_TO_OPEN, longEntrySignal, close, lockedLongSize, Color.GREEN, Color.GREEN, "BP LONG");
AddOrder(OrderType.SELL_TO_CLOSE, longStopExit, lockedLongStop[1], lockedLongSize[1], Color.RED, Color.RED, "BP L STOP");
AddOrder(OrderType.SELL_TO_CLOSE, longTargetExit, lockedLongTarget[1], lockedLongSize[1], Color.CYAN, Color.CYAN, "BP L TARGET");
AddOrder(OrderType.SELL_TO_CLOSE, longTimeExit, close, lockedLongSize[1], Color.YELLOW, Color.YELLOW, "BP L TIME");

AddOrder(OrderType.SELL_TO_OPEN, shortEntrySignal, close, lockedShortSize, Color.RED, Color.RED, "BP SHORT");
AddOrder(OrderType.BUY_TO_CLOSE, shortStopExit, lockedShortStop[1], lockedShortSize[1], Color.GREEN, Color.GREEN, "BP S STOP");
AddOrder(OrderType.BUY_TO_CLOSE, shortTargetExit, lockedShortTarget[1], lockedShortSize[1], Color.CYAN, Color.CYAN, "BP S TARGET");
AddOrder(OrderType.BUY_TO_CLOSE, shortTimeExit, close, lockedShortSize[1], Color.YELLOW, Color.YELLOW, "BP S TIME");`;

const manualWarnings = [
  'ThinkScript does not expose true Level II spread inside a normal strategy; the spread/slippage engine is still an estimate from candle range.',
  'Premarket high/low require extended-hours data on the chart. If only regular-hours data is loaded, PMH/PML will remain unavailable.',
  'Thinkorswim strategy orders are historical simulation events only and cannot send live broker orders.',
  'Because ThinkScript resolves recursive dependencies differently than TypeScript, paste the patch into Thinkorswim and verify compile warnings there before trading from any interpretation.',
];

const pythonChartRepair = `import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd

# Clean numeric columns before plotting.
for column in ["Open", "High", "Low", "Close", "Volume"]:
    df_tsla[column] = df_tsla[column].replace({",": ""}, regex=True).astype(float)

df_tsla["Date"] = pd.to_datetime(df_tsla["Date"])
df_tsla = df_tsla.sort_values("Date")

fig, (ax_price, ax_volume) = plt.subplots(
    2,
    1,
    figsize=(14, 8),
    sharex=True,
    gridspec_kw={"height_ratios": [3, 1]},
)

if len(df_tsla) > 1:
    spacing = mdates.date2num(df_tsla["Date"].iloc[1]) - mdates.date2num(df_tsla["Date"].iloc[0])
    width = spacing * 0.70
else:
    width = 1 / (24 * 60) * 0.70

for _, row in df_tsla.iterrows():
    date_num = mdates.date2num(row["Date"])
    color = "green" if row["Close"] >= row["Open"] else "red"
    body_bottom = min(row["Open"], row["Close"])
    body_height = max(abs(row["Close"] - row["Open"]), 0.01)

    ax_price.plot([row["Date"], row["Date"]], [row["Low"], row["High"]], color=color, linewidth=1)
    ax_price.add_patch(
        plt.Rectangle(
            (date_num - width / 2, body_bottom),
            width,
            body_height,
            facecolor=color,
            edgecolor=color,
            alpha=0.85,
        )
    )
    ax_volume.bar(row["Date"], row["Volume"], width=width, color=color, alpha=0.45)

ax_price.set_ylabel("Price ($)")
ax_volume.set_ylabel("Volume")
ax_price.set_title("TSLA Intraday Candlestick Chart")
ax_price.xaxis_date()
ax_price.grid(alpha=0.2)
ax_volume.grid(alpha=0.2)
ax_price.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
fig.autofmt_xdate()
plt.tight_layout()
plt.show()`;

export default function BellProPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          ← Back home
        </Link>

        <section className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Thinkorswim / ThinkScript repair
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
            BellPro v2.1 reviewed and repaired
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            This page turns the submitted strategy into a safer surgical patch: ORB/PMH state handling is corrected,
            extension gates avoid missing-level vetoes, simulated strategy exits lock their original risk levels, and the
            companion matplotlib chart helper is cleaned up.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">Primary repairs</h2>
            <div className="mt-5 space-y-4">
              {repairHighlights.map((repair) => (
                <div key={repair.title} className="rounded-2xl bg-slate-950/70 p-4">
                  <h3 className="font-semibold text-emerald-200">{repair.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{repair.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">Manual verification notes</h2>
            <ul className="mt-5 space-y-3 text-slate-300">
              {manualWarnings.map((warning) => (
                <li key={warning} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-yellow-300" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">ThinkScript</p>
              <h2 className="mt-2 text-2xl font-bold">Drop-in repair patch</h2>
            </div>
            <p className="text-sm text-slate-400">Replace the matching blocks before importing as a Strategy.</p>
          </div>
          <pre className="mt-5 max-h-[42rem] overflow-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-200">
            <code>{thinkScriptRepairPatch}</code>
          </pre>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-300">Python companion</p>
          <h2 className="mt-2 text-2xl font-bold">Repaired TSLA intraday chart helper</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            The Python snippet now imports pandas, cleans all numeric OHLCV columns, sorts timestamps, calls
            xaxis_date(), scales candle width from the data interval, and plots matching volume bars.
          </p>
          <pre className="mt-5 max-h-[34rem] overflow-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-200">
            <code>{pythonChartRepair}</code>
          </pre>
        </section>
      </div>
    </main>
  );
}
