onst { getState, isOnline } = require("./_store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const s = await getState();
    return res.status(200).json({
      online: isOnline(s),
      percent: s.percent,
      diffuser: s.desired,
      reported: s.reported,
      lastSeen: s.lastSeen,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", detail: String(err.message || err) });
  }
};
