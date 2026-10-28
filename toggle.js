import { redis, KEY, LOW_WATER } from './_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.DASH_PASSWORD || req.headers['x-password'] !== process.env.DASH_PASSWORD) {
    return res.status(401).json({ error: 'Password salah' });
  }

  try {
    const state = !!(req.body && req.body.state);
    const s = (await redis.hgetall(KEY)) || {};

    if (state && Number(s.water) < LOW_WATER) {
      return res.status(400).json({ error: 'Air terlalu sedikit, tidak bisa dinyalakan' });
    }

    await redis.hset(KEY, { desired: state });
    return res.status(200).json({ ok: true, desired: state });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
