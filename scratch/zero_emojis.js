const fs = require('fs');
const path = require('path');

// 1. index.html
const indexHtmlPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');
html = html.replace(
  '<span>⚠️ <strong>Modo Sin Conexión Activado:</strong>',
  '<span class="flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation text-amber-500"></i> <strong>Modo Sin Conexión Activado:</strong>'
);
fs.writeFileSync(indexHtmlPath, html, 'utf8');

// 2. api.js
const apiJsPath = path.join(__dirname, '../public/js/api.js');
let apiJs = fs.readFileSync(apiJsPath, 'utf8');
apiJs = apiJs.replace("console.log('📦 Registro almacenado", "console.log('[Offline Storage] Registro almacenado");
fs.writeFileSync(apiJsPath, apiJs, 'utf8');

// 3. app.js
const appJsPath = path.join(__dirname, '../public/js/app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');
appJs = appJs.replace("showToast('Datos Cargados', 'Paciente Carlos Vega listo.', '⚡');", "showToast('Datos Cargados', 'Paciente Carlos Vega listo.', 'fa-solid fa-bolt text-teal-400');");
appJs = appJs.replace("${val} / 10 - Dolor Intenso ⚠️ (Consulte al médico)", "${val} / 10 - Dolor Intenso (Consulte al médico)");
fs.writeFileSync(appJsPath, appJs, 'utf8');

// 4. sw-register.js
const swRegPath = path.join(__dirname, '../public/js/sw-register.js');
let swReg = fs.readFileSync(swRegPath, 'utf8');
swReg = swReg.replace("console.log('✅ Service Worker", "console.log('[PWA] Service Worker");
swReg = swReg.replace("console.warn('⚠️ Service Worker", "console.warn('[PWA] Service Worker");
swReg = swReg.replace("console.log('🌐 Conexión", "console.log('[PWA] Conexión");
swReg = swReg.replace("console.log('📡 Sin conexión", "console.log('[PWA] Sin conexión");
fs.writeFileSync(swRegPath, swReg, 'utf8');

console.log('Zero emoji replacements complete.');
