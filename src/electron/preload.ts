const { contextBridge, ipcRenderer } = require('electron');

// Definir la interfaz localmente
interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppPath: () => Promise<string>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

// Verificar que estamos en contexto de Electron
if (typeof process !== 'undefined' && process.versions?.electron) {
  const electronAPI: ElectronAPI = {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    minimizeWindow: () => ipcRenderer.invoke('window-control', 'minimize'),
    maximizeWindow: () => ipcRenderer.invoke('window-control', 'maximize'),
    closeWindow: () => ipcRenderer.invoke('window-control', 'close'),
  };

  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error('Error exposing electronAPI:', error);
  }
}

// Mover la declaración global a un archivo de tipos separado
// O usar este approach alternativo:
export {}; // Esto convierte el archivo en un módulo

declare global {
  interface Window {
    ElectronAPI?: ElectronAPI;
  }
}