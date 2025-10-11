const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO DEL BUILD');
console.log('=========================\n');

// 1. Verificar dist/
console.log('1. 📁 CARPETA dist/:');
if (fs.existsSync('dist')) {
  const distFiles = fs.readdirSync('dist');
  distFiles.forEach(file => {
    const filePath = path.join('dist', file);
    const stats = fs.statSync(filePath);
    const isDir = stats.isDirectory();
    console.log(`   ${isDir ? '📂' : '📄'} ${file} (${isDir ? 'directorio' : (stats.size / 1024).toFixed(1) + ' KB'})`);
  });
} else {
  console.log('   ❌ NO EXISTE');
}

// 2. Verificar dist-electron/
console.log('\n2. 📁 CARPETA dist-electron/:');
if (fs.existsSync('dist-electron')) {
  const electronFiles = fs.readdirSync('dist-electron');
  electronFiles.forEach(file => {
    console.log(`   📄 ${file}`);
  });
} else {
  console.log('   ❌ NO EXISTE');
}

// 3. Verificar out/ después del package
console.log('\n3. 📁 CARPETA out/ (después de npm run package):');
if (fs.existsSync('out')) {
  function listFiles(dir, indent = '') {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const isDir = stats.isDirectory();
      console.log(`${indent}${isDir ? '📂' : '📄'} ${file}`);
      if (isDir && file !== 'node_modules') {
        listFiles(filePath, indent + '   ');
      }
    });
  }
  listFiles('out');
} else {
  console.log('   ❌ NO EXISTE - Ejecuta: npm run package');
}

// 4. Verificar index.html
console.log('\n4. 📄 CONTENIDO de dist/index.html:');
if (fs.existsSync('dist/index.html')) {
  const content = fs.readFileSync('dist/index.html', 'utf8');
  console.log('   ✅ EXISTE');
  console.log('   Primeras 300 caracteres:');
  console.log('   ' + content.substring(0, 300).replace(/\n/g, '\n   '));
  
  // Verificar rutas de assets
  const hasAbsolutePaths = content.includes('src="/') || content.includes('href="/');
  console.log(`\n   🔍 Rutas absolutas: ${hasAbsolutePaths ? '❌ SÍ' : '✅ NO'}`);
} else {
  console.log('   ❌ NO EXISTE');
}