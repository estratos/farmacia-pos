import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  minimizeWindow: () => ipcRenderer.invoke('window-control', 'minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-control', 'maximize'),
  closeWindow: () => ipcRenderer.invoke('window-control', 'close'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);