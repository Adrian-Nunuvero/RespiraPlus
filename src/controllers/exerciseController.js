const db = require('../database/db');

exports.getExercises = (req, res) => {
  try {
    const exercises = db.prepare('SELECT * FROM exercises ORDER BY order_index ASC').all();
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getExerciseById = (req, res) => {
  try {
    const { id } = req.params;
    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
    if (!exercise) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
