import { useSyncExternalStore } from 'react';
import en from './locales/en.json';
import de from './locales/de.json';
const dictionaries = { en, de };
const supported = ['it', 'en', 'de'];
const locales = { it: 'it-IT', en: 'en-GB', de: 'de-DE' };
const listeners = new Set();
const saved = () => { try { return localStorage.getItem('cs-language'); } catch { return null; } };
let language = supported.includes(saved()) ? saved() : 'it';
const snapshot = () => language;
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export function setLanguage(value) {
  if (!supported.includes(value)) return;
  language = value;
  try { localStorage.setItem('cs-language', value); } catch { /** Il cambio lingua resta disponibile senza memoria locale. */ }
  document.documentElement.lang = value;
  listeners.forEach(listener => listener());
}
document.documentElement.lang = language;
window.addEventListener('storage', event => {
  if (event.key === 'cs-language') {
    language = supported.includes(event.newValue) ? event.newValue : 'it';
    document.documentElement.lang = language;
    listeners.forEach(listener => listener());
  }
});
export function translate(key, values = {}) {
  const text = dictionaries[language]?.[key] || key;
  return String(text).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}
export const languageLocale = () => locales[language];
export function useI18n() {
  const language = useSyncExternalStore(subscribe, snapshot, () => 'it');
  return { language, locale: locales[language], setLanguage, t: translate };
}
