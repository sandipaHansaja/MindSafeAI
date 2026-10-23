import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const THEME_MODES = ['auto', 'morning', 'evening', 'night'];
const KEY = 'mindsafe-theme';

// Local time -> theme. Morning covers the whole bright day; evening is the golden-hour sunset.
export function themeForTime(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 16) return 'morning';
  if (h >= 16 && h < 19.5) return 'evening';
  return 'night';
}

function savedMode() {
  try {
    const m = localStorage.getItem(KEY);
    if (THEME_MODES.includes(m)) return m;
  } catch { /* storage can be blocked */ }
  return 'auto';
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(savedMode);
  const [clockTheme, setClockTheme] = useState(() => themeForTime());

  // Re-check the clock every minute so the page changes by itself at 5:00, 16:00 and 19:30.
  useEffect(() => {
    const tick = () => setClockTheme(themeForTime());
    const id = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);

  const theme = mode === 'auto' ? clockTheme : mode;

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const setMode = useCallback((m) => {
    if (!THEME_MODES.includes(m)) return;
    setModeState(m);
    try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({ mode, setMode, theme }), [mode, setMode, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
