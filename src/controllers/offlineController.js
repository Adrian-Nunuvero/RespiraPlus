const db = require('../database/db');

exports.getOfflinePack = (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const exercises = db.prepare('SELECT * FROM exercises ORDER BY order_index ASC').all();
    const videos = db.prepare('SELECT * FROM videos ORDER BY id ASC').all();
    const reminders = db.prepare('SELECT * FROM reminders WHERE user_id = ?').all(userId);

    res.json({
      timestamp: new Date().toISOString(),
      packVersion: '2.4.0',
      user: user ? { id: user.id, full_name: user.full_name, diagnosis: user.diagnosis, phase: user.phase } : null,
      exercises,
      videos: videos.map(v => ({ ...v, markers: v.markers_json ? JSON.parse(v.markers_json) : [] })),
      reminders,
      instructions: 'Este paquete permite el uso completo de RespiraPlus sin conexión a internet.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.syncOfflineData = (req, res) => {
  try {
    const { pendingLogs = [] } = req.body;
    const userId = req.body.userId || 1;

    let syncedCount = 0;
    const insert = db.prepare(`
      INSERT INTO exercise_logs (user_id, exercise_name, sets, reps, pain_eva, notes, logged_at, synced_from_offline)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const insertMany = db.transaction((logs) => {
      for (const item of logs) {
        insert.run(
          userId,
          item.exercise_name || 'Ejercicio Fisioterapéutico',
          item.sets || 3,
          item.reps || 12,
          item.pain_eva || 2,
          (item.notes || '') + ' [Sincronizado Offline]',
          item.logged_at || new Date().toISOString()
        );
        syncedCount++;
      }
    });

    if (pendingLogs.length > 0) {
      insertMany(pendingLogs);
    }

    res.json({
      message: 'Sincronización completada con éxito',
      syncedCount,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
};
