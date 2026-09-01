import { loadData, saveData } from './storage';
import type { AppSettings } from '../types';

const KEY = 'settings';

export const defaultSettings: AppSettings = {
  pharmacyName: 'Farmacia Central',
  licenseNumber: 'Lic. #12345',
  taxRate: 16,
  receiptFooter: '¡Gracias por su compra!',
  theme: 'light',
};

export const settingsService = {
  getSettings(): AppSettings {
    return { ...defaultSettings, ...loadData<Partial<AppSettings>>(KEY, {}) };
  },

  saveSettings(settings: AppSettings): void {
    saveData(KEY, settings);
  },
};
