const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '../public/index.html');
const appJsPath = path.join(__dirname, '../public/js/app.js');

// 1. Process public/index.html
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Replace rounded classes to make everything squared/clinical
html = html.replace(/\brounded-3xl\b/g, 'rounded-lg');
html = html.replace(/\brounded-2xl\b/g, 'rounded-lg');
html = html.replace(/\brounded-xl\b/g, 'rounded-md');

// Replace specific emoji strings in index.html with FontAwesome icons
html = html.replace('<span class="text-3xl">🫁</span>', '<i class="fa-solid fa-lungs text-3xl text-teal-400"></i>');
html = html.replace(/🔄\s*<\/button>/g, '<i class="fa-solid fa-rotate-right"></i></button>');
html = html.replace(/▶/g, '<i class="fa-solid fa-play"></i>');
html = html.replace('🔔 Probar Notificación Push', '<i class="fa-solid fa-bell mr-1.5"></i> Probar Notificación Push');
html = html.replace('● Sala Lista', '<i class="fa-solid fa-circle text-[8px] mr-1"></i> Sala Lista');
html = html.replace('>📄</div>', '><i class="fa-solid fa-file-pdf"></i></div>');
html = html.replace('>🛡️</div>', '><i class="fa-solid fa-shield-halved"></i></div>');
html = html.replace('● Cifrado Local Activo', '<i class="fa-solid fa-circle text-[8px] mr-1 text-emerald-500"></i> Cifrado Local Activo');
html = html.replace('🔄 Actualizar Datos', '<i class="fa-solid fa-rotate-right mr-1.5"></i> Actualizar Datos');
html = html.replace('<span>🎬</span> Ingresar Nuevo Video Clínico', '<i class="fa-solid fa-film text-purple-600"></i> Ingresar Nuevo Video Clínico');
html = html.replace('<span>💪</span> Añadir Ejercicio a la Rutina', '<i class="fa-solid fa-dumbbell text-teal-600"></i> Añadir Ejercicio a la Rutina');
html = html.replace('<span>👥</span> Directorio de Pacientes & Historial Clínico', '<i class="fa-solid fa-users text-purple-600"></i> Directorio de Pacientes & Historial Clínico');
html = html.replace('⏰ Crear Nuevo Recordatorio', '<i class="fa-solid fa-bell text-teal-600 mr-1.5"></i> Crear Nuevo Recordatorio');
html = html.replace('🩺 Actualizar Fase Terapéutica', '<i class="fa-solid fa-stethoscope text-purple-600 mr-1.5"></i> Actualizar Fase Terapéutica');
html = html.replace('<span class="text-xl">📜</span>', '<i class="fa-solid fa-file-lines text-teal-600 text-xl"></i>');
html = html.replace('<span id="toast-icon" class="text-lg">✅</span>', '<span id="toast-icon" class="text-lg flex items-center justify-center"><i class="fa-solid fa-circle-check text-emerald-400"></i></span>');

// Replace close button Xs in modals
html = html.replace(/<button onclick="closeAddReminderModal\(\)" class="text-slate-500 hover:text-slate-800 text-lg font-bold">✕<\/button>/g,
  '<button onclick="closeAddReminderModal()" class="text-slate-500 hover:text-slate-800 text-base"><i class="fa-solid fa-xmark"></i></button>');
html = html.replace(/<button onclick="closePatientPhaseModal\(\)" class="text-slate-500 hover:text-slate-800 text-lg font-bold">✕<\/button>/g,
  '<button onclick="closePatientPhaseModal()" class="text-slate-500 hover:text-slate-800 text-base"><i class="fa-solid fa-xmark"></i></button>');
html = html.replace(/<button onclick="closeTermsModal\(\)" class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-lg font-bold">✕<\/button>/g,
  '<button onclick="closeTermsModal()" class="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-base"><i class="fa-solid fa-xmark"></i></button>');

// Replace select options in modal-add-reminder
html = html.replace('<option value="⏰">⏰ Alarma Reloj</option>', '<option value="bell">Alarma Reloj</option>');
html = html.replace('<option value="🧊">🧊 Crioterapia / Hielo</option>', '<option value="snowflake">Crioterapia / Hielo</option>');
html = html.replace('<option value="🫁">🫁 Respiración Diafragmática</option>', '<option value="lungs">Respiración Diafragmática</option>');
html = html.replace('<option value="💊">💊 Medicamento</option>', '<option value="pills">Medicamento</option>');

fs.writeFileSync(indexHtmlPath, html, 'utf8');
console.log('index.html updated successfully.');

// 2. Process public/js/app.js
let js = fs.readFileSync(appJsPath, 'utf8');

// Replace rounded classes inside dynamically rendered templates in app.js
js = js.replace(/\brounded-3xl\b/g, 'rounded-lg');
js = js.replace(/\brounded-2xl\b/g, 'rounded-lg');
js = js.replace(/\brounded-xl\b/g, 'rounded-md');

// Fix toast function to render FontAwesome icons
const newToastFunc = `function showToast(title, msg, iconClass = 'fa-solid fa-circle-check') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-title').innerText = title;
  document.getElementById('toast-msg').innerText = msg;
  const iconEl = document.getElementById('toast-icon');
  if (iconEl) {
    if (typeof iconClass === 'string' && iconClass.startsWith('fa-')) {
      iconEl.innerHTML = \`<i class="\${iconClass}"></i>\`;
    } else {
      iconEl.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    }
  }

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 3200);
}`;

js = js.replace(/function showToast\(title, msg, icon = [^\)]+\) \{[\s\S]*?toast\.classList\.add\('translate-y-20'[\s\S]*?\}\);?\s*\}/, newToastFunc);

