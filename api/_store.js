const Redis = require("ioredis");

// Connects directly using REDIS_URL from Vercel Environment Variables
const redis = new Redis(process.env.REDIS_URL);

const KEY = "diffuser:state";
const ONLINE_TIMEOUT_MS = 10000; // Perangkat dianggap offline jika >10 detik tidak lapor
const MIN_WATER_PERCENT = 10;

const DEFAULT_STATE = {
  desired: false,   // Status yang diminta website
  reported: false,  // Status nyata yang dilaporkan ESP32
  percent: 0,
  raw: 0,
  lastSeen: 0,
};

async function getState() {
  const data = await redis.get(KEY);
  if (!data) return { ...DEFAULT_STATE };
  return { ...DEFAULT_STATE, ...JSON.parse(data) };
}

async function saveState(state) {
  await redis.set(KEY, JSON.stringify(state));
}

function isOnline(state) {
  return Date.now() - state.lastSeen < ONLINE_TIMEOUT_MS;
}

module.exports = { getState, saveState, isOnline, MIN_WATER_PERCENT };
