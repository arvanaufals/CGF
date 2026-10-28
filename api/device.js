import { redis, KEY, LOW_WATER, toBool } from './_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.DEVICE_KEY || req.headers['x-device-key'] !== process.env.DEVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body || {};
    const water = Math.max(0, Math.min(100, Number(body.water) || 0));
    const actual = toBool(body.mist);

    const current = (await redis.hgetall(KEY)) || {};
    let desired = toBool(current.desired);

    // Pengaman: air habis -> matikan
    if (water < LOW_WATER) desired = false;

    await redis.hset(KEY, { water, actual, desired, lastSeen: Date.now() });

    return res.status(200).json({ mist: desired });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
