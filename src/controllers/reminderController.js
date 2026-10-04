const db = require('../database/db');

exports.getReminders = (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const reminders = db.prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY id ASC').all(userId);
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createReminder = (req, res) => {
  try {
    const { user_id = 1, title, time_str, detail, icon = '⏰', days = ["L","M","X","J","V","S","D"] } = req.body;
    if (!title || !time_str) {
      return res.status(400).json({ error: 'Título y hora son obligatorios' });
    }

    const result = db.prepare(`
      INSERT INTO reminders (user_id, title, time_str, detail, icon, is_enabled, days_json)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(user_id, title, time_str, detail || '', icon, JSON.stringify(days));

    const newReminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newReminder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.toggleReminder = (req, res) => {
  try {
    const { id } = req.params;
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    if (!reminder) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    const newStatus = reminder.is_enabled === 1 ? 0 : 1;
    db.prepare('UPDATE reminders SET is_enabled = ? WHERE id = ?').run(newStatus, id);

    res.json({ id, is_enabled: newStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteReminder = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    res.json({ message: 'Recordatorio eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
