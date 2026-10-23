import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { LANGUAGES, LanguageProvider, useLang } from './i18n.jsx';
import { breathPhase } from './breath.js';
import { THEME_MODES, ThemeProvider, useTheme } from './theme.jsx';
import CrisisAlert, { CrisisBar, Contact } from './CrisisAlert.jsx';

// three.js is only downloaded after the first paint, so the page appears instantly.
const Orb3D = lazy(() => import('./Orb3D.jsx'));

const API = import.meta.env.VITE_API_URL ?? '';
const COUNTRY_CODES = ['LK', 'US', 'GB', 'IN', 'AU', 'CA', 'OTHER'];

/* ---------- small helpers ---------- */

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduce;
}

// Server helplines are bilingual objects ({en, si}); plain strings are also accepted.
const pick = (v, lang) => (typeof v === 'string' ? v : v?.[lang] ?? v?.en ?? '');

/* ---------- background: aurora + drifting bubbles ---------- */

function Background() {
  const bubbles = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      id: i,
      size: 14 + Math.random() * 46,
      left: Math.random() * 100,
      dur: 22 + Math.random() * 26,
      delay: -Math.random() * 40,
      hue: ['aqua', 'lilac', 'peach', 'rose', 'sky'][i % 5],
      sway: 20 + Math.random() * 50,
    })),
    []
  );
  return (
    <div className="scene" aria-hidden="true">
      <i className="blob b1" /><i className="blob b2" /><i className="blob b3" /><i className="blob b4" />
      {bubbles.map((b) => (
        <i key={b.id} className={`bubble ${b.hue}`}
          style={{ width: b.size, height: b.size, left: `${b.left}%`, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, '--sway': `${b.sway}px` }} />
      ))}
    </div>
  );
}

/* ---------- 3D tilt card (follows the pointer; disabled on touch / reduced motion) ---------- */

