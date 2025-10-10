const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = require('electron-is-dev');

let mainWindow: any;

function createWindow(): void {
  console.log('Creating main window...');
  console.log('Is development:', isDev);
  console.log('App path:', app.getAppPath());
  console.log('Process cwd:', process.cwd());
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  // Habilitar logs detallados
  mainWindow.webContents.on('console-message', (event: any, level: any, message: any) => {
    console.log(`[Renderer ${level}] ${message}`);
  });

  loadApp();

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (event: any, errorCode: any, errorDescription: any) => {
    console.error('Failed to load:', errorCode, errorDescription);
    showLoadError(errorDescription);
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM ready - page loaded successfully');
  });

  createApplicationMenu();
}

function loadApp(): void {
  if (isDev) {
    console.log('Loading from development server...');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Loading production build...');
    
    // Rutas posibles sin usar process.resourcesPath
    const possiblePaths = [
      path.join(__dirname, '../dist/index.html'),      // Para build normal
      path.join(__dirname, '../../dist/index.html'),   // Para build alternativo
      path.join(__dirname, 'dist/index.html'),         // Para estructura diferente
      path.join(process.cwd(), 'dist/index.html'),     // Desde directorio actual
      path.join(app.getAppPath(), 'dist/index.html')   // Desde app path
    ];
    
    let loaded = false;
    
    for (const appPath of possiblePaths) {
      console.log('Trying path:', appPath);
      if (fs.existsSync(appPath)) {
        console.log('✅ Found index.html at:', appPath);
        mainWindow.loadFile(appPath).then(() => {
          console.log('✅ Successfully loaded index.html');
          loaded = true;
        }).catch((err: any) => {
          console.error('❌ Error loading from', appPath, err);
        });
        break;
      } else {
        console.log('❌ Not found:', appPath);
      }
    }
    
    if (!loaded) {
      console.error('❌ Could not find index.html in any location');
      showFileNotFoundError();
    }
  }
}

function showLoadError(errorDescription: string): void {
  const errorHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error - Farmacia POS</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: #fef2f2; 
            color: #dc2626;
          }
          .error-container { 
            background: white; 
            padding: 2rem; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            text-align: center; 
            max-width: 500px; 
            border-left: 4px solid #dc2626;
          }
          h1 { color: #dc2626; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>🚨 Error al cargar la aplicación</h1>
          <p><strong>Error:</strong> ${errorDescription}</p>
          <p>Por favor, reinstale la aplicación o contacte al soporte técnico.</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Cerrar</button>
        </div>
      </body>
    </html>
  `;
  
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

function showFileNotFoundError(): void {
  const errorHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Archivos no encontrados - Farmacia POS</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: #fffbeb; 
            color: #d97706;
          }
          .error-container { 
            background: white; 
            padding: 2rem; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            text-align: center; 
            max-width: 500px; 
            border-left: 4px solid #d97706;
          }
          h1 { color: #d97706; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>📁 Archivos de la aplicación no encontrados</h1>
          <p>La aplicación no pudo encontrar los archivos necesarios.</p>
          <p>Esto puede deberse a:</p>
          <ul style="text-align: left; margin: 1rem 0;">
            <li>Instalación corrupta</li>
            <li>Archivos eliminados</li>
            <li>Problemas de permisos</li>
          </ul>
          <p>Por favor, reinstale la aplicación.</p>
          <p><strong>App path:</strong> ${app.getAppPath()}</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #d97706; color: white; border: none; border-radius: 4px; cursor: pointer;">Cerrar</button>
        </div>
      </body>
    </html>
  `;
  
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

function createApplicationMenu(): void {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'Ctrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Forzar Recarga',
          accelerator: 'Ctrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Desarrollo',
      submenu: [
        {
          label: 'Abrir DevTools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.openDevTools();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
}

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();
}).catch((err: any) => {
  console.error('Error during app ready:', err);
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