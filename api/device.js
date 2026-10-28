// Dipanggil oleh ESP32: lapor sensor + ambil perintah terbaru.
// POST /api/device   header: x-device-key   body: {"percent":55,"raw":1800,"diffuser":true}
const { getState, saveState, MIN_WATER_PERCENT } = require("./_store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.DEVICE_KEY || req.headers["x-device-key"] !== process.env.DEVICE_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const percent = Math.max(0, Math.min(100, Number(body.percent) || 0));
    const raw = Number(body.raw) || 0;
    const reported = Boolean(body.diffuser);

    const state = await getState();
    state.percent = percent;
    state.raw = raw;
    state.reported = reported;
    state.lastSeen = Date.now();

    // Pengaman: air < 10% -> perintah dipaksa OFF
    if (percent < MIN_WATER_PERCENT) state.desired = false;

    await saveState(state);
    return res.status(200).json({ diffuser: state.desired });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
