export interface ElectronAPI {
  getAppVersion: () => string;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  openFile: () => Promise<string>;
  // Agregar más APIs según necesites
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