function Tilt({ as: Tag = 'div', className = '', children, max = 7, ...rest }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const move = (e) => {
    if (reduce || e.pointerType === 'touch' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateZ(6px)`;
    ref.current.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
    ref.current.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <Tag ref={ref} onPointerMove={move} onPointerLeave={leave} className={`tilt ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- language switcher ---------- */

function LanguageSwitcher() {
  const { lang, setLang, t } = useLang();
  const idx = LANGUAGES.findIndex((l) => l.code === lang);
  return (
    <div role="group" aria-label={t.language} className="lang-switch" style={{ '--i': idx, '--n': LANGUAGES.length }}>
      <span className="lang-thumb" aria-hidden="true" />
      {LANGUAGES.map((l) => (
        <button key={l.code} type="button" lang={l.code} aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

const ICONS = {
  auto: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" /></svg>,
  morning: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>,
  evening: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 17a6 6 0 0 1 12 0M2.5 17h19M5 21h14M12 5v2.5M4.8 9.8l1.6 1.4M19.2 9.8l-1.6 1.4" /></svg>,
  night: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>,
};

function ThemeSwitcher() {
  const { mode, setMode } = useTheme();
  const { t } = useLang();
  const idx = THEME_MODES.indexOf(mode);
  return (
    <div role="group" aria-label={t.theme} className="lang-switch icon-switch" style={{ '--i': idx, '--n': THEME_MODES.length }}>
      <span className="lang-thumb" aria-hidden="true" />
      {THEME_MODES.map((m) => (
        <button key={m} type="button" aria-pressed={mode === m} aria-label={t.themes[m]} title={t.themes[m]} onClick={() => setMode(m)}>
          {ICONS[m]}
        </button>
      ))}
    </div>
  );
}

/* ---------- hero orb with synced breathing label ---------- */

function BreathLabel() {
  const { t } = useLang();
  const [inhale, setInhale] = useState(() => breathPhase() < 0.5);
  useEffect(() => {
    const id = setInterval(() => setInhale(breathPhase() < 0.5), 250);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="breath-label" aria-live="off" key={inhale ? 'in' : 'out'}>
      {inhale ? t.breatheIn : t.breatheOut}
    </p>
  );
}

function Hero3D() {
  const reduce = useReducedMotion();
  const { theme } = useTheme();
  return (
    <div className="flex flex-col items-center">
      <div className="orb-stage" aria-hidden="true">
        <div className="orb-fallback" />
        <Suspense fallback={null}><Orb3D reduceMotion={reduce} theme={theme} /></Suspense>
      </div>
      {!reduce && <BreathLabel />}
    </div>
  );
}

/* ---------- screens ---------- */

function Journal({ onSubmit, loading, error }) {
  const { t } = useLang();
  const [text, setText] = useState('');
  const [country, setCountry] = useState('LK');
  const [promptIdx] = useState(() => Math.floor(Math.random() * 3));
  const ready = text.trim().length >= 10 && !loading;

  return (
    <section className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
      <div className="rise">
        <h1 className="font-serif text-4xl leading-tight md:text-5xl"><span className="text-shimmer">{t.heroTitle}</span></h1>
        <p className="mt-4 max-w-prose text-lg text-ink/75">{t.heroText}</p>
      </div>
      <div className="rise" style={{ '--d': '120ms' }}><Hero3D /></div>

      <form className="glass rise p-5 md:col-span-2 md:p-7" style={{ '--d': '220ms' }}
        onSubmit={(e) => { e.preventDefault(); onSubmit(text, country); }}>
        <label htmlFor="entry" className="mb-3 block font-serif text-xl font-medium">{t.prompts[promptIdx]}</label>
        <textarea
          id="entry" value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} rows={8}
          placeholder={t.placeholder}
          className="entry field w-full resize-y rounded-2xl p-5 font-serif text-xl leading-relaxed shadow-inner placeholder:text-ink/40"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm text-ink/80">
            {t.helplinesFor}
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="field rounded-xl px-2.5 py-1.5">
              {COUNTRY_CODES.map((c) => <option key={c} value={c}>{t.countries[c]}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink/60">{text.length}/5000</span>
            <button disabled={!ready} className="btn-calm">
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? t.reading : t.getSupport}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-sand px-4 py-3 text-alert">{t.errors[error] ?? t.errors.GENERIC}</p>}
      </form>
    </section>
  );
}

function Helplines({ list, urgent }) {
  const { t, lang } = useLang();
  return (
    <section aria-labelledby={urgent ? 'help-urgent' : 'help'} className={`rise rounded-3xl p-6 md:p-8 ${urgent ? 'urgent' : 'glass'}`}>
      <h2 id={urgent ? 'help-urgent' : 'help'} className="font-serif text-2xl">{urgent ? t.urgentHelp : t.peopleTitle}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {list?.map((h, i) => (
          <li key={i}>
            <Tilt className={`h-full rounded-2xl p-4 ${urgent ? 'bg-white/15' : 'tile'}`} max={5}>
              <p className="font-medium">{pick(h.name, lang)}</p>
              <p className="mt-1 text-xl font-semibold"><Contact h={h} /></p>
              {h.note && <p className={`text-sm ${urgent ? 'text-white/90' : 'text-ink/65'}`}>{pick(h.note, lang)}</p>}
            </Tilt>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Results({ r, onReset }) {
  const { t, lang } = useLang();
  const [alertOpen, setAlertOpen] = useState(!!r.crisis); // opens straight away for high / crisis results
  const high = r.stressLevel >= 8;
  return (
    <div className={`space-y-8 ${r.crisis && !alertOpen ? 'pb-20' : ''}`}>
      {r.crisis && alertOpen && <CrisisAlert r={r} onClose={() => setAlertOpen(false)} />}
      {r.crisis && !alertOpen && <CrisisBar r={r} onOpen={() => setAlertOpen(true)} />}
      {r.crisis && <Helplines list={r.helplines} urgent />}
      {r.lang && r.lang !== lang && (
        <p className="rounded-xl bg-sand px-4 py-3 text-sm text-ink/80" role="status">{t.langNotice(t.langNames[r.lang] ?? r.lang)}</p>
      )}
      <section className="rise">
        <h1 className="font-serif text-3xl md:text-4xl"><span className="text-shimmer">{t.thanks}</span></h1>
        <p className="mt-4 max-w-prose font-serif text-xl leading-relaxed">{r.summary}</p>
      </section>

      <section aria-label={t.summaryLabel} className="glass rise grid gap-6 p-6 sm:grid-cols-2" style={{ '--d': '100ms' }}>
        <div>
          <p className="text-sm text-ink/70">{t.stress}</p>
          <div className="mt-3 flex gap-1.5" role="img" aria-label={t.stressAria(r.stressLevel)}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={`seg ${i < r.stressLevel ? (high ? 'on-high' : 'on') : ''}`} style={{ '--k': i }} />
            ))}
          </div>
          <p className="mt-2 font-medium">{t.stressOf(r.stressLevel)}</p>
        </div>
        <div>
          <p className="text-sm text-ink/70">{t.tone}</p>
          <p className="mt-1 text-xl font-medium capitalize">{t.sentiments[r.sentiment.label] ?? r.sentiment.label}</p>
          <p className="mt-1 text-ink/70">{r.emotions.join(', ')}</p>
        </div>
      </section>

      <section>
        <h2 className="rise font-serif text-2xl" style={{ '--d': '160ms' }}>{t.helpTitle}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {r.copingStrategies.map((c, i) => (
            <Tilt as="article" key={c.title + i} className={`glass rise card-c${i % 5} p-5`} style={{ '--d': `${220 + i * 90}ms` }}>
              <h3 className="font-semibold text-sage-deep">{c.title}</h3>
              <p className="mt-2 text-ink/85">{c.steps}</p>
            </Tilt>
          ))}
        </div>
      </section>

      <section className="affirm rise rounded-3xl p-6 md:p-8" style={{ '--d': '300ms' }}>
        <h2 className="font-serif text-2xl">{t.affirmTitle}</h2>
        <ul className="mt-3 space-y-2 font-serif text-xl italic">
          {r.affirmations.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </section>

      <p className="rise max-w-prose text-ink/85">{r.professionalHelpAdvice}</p>
      {!r.crisis && <Helplines list={r.helplines} />}

      <button onClick={onReset} className="btn-ghost">{t.again}</button>
    </div>
  );
}

function Shell() {
  const { t, lang } = useLang();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function analyze(text, country) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/analyze-journal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, country, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.code || 'GENERIC'); return; }
      setResult(data); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('NETWORK');
    } finally { setLoading(false); }
  }

  return (
    <>
      <Background />
      <div className="relative mx-auto max-w-5xl px-5 py-6 md:py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-2.5 font-semibold">
            <span className="brand-gem" aria-hidden="true" /> {t.brand}
          </div>
          <div className="flex flex-wrap items-center gap-3"><ThemeSwitcher /><LanguageSwitcher /></div>
        </header>
        <main>{result ? <Results r={result} onReset={() => setResult(null)} /> : <Journal onSubmit={analyze} loading={loading} error={error} />}</main>
        <footer className="mt-16 border-t border-ink/10 pt-6 text-sm text-ink/70">{t.footer}</footer>
      </div>
    </>
  );
}

export default function App() {
  return <LanguageProvider><ThemeProvider><Shell /></ThemeProvider></LanguageProvider>;
}
