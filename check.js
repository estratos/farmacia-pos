const fs = require('fs');

console.log('✅ VERIFICACIÓN RÁPIDA:');
console.log('dist/index.html existe:', fs.existsSync('dist/index.html'));
console.log('dist-electron/main.js existe:', fs.existsSync('dist-electron/main.js'));

if (fs.existsSync('dist/index.html')) {
  const content = fs.readFileSync('dist/index.html', 'utf8');
  console.log('Tamaño index.html:', content.length, 'caracteres');
}