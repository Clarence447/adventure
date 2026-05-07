const assert = require("node:assert/strict");
const test = require("node:test");

process.env.FINNHUB_API_KEY = "test-key";

const {
  calculatePremarketVolume,
  calculateRelVol,
  getPMH,
  getUpperWickPct,
  getVWAP,
  getVelocityPct,
  hasRedReversalVolumeSpike,
} = require("./finnhubAdapter");

function timestampSeconds(dateString) {
  return Math.floor(new Date(dateString).getTime() / 1000);
}

test("calculates premarket-only metrics using New York market hours", () => {
  const candles = {
    s: "ok",
    o: [10, 11, 12],
    h: [11, 13, 14],
    l: [9, 10, 11],
    c: [10.5, 12.5, 13.5],
    v: [100, 200, 300],
    t: [
      timestampSeconds("2026-05-07T08:30:00Z"),
      timestampSeconds("2026-05-07T13:15:00Z"),
      timestampSeconds("2026-05-07T14:00:00Z"),
    ],
  };

  assert.equal(calculatePremarketVolume(candles), 300);
  assert.equal(getPMH(candles), 13);
});

test("calculates candle-derived signal fields", () => {
  const candles = {
    s: "ok",
    o: [10, 10, 10, 10, 10, 12],
    h: [11, 11, 11, 11, 11, 13],
    l: [9, 9, 9, 9, 9, 10],
    c: [10, 10.5, 11, 11.5, 12, 11],
    v: [100, 100, 100, 100, 100, 250],
    t: [
      timestampSeconds("2026-05-07T13:31:00Z"),
      timestampSeconds("2026-05-07T13:32:00Z"),
      timestampSeconds("2026-05-07T13:33:00Z"),
      timestampSeconds("2026-05-07T13:34:00Z"),
      timestampSeconds("2026-05-07T13:35:00Z"),
      timestampSeconds("2026-05-07T13:36:00Z"),
    ],
  };

  assert.equal(calculateRelVol(candles), 2.5);
  assert.equal(Number(getVWAP(candles).toFixed(2)), 10.67);
  assert.equal(getVelocityPct(candles, 5), 10);
  assert.equal(getUpperWickPct(candles), 33.33);
  assert.equal(hasRedReversalVolumeSpike(candles), true);
});

test("returns safe defaults for missing or no-data candles", () => {
  const candles = { s: "no_data" };

  assert.equal(calculateRelVol(candles), 0);
  assert.equal(calculatePremarketVolume(candles), 0);
  assert.equal(getVWAP(candles), null);
  assert.equal(getPMH(candles), null);
  assert.equal(getVelocityPct(candles), 0);
  assert.equal(getUpperWickPct(candles), 0);
  assert.equal(hasRedReversalVolumeSpike(candles), false);
});
