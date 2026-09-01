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

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Sale {
  id: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  date: string;
  payment_method: PaymentMethod;
  received?: number;
  change?: number;
  customer_id?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface AppSettings {
  pharmacyName: string;
  licenseNumber: string;
  taxRate: number; // porcentaje de IVA, ej. 16
  receiptFooter: string;
  theme?: 'light' | 'dark';
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// Tipos para Electron
export interface ElectronAPI {
  getAppVersion?: () => Promise<string>;
  getAppPath?: () => Promise<string>;
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