// Map reminder icons in renderReminders
js = js.replace(
  /\$\{rem\.icon \|\| '[^']+'\}/g,
  `\${rem.icon === 'snowflake' || (rem.icon && rem.icon.includes('🧊')) ? '<i class="fa-solid fa-snowflake"></i>' : rem.icon === 'lungs' || (rem.icon && rem.icon.includes('🫁')) ? '<i class="fa-solid fa-lungs"></i>' : rem.icon === 'pills' || (rem.icon && rem.icon.includes('💊')) ? '<i class="fa-solid fa-pills"></i>' : '<i class="fa-solid fa-bell"></i>'}`
);

// Replace raw trash/delete buttons
js = js.replace(/title="Eliminar">🗑️<\/button>/g, 'title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>');
js = js.replace(/title="Eliminar Video">🗑️<\/button>/g, 'title="Eliminar Video"><i class="fa-solid fa-trash-can"></i></button>');
js = js.replace(/title="Eliminar Ejercicio">🗑️<\/button>/g, 'title="Eliminar Ejercicio"><i class="fa-solid fa-trash-can"></i></button>');

// Replace emojis in showToast calls
const toastReplacements = [
  { from: "'⚠️'", to: "'fa-solid fa-triangle-exclamation text-amber-400'" },
  { from: '"⚠️"', to: "'fa-solid fa-triangle-exclamation text-amber-400'" },
  { from: "'🩺'", to: "'fa-solid fa-stethoscope text-purple-400'" },
  { from: '"🩺"', to: "'fa-solid fa-stethoscope text-purple-400'" },
  { from: "'👋'", to: "'fa-solid fa-hand text-teal-400'" },
  { from: '"👋"', to: "'fa-solid fa-hand text-teal-400'" },
  { from: "'🔒'", to: "'fa-solid fa-lock text-slate-400'" },
  { from: '"🔒"', to: "'fa-solid fa-lock text-slate-400'" },
  { from: "'✅'", to: "'fa-solid fa-circle-check text-emerald-400'" },
  { from: '"✅"', to: "'fa-solid fa-circle-check text-emerald-400'" },
  { from: "'🎉'", to: "'fa-solid fa-trophy text-amber-400'" },
  { from: '"🎉"', to: "'fa-solid fa-trophy text-amber-400'" },
  { from: "'🏆'", to: "'fa-solid fa-medal text-teal-400'" },
  { from: '"🏆"', to: "'fa-solid fa-medal text-teal-400'" },
  { from: "'🎬'", to: "'fa-solid fa-film text-purple-400'" },
  { from: '"🎬"', to: "'fa-solid fa-film text-purple-400'" },
  { from: "'▶️'", to: "'fa-solid fa-play text-teal-400'" },
  { from: '"▶️"', to: "'fa-solid fa-play text-teal-400'" },
  { from: "'⏰'", to: "'fa-solid fa-bell text-teal-400'" },
  { from: '"⏰"', to: "'fa-solid fa-bell text-teal-400'" },
  { from: "'🗑️'", to: "'fa-solid fa-trash-can text-red-400'" },
  { from: '"🗑️"', to: "'fa-solid fa-trash-can text-red-400'" },
  { from: "'🔔'", to: "'fa-solid fa-bell text-blue-400'" },
  { from: '"🔔"', to: "'fa-solid fa-bell text-blue-400'" },
  { from: "'📝'", to: "'fa-solid fa-clipboard-check text-teal-400'" },
  { from: '"📝"', to: "'fa-solid fa-clipboard-check text-teal-400'" },
  { from: "'🎥'", to: "'fa-solid fa-video text-blue-400'" },
  { from: '"🎥"', to: "'fa-solid fa-video text-blue-400'" },
  { from: "'📋'", to: "'fa-solid fa-copy text-blue-400'" },
  { from: '"📋"', to: "'fa-solid fa-copy text-blue-400'" },
  { from: "'📷'", to: "'fa-solid fa-camera text-slate-400'" },
  { from: '"📷"', to: "'fa-solid fa-camera text-slate-400'" },
  { from: "'📄'", to: "'fa-solid fa-file-pdf text-red-400'" },
  { from: '"📄"', to: "'fa-solid fa-file-pdf text-red-400'" },
  { from: "'💾'", to: "'fa-solid fa-hard-drive text-teal-400'" },
  { from: '"💾"', to: "'fa-solid fa-hard-drive text-teal-400'" },
  { from: "'🔄'", to: "'fa-solid fa-rotate text-teal-400'" },
  { from: '"🔄"', to: "'fa-solid fa-rotate text-teal-400'" },
  { from: "'📶'", to: "'fa-solid fa-wifi text-emerald-400'" },
  { from: '"📶"', to: "'fa-solid fa-wifi text-emerald-400'" },
  { from: "'👤'", to: "'fa-solid fa-user-check text-teal-400'" },
  { from: '"👤"', to: "'fa-solid fa-user-check text-teal-400'" },
  { from: "'💪'", to: "'fa-solid fa-dumbbell text-teal-400'" },
  { from: '"💪"', to: "'fa-solid fa-dumbbell text-teal-400'" },
  { from: "'📊'", to: "'fa-solid fa-chart-line text-purple-400'" },
  { from: '"📊"', to: "'fa-solid fa-chart-line text-purple-400'" }
];

for (const r of toastReplacements) {
  js = js.split(r.from).join(r.to);
}

fs.writeFileSync(appJsPath, js, 'utf8');
console.log('app.js updated successfully.');
