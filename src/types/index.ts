export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  barcode: string;
  category: string;
  requires_prescription: boolean;
  controlled: boolean;
  expiration_date?: string;
  lot_number?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: number;
  items: CartItem[];
  total: number;
  date: string;
  payment_method: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// Tipos para Electron
export interface ElectronAPI {
  getAppVersion?: () => Promise<string>;
  minimizeWindow?: () => void;
  maximizeWindow?: () => void;
  closeWindow?: () => void;
  openFile?: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}