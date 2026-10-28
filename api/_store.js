// Helper bersama (file berawalan "_" tidak dijadikan endpoint oleh Vercel)
const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const KEY = "diffuser:state";
const ONLINE_TIMEOUT_MS = 10000; // perangkat dianggap offline jika >10 detik tidak lapor
const MIN_WATER_PERCENT = 10;

const DEFAULT_STATE = {
  desired: false,   // status yang diminta website
  reported: false,  // status nyata yang dilaporkan ESP32
  percent: 0,
  raw: 0,
  lastSeen: 0,
};

async function getState() {
  const s = await redis.get(KEY);
  return { ...DEFAULT_STATE, ...(s || {}) };
}

async function saveState(state) {
  await redis.set(KEY, state);
}

function isOnline(state) {
  return Date.now() - state.lastSeen < ONLINE_TIMEOUT_MS;
}

module.exports = { getState, saveState, isOnline, MIN_WATER_PERCENT };
