// Simple build script using esbuild via CDN
// Run this in browser console or via deno/node

const modules = [
  'profile-card-utils.js',
  'format-utils.js',
  'ui-utils.js',
  'debug-utils.js',
  'app-state.js',
  'auth-module.js',
  'attendance-module.js',
  'dashboard-module.js',
  'room-entry-module.js',
  'room-management-module.js',
  'minutes-tools-module.js',
  'settings-module.js',
  'resource-module.js',
  'guest-module.js',
  'time-controller.js'
];

console.log('Build process untuk E-Rapat UNSAM');
console.log('=================================');
console.log('');
console.log('Module yang akan di-bundle:');
modules.forEach((m, i) => console.log(`${i + 1}. ${m}`));
console.log('');
console.log('Instruksi build manual:');
console.log('1. Install Node.js dari https://nodejs.org');
console.log('2. Jalankan: npm install -g vite');
console.log('3. Jalankan: vite build');
console.log('');
console.log('Atau deploy langsung dengan struktur sekarang (tanpa build)');
