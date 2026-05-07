const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";
const EASTERN_TIME_ZONE = "America/New_York";
const PREMARKET_START_MINUTES = 4 * 60;
const REGULAR_MARKET_OPEN_MINUTES = 9 * 60 + 30;
const DEFAULT_CANDLE_MINUTES_BACK = 360;
const RED_REVERSAL_VOLUME_MULTIPLIER = 2;

const easternTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EASTERN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

if (!FINNHUB_API_KEY) {
  console.warn("Missing FINNHUB_API_KEY in .env");
}

function assertFinnhubApiKey() {
  if (!FINNHUB_API_KEY) {
    throw new Error("Missing FINNHUB_API_KEY in .env");
  }
}

function isOkCandles(candles) {
  return (
    candles?.s === "ok" &&
    Array.isArray(candles.c) &&
    Array.isArray(candles.h) &&
    Array.isArray(candles.l) &&
    Array.isArray(candles.o) &&
    Array.isArray(candles.t) &&
    Array.isArray(candles.v) &&
    candles.c.length > 0
  );
}

function getEasternMinutes(timestampSeconds) {
  const parts = easternTimeFormatter.formatToParts(
    new Date(timestampSeconds * 1000)
  );
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0
  );

  return (hour % 24) * 60 + minute;
}

function isPremarketTimestamp(timestampSeconds) {
  const minutes = getEasternMinutes(timestampSeconds);

  return (
    minutes >= PREMARKET_START_MINUTES &&
    minutes < REGULAR_MARKET_OPEN_MINUTES
  );
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

async function finnhubGet(path, params = {}) {
  assertFinnhubApiKey();

  const url = new URL(`${BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  url.searchParams.append("token", FINNHUB_API_KEY);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Finnhub error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function getQuote(symbol) {
  return finnhubGet("/quote", { symbol });
}

async function getCandles(
  symbol,
  resolution = "1",
  minutesBack = DEFAULT_CANDLE_MINUTES_BACK
) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - minutesBack * 60;

  return finnhubGet("/stock/candle", {
    symbol,
    resolution,
    from,
    to,
  });
}

async function getCompanyNews(symbol) {
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return finnhubGet("/company-news", {
    symbol,
    from: fromDate,
    to,
  });
}

function calculateRelVol(candles) {
  if (!isOkCandles(candles) || !candles.v.length) return 0;

  const latestVolume = candles.v[candles.v.length - 1];
  const comparisonVolumes = candles.v.slice(0, -1);
  const averageVolume = comparisonVolumes.length
    ? sum(comparisonVolumes) / comparisonVolumes.length
    : latestVolume;

  if (!averageVolume) return 0;
  return Number((latestVolume / averageVolume).toFixed(2));
}

function calculatePremarketVolume(candles) {
  if (!isOkCandles(candles)) return 0;

  return candles.v.reduce((total, volume, index) => {
    return isPremarketTimestamp(candles.t[index]) ? total + volume : total;
  }, 0);
}

function getVWAP(candles) {
  if (!isOkCandles(candles)) return null;

  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.c.length; i++) {
    const typicalPrice = (candles.h[i] + candles.l[i] + candles.c[i]) / 3;
    const volume = candles.v[i];

    cumulativePV += typicalPrice * volume;
    cumulativeVolume += volume;
  }

  if (!cumulativeVolume) return null;
  return cumulativePV / cumulativeVolume;
}

function getPMH(candles) {
  if (!isOkCandles(candles)) return null;

  return candles.h.reduce((pmh, high, index) => {
    if (!isPremarketTimestamp(candles.t[index])) return pmh;

    return pmh === null ? high : Math.max(pmh, high);
  }, null);
}

function getVelocityPct(candles, lookbackBars = 5) {
  if (!isOkCandles(candles) || candles.c.length <= lookbackBars) return 0;

  const current = candles.c[candles.c.length - 1];
  const previous = candles.c[candles.c.length - 1 - lookbackBars];

  if (!previous) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function getUpperWickPct(candles) {
  if (!isOkCandles(candles)) return 0;

  const i = candles.c.length - 1;
  const high = candles.h[i];
  const low = candles.l[i];
  const open = candles.o[i];
  const close = candles.c[i];

  const range = high - low;
  if (!range) return 0;

  const upperWick = high - Math.max(open, close);
  return Number(((upperWick / range) * 100).toFixed(2));
}

function hasRedReversalVolumeSpike(candles) {
  if (!isOkCandles(candles) || candles.c.length < 2) return false;

  const lastIndex = candles.c.length - 1;
  const isRedCandle = candles.c[lastIndex] < candles.o[lastIndex];
  const previousVolumes = candles.v.slice(0, lastIndex);
  const averagePreviousVolume = previousVolumes.length
    ? sum(previousVolumes) / previousVolumes.length
    : 0;

  return (
    isRedCandle &&
    averagePreviousVolume > 0 &&
    candles.v[lastIndex] >= averagePreviousVolume * RED_REVERSAL_VOLUME_MULTIPLIER
  );
}

async function buildFinnhubStockPayload(symbol) {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const [quote, candles, news] = await Promise.all([
    getQuote(normalizedSymbol),
    getCandles(normalizedSymbol),
    getCompanyNews(normalizedSymbol),
  ]);

  const lastPrice = quote.c;
  const previousClose = quote.pc;
  const relVol = calculateRelVol(candles);
  const premarketVolume = calculatePremarketVolume(candles);
  const vwap = getVWAP(candles);
  const pmh = getPMH(candles);
  const velocityPct = getVelocityPct(candles, 5);
  const upperWickPct = getUpperWickPct(candles);

  return {
    ticker: normalizedSymbol,
    lastPrice,
    previousClose,
    bid: null,
    ask: null,
    dayVolume: isOkCandles(candles) ? sum(candles.v) : 0,
    premarketVolume,
    relVol,
    aboveVWAP: vwap !== null ? lastPrice > vwap : false,
    breakingPMH: pmh !== null ? lastPrice > pmh : false,
    failedPMHBreak: pmh !== null ? lastPrice < pmh && velocityPct < 0 : false,
    upperWickPct,
    redReversalVolumeSpike: hasRedReversalVolumeSpike(candles),
    velocityPct,
    volumeSurge: relVol >= 3,
    newsCatalyst: Array.isArray(news) && news.length > 0,
  };
}

module.exports = {
  buildFinnhubStockPayload,
  calculatePremarketVolume,
  calculateRelVol,
  getPMH,
  getUpperWickPct,
  getVWAP,
  getVelocityPct,
  hasRedReversalVolumeSpike,
};
