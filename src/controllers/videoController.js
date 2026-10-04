const db = require('../database/db');

exports.getVideos = (req, res) => {
  try {
    const videos = db.prepare('SELECT * FROM videos ORDER BY id ASC').all();
    const parsed = videos.map(v => ({
      ...v,
      markers: v.markers_json ? JSON.parse(v.markers_json) : []
    }));
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
