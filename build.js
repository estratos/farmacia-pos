import { build } from 'electron-builder';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

console.log('🚀 Iniciando build de Farmacia POS...');

build({
  config: {
    ...packageJson.build,
    directories: {
      output: "release"
    }
  }
})
  .then(() => {
    console.log('✅ Build completado exitosamente!');
    console.log('📁 Los archivos están en la carpeta "release/"');
  })
  .catch((error) => {
    console.error('❌ Error en el build:', error);
    process.exit(1);
  });