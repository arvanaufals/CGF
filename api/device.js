const { getState, saveState, MIN_WATER_PERCENT } = require("./_store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const serverKey = (process.env.DEVICE_KEY || "").trim();
  const sentKey = String(req.headers["x-device-key"] || "").trim();

  if (!serverKey) {
    return res.status(401).json({
      error: "DEVICE_KEY belum terbaca di server (cek Environment Variables lalu Redeploy)",
    });
  }

  if (!sentKey) {
    return res.status(401).json({ error: "Header x-device-key tidak terkirim" });
  }

  if (sentKey !== serverKey) {
    return res.status(401).json({ error: "Kunci tidak cocok" });
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

    // Pengaman: Air < 10% -> Perintah dipaksa OFF
    if (percent < MIN_WATER_PERCENT) state.desired = false;

    await saveState(state);
    return res.status(200).json({ diffuser: state.desired });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", detail: String(err.message || err) });
  }
};
