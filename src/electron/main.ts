const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = require('electron-is-dev');

let mainWindow: any;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    // Sin marco nativo: se usa el TitleBar personalizado (con arrastre y controles
    // de ventana vía IPC). Evita que el título del documento se repita en la barra.
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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
    console.log('MODO DESARROLLO - Cargando desde servidor Vite');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('MODO PRODUCCIÓN - Cargando archivos compilados');

    // En producción, electron-forge copia la carpeta dist/ a resources/dist
    // (configurado con "extraResource": ["./dist"] en package.json).
    const resourcesPath = (process as any).resourcesPath as string;
    const reactBuildPath = path.join(resourcesPath, 'dist', 'index.html');

    console.log('Buscando build de React en:', reactBuildPath);

    if (fs.existsSync(reactBuildPath)) {
      console.log('ENCONTRADO - Cargando aplicación React');
      mainWindow.loadFile(reactBuildPath);
    } else {
      console.log('NO ENCONTRADO - Mostrando error');
      showLoadError(reactBuildPath);
    }
  }
}

function showLoadError(buildPath: string) {
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
        <h1>Error: Build de React No Encontrado</h1>
        <p>El ejecutable de Electron se creó, pero no incluye los archivos compilados de React.</p>
        <p><strong>Problema:</strong> Los archivos en <code>dist/</code> no se están incluyendo en el paquete final.</p>
        <p><strong>Solución:</strong> Verificar la configuración de <code>extraResource</code> en Electron Forge y ejecutar <code>npm run dist</code>.</p>
        <pre>Buscado en: ${buildPath}</pre>
      </div>
    </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

// ---- IPC expuesto al renderer vía preload ----
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.on('window-control', (event: any, action: string) => {
  if (!mainWindow) return;
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.close();
      break;
    default:
      console.warn('Acción de ventana desconocida:', action);
  }
});

app.whenReady().then(() => {
  console.log('Electron iniciado');
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
