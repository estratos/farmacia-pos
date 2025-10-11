const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO DETALLADO:\n');

// 1. Verificar contenido de index.html
console.log('1. 📄 CONTENIDO DE dist/index.html:');
const htmlContent = fs.readFileSync('dist/index.html', 'utf8');
console.log(htmlContent);
console.log('\n---\n');

// 2. Verificar assets en dist
console.log('2. 📁 ASSETS EN dist/:');
const distFiles = fs.readdirSync('dist');
distFiles.forEach(file => {
  const filePath = path.join('dist', file);
  if (fs.statSync(filePath).isDirectory()) {
    console.log(`   📂 ${file}/`);
    const subFiles = fs.readdirSync(filePath);
    subFiles.forEach(subFile => {
      console.log(`      📄 ${subFile}`);
    });
  } else {
    console.log(`   📄 ${file}`);
  }
});

// 3. Verificar estructura de out/ después del package
console.log('\n3. 🏗️  ESTRUCTURA DE out/ (ejecuta: npm run package):');
if (fs.existsSync('out')) {
  function listDir(dir, indent = '') {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      if (item === 'node_modules') return;
      const itemPath = path.join(dir, item);
      const isDir = fs.statSync(itemPath).isDirectory();
      console.log(indent + (isDir ? '📂 ' : '📄 ') + item);
      if (isDir) {
        listDir(itemPath, indent + '   ');
      }
    });
  }
  listDir('out');
} else {
  console.log('   ❌ No existe - Ejecuta: npm run package');
}