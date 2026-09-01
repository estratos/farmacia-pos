import { settingsService } from '../services/settingsService';

export type Theme = 'light' | 'dark';

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function getTheme(): Theme {
  return settingsService.getSettings().theme ?? 'light';
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  settingsService.saveSettings({ ...settingsService.getSettings(), theme: next });
  applyTheme(next);
  return next;
}
