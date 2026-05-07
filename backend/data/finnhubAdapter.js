const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";

if (!FINNHUB_API_KEY) {
  console.warn("Missing FINNHUB_API_KEY in .env");
}

async function finnhubGet(path, params = {}) {
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

async function getCandles(symbol, resolution = "1", minutesBack = 90) {
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
  if (!candles || candles.s !== "ok" || !candles.v?.length) return 0;

  const latestVolume = candles.v[candles.v.length - 1];
  const avgVolume =
    candles.v.reduce((sum, volume) => sum + volume, 0) / candles.v.length;

  if (!avgVolume) return 0;
  return Number((latestVolume / avgVolume).toFixed(2));
}

function calculatePremarketVolume(candles) {
  if (!candles || candles.s !== "ok" || !candles.v?.length) return 0;

  return candles.v.reduce((sum, volume, index) => {
    const timestamp = candles.t[index] * 1000;
    const date = new Date(timestamp);

    const easternHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        hour12: false,
      }).format(date)
    );

    const easternMinute = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        minute: "2-digit",
      }).format(date)
    );

    const minutes = easternHour * 60 + easternMinute;
    const isPremarket = minutes >= 240 && minutes < 570;

    return isPremarket ? sum + volume : sum;
  }, 0);
}

function getVWAP(candles) {
  if (!candles || candles.s !== "ok" || !candles.c?.length) return null;

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
  if (!candles || candles.s !== "ok" || !candles.h?.length) return null;

  let pmh = null;

  for (let i = 0; i < candles.h.length; i++) {
    const timestamp = candles.t[i] * 1000;
    const date = new Date(timestamp);

    const easternHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        hour12: false,
      }).format(date)
    );

    const easternMinute = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        minute: "2-digit",
      }).format(date)
    );

    const minutes = easternHour * 60 + easternMinute;
    const isPremarket = minutes >= 240 && minutes < 570;

    if (isPremarket) {
      pmh = pmh === null ? candles.h[i] : Math.max(pmh, candles.h[i]);
    }
  }

  return pmh;
}

function getVelocityPct(candles, lookbackBars = 5) {
  if (!candles || candles.s !== "ok" || candles.c.length <= lookbackBars) return 0;

  const current = candles.c[candles.c.length - 1];
  const previous = candles.c[candles.c.length - 1 - lookbackBars];

  if (!previous) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function getUpperWickPct(candles) {
  if (!candles || candles.s !== "ok" || !candles.c?.length) return 0;

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

async function buildFinnhubStockPayload(symbol) {
  const [quote, candles, news] = await Promise.all([
    getQuote(symbol),
    getCandles(symbol, "1", 360),
    getCompanyNews(symbol),
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
    ticker: symbol,
    lastPrice,
    previousClose,
    bid: null,
    ask: null,
    dayVolume: candles?.v?.reduce((sum, volume) => sum + volume, 0) || 0,
    premarketVolume,
    relVol,
    aboveVWAP: vwap !== null ? lastPrice > vwap : false,
    breakingPMH: pmh !== null ? lastPrice > pmh : false,
    failedPMHBreak: pmh !== null ? lastPrice < pmh && velocityPct < 0 : false,
    upperWickPct,
    redReversalVolumeSpike: false,
    velocityPct,
    volumeSurge: relVol >= 3,
    newsCatalyst: Array.isArray(news) && news.length > 0,
  };
}

module.exports = {
  buildFinnhubStockPayload,
};
