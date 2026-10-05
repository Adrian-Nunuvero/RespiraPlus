const db = require('../database/db');

// Extracts and validates user session from Token or x-user-id header
function authenticateSession(req, res, next) {
  try {
    let userId = null;

    // 1. Check Authorization Bearer Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Format: jwt-med-token-<userId>-<timestamp>
      const match = token.match(/jwt-med-token-(\d+)-/);
      if (match) {
        userId = parseInt(match[1], 10);
      }
    }

    // 2. Check fallback header x-user-id
    if (!userId && req.headers['x-user-id']) {
      userId = parseInt(req.headers['x-user-id'], 10);
    }

    // 3. Check query param userId for direct file/stream requests
    if (!userId && req.query.userId) {
      userId = parseInt(req.query.userId, 10);
    }

    if (!userId) {
      return res.status(401).json({
        error: 'No se proporcionó una sesión válida. Inicie sesión para continuar.'
      });
    }

    const user = db.prepare('SELECT id, email, full_name, role, diagnosis, assigned_doctor, rehab_goal, phase, avatar_initials, theme_mode FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(401).json({
        error: 'Sesión expirada o usuario no encontrado en la base de datos clínica.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Error al verificar la sesión de usuario.' });
  }
}

// Restricts access strictly to Medical Administrator (role: 'admin' or 'doctor')
function requireAdmin(req, res, next) {
  authenticateSession(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sesión no autenticada.' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    if (userRole === 'admin' || userRole === 'doctor') {
      return next();
    }

    return res.status(403).json({
      error: 'Acceso Denegado: El panel AdminSite y sus operaciones son exclusivos para el Administrador del sistema.'
    });
  });
}

// Allows any authenticated user (patient, doctor, admin)
function requireAuth(req, res, next) {
  authenticateSession(req, res, next);
}

module.exports = {
  authenticateSession,
  requireAdmin,
  requireAuth
};
