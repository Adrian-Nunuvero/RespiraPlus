const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/js/app.js');
let js = fs.readFileSync(appJsPath, 'utf8');

js = js.replace(/'📍'/g, "'fa-solid fa-location-dot text-teal-400'");
js = js.replace(/"📦"/g, "'fa-solid fa-box-archive text-teal-400'");
js = js.replace(/'☁️'/g, "'fa-solid fa-cloud-arrow-up text-blue-400'");
js = js.replace(/"📡"/g, "'fa-solid fa-tower-broadcast text-amber-400'");
js = js.replace(/"🌐"/g, "'fa-solid fa-globe text-emerald-400'");

// Fix reminder icon check
js = js.replace(
  /\$\{rem\.icon === 'snowflake' \|\| \(rem\.icon && rem\.icon\.includes\('[^']+'\)\) \? '<i class="fa-solid fa-snowflake"><\/i>' : rem\.icon === 'lungs' \|\| \(rem\.icon && rem\.icon\.includes\('[^']+'\)\) \? '<i class="fa-solid fa-lungs"><\/i>' : rem\.icon === 'pills' \|\| \(rem\.icon && rem\.icon\.includes\('[^']+'\)\) \? '<i class="fa-solid fa-pills"><\/i>' : '<i class="fa-solid fa-bell"><\/i>'\}/g,
  `\${rem.icon === 'snowflake' ? '<i class="fa-solid fa-snowflake"></i>' : rem.icon === 'lungs' ? '<i class="fa-solid fa-lungs"></i>' : rem.icon === 'pills' ? '<i class="fa-solid fa-pills"></i>' : '<i class="fa-solid fa-bell"></i>'}`
);

fs.writeFileSync(appJsPath, js, 'utf8');
console.log('Cleaned final emojis in app.js.');
