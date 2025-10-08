import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './types/electron';

// Exponer APIs seguras al frontend
const electronAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  minimizeWindow: () => ipcRenderer.invoke('window-control', 'minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-control', 'maximize'),
  closeWindow: () => ipcRenderer.invoke('window-control', 'close'),
  openFile: () => ipcRenderer.invoke('dialog:openFile')
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
