import { redis, KEY, LOW_WATER, ONLINE_TIMEOUT_MS, toBool } from './_redis.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const s = (await redis.hgetall(KEY)) || {};
    const water = Number(s.water) || 0;
    const lastSeen = Number(s.lastSeen) || 0;

    return res.status(200).json({
      water,
      desired: toBool(s.desired),
      actual: toBool(s.actual),
      lowWater: lastSeen > 0 && water < LOW_WATER,
      online: lastSeen > 0 && Date.now() - lastSeen < ONLINE_TIMEOUT_MS,
      lastSeen
    });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
