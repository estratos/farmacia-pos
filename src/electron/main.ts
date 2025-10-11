const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = require('electron-is-dev');

let mainWindow: any;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    show: false,
  });

  mainWindow.webContents.on('console-message', (event: any, level: any, message: any) => {
    console.log(`[RENDERER ${level}] ${message}`);
  });

  loadApp();
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

function loadApp() {
  if (isDev) {
    console.log('🔧 MODO DESARROLLO - Cargando desde servidor Vite');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('📦 MODO PRODUCCIÓN - Cargando archivos compilados');
    
    // En producción, los archivos de React están en el directorio de recursos
    const reactBuildPath = path.join(process.cwd(), 'resources/dist/index.html');
    
    console.log('🔍 Buscando build de React en:', reactBuildPath);
    
    if (fs.existsSync(reactBuildPath)) {
      console.log('✅ ENCONTRADO - Cargando aplicación React');
      mainWindow.loadFile(reactBuildPath);
    } else {
      console.log('❌ NO ENCONTRADO - Mostrando error');
      
      // Listar qué archivos SÍ existen para debug
      const resourcesDir = path.join(process.cwd(), 'resources/app');
      if (fs.existsSync(resourcesDir)) {
        console.log('📁 Archivos en resources/app/:');
        const files = fs.readdirSync(resourcesDir);
        files.forEach((file: string) => {
          console.log('   - ' + file);
        });
      }
      
      showLoadError();
    }
  }
}

function showLoadError() {
  const errorHtml = `
    <html>
    <head>
      <title>Error - Build Incorrecto</title>
      <style>
        body { font-family: Arial; padding: 40px; background: #fef2f2; }
        .container { max-width: 600px; margin: 100px auto; background: white; padding: 30px; border-radius: 8px; border-left: 4px solid #dc2626; }
        h1 { color: #dc2626; margin-top: 0; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚨 Error: Build de React No Encontrado</h1>
        <p>El ejecutable de Electron se creó, pero no incluye los archivos compilados de React.</p>
        <p><strong>Problema:</strong> Los archivos en <code>dist/</code> no se están incluyendo en el paquete final.</p>
        <p><strong>Solución:</strong> Verificar la configuración de <code>extraResource</code> en Electron Forge.</p>
        <pre>Buscado en: ${path.join(process.cwd(), 'resources/app/index.html')}</pre>
      </div>
    </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

ipcMain.handle('get-app-version', () => app.getVersion());

app.whenReady().then(() => {
  console.log('✅ Electron iniciado');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});