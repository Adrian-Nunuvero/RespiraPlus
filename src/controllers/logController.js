const db = require('../database/db');

exports.getLogs = (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const limit = parseInt(req.query.limit) || 20;
    const logs = db.prepare(`
      SELECT * FROM exercise_logs 
      WHERE user_id = ? 
      ORDER BY logged_at DESC 
      LIMIT ?
    `).all(userId, limit);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLog = (req, res) => {
  try {
    const { user_id = 1, exercise_id, exercise_name, sets = 3, reps = 12, pain_eva = 2, notes = '', logged_at } = req.body;
    
    if (!exercise_name) {
      return res.status(400).json({ error: 'El nombre del ejercicio es obligatorio' });
    }

    const logDate = logged_at || new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO exercise_logs (user_id, exercise_id, exercise_name, sets, reps, pain_eva, notes, logged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, exercise_id || null, exercise_name, sets, reps, pain_eva, notes, logDate);

    const newLog = db.prepare('SELECT * FROM exercise_logs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
