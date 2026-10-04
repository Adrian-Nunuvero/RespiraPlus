const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security, SEO and Performance Headers Middleware
app.use((req, res, next) => {
  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self)');
  
  // SEO & Robots indexing headers
  res.setHeader('X-Robots-Tag', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  
  // Content Security Policy for Medical SPA with CDN Tailwind & Chart.js
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://www.gstatic.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https:; " +
    "media-src 'self' data: blob: https: https://commondatastorage.googleapis.com; " +
    "connect-src 'self' https: http: ws:;"
  );

  // Cache policy for Service Worker and PWA
  if (req.url === '/sw.js' || req.url === '/manifest.json') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  next();
});

// Serve Static files with clean caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, pathUrl) => {
    if (pathUrl.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// API Routes
app.use('/api', apiRoutes);

// Fallback to SPA index.html for unknown web paths
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint API no encontrado' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`
  =============================================================
  🫁 RespiraPlus / MediRehab Pro - Sistema Médico v2.4.0
  =============================================================
  🏥 Servidor Clínico Express activo en:
  👉 http://localhost:${PORT}
  👉 http://127.0.0.1:${PORT}

  📊 Base de datos SQLite: Activa y sincronizada en WAL Mode
  🛡️ Headers de Seguridad & SEO: Configurados correctamente
  📱 PWA & Modo Offline: Service Worker listo
  =============================================================
  `);
});
