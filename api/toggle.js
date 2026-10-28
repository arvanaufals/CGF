// Dipanggil oleh website: nyalakan / matikan diffuser.
// POST /api/toggle
const { getState, saveState, isOnline, MIN_WATER_PERCENT } = require("./_store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const s = await getState();

    if (!isOnline(s)) {
      return res.status(503).json({ error: "Perangkat sedang offline.", diffuser: s.desired });
    }

    if (s.percent < MIN_WATER_PERCENT) {
      s.desired = false;
      await saveState(s);
      return res.status(400).json({
        error: "Air kurang dari 10%. Isi air terlebih dahulu.",
        diffuser: false,
      });
    }

    s.desired = !s.desired;
    await saveState(s);
    return res.status(200).json({ diffuser: s.desired });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
