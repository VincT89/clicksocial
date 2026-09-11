import { useEffect, useState } from "react";

// Tema chiaro/scuro con persistenza in localStorage.
// Chiave: "cs-theme" ("light" | "dark"). Se assente, segue il sistema.
const STORAGE_KEY = "cs-theme";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark() ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

// Hook usato una volta in App.jsx per inizializzare il tema all'avvio.
export default function useDarkMode() {
  useEffect(() => {
    applyTheme(resolveTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(systemPrefersDark() ? "dark" : "light");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
}

// Hook per il componente toggle: restituisce il tema corrente e una funzione toggle.
// Scrive la preferenza in localStorage solo quando l'utente la cambia esplicitamente.
export function useTheme() {
  const [theme, setTheme] = useState(resolveTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(systemPrefersDark() ? "dark" : "light");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return { theme, toggle };
}