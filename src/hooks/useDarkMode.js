import { useEffect, useSyncExternalStore } from 'react';
const listeners = new Set();
const media = window.matchMedia('(prefers-color-scheme: dark)');
const saved = () => { try { return localStorage.getItem('cs-theme'); } catch { return null; } };
let preference = ['light', 'dark'].includes(saved()) ? saved() : 'system';
const resolved = () => preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
function apply() {
  document.documentElement.classList.toggle('dark', resolved() === 'dark');
  listeners.forEach(listener => listener());
}
media.addEventListener('change', apply);
window.addEventListener('storage', event => {
  if (event.key !== 'cs-theme') return;
  preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : 'system';
  apply();
});
export function setThemePreference(value) {
  if (!['light', 'dark', 'system'].includes(value)) return;
  preference = value;
  try { localStorage.setItem('cs-theme', value); } catch { /** La preferenza continua a funzionare per questa sessione. */ }
  apply();
}
export function useTheme() {
  const value = useSyncExternalStore(subscribe, () => preference + ':' + resolved(), () => 'system:light');
  const [choice, theme] = value.split(':');
  return { preference: choice, theme, setPreference: setThemePreference, toggle: () => setThemePreference(theme === 'dark' ? 'light' : 'dark') };
}
export default function useDarkMode() { useEffect(() => { apply(); }, []); }
