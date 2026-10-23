import { useEffect, useRef } from 'react';
import { useLang } from './i18n.jsx';

const pick = (v, lang) => (typeof v === 'string' ? v : v?.[lang] ?? v?.en ?? '');

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
);
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.3A8.4 8.4 0 1 1 21 11.5z" />
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

const smsHref = (s) => `sms:${s.number}${s.body ? `?body=${encodeURIComponent(s.body)}` : ''}`;

/** The tappable form of a helpline's contact text (call link if it has a number, else text/web link). */
export function Contact({ h }) {
  const { lang } = useLang();
  const text = pick(h.contact, lang);
  const href = h.tel ? `tel:${h.tel}` : h.sms ? smsHref(h.sms) : h.url || null;
  if (!href) return text;
  return (
    <a href={href} {...(h.url && !h.tel && !h.sms ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="underline decoration-2 underline-offset-4">
      {text}
    </a>
  );
}

function ActionButton({ h, kind }) {
  const { t, lang } = useLang();
  const name = pick(h.name, lang);
  const contact = pick(h.contact, lang);
  const buttons = [];
  if (h.tel) {
    buttons.push(
      <a key="call" href={`tel:${h.tel}`} className={`call-btn ${kind}`} aria-label={`${t.callLabel}: ${name}, ${contact}`}>
        <PhoneIcon /><span><small>{name}</small><strong>{contact}</strong></span>
      </a>
    );
  }
  if (h.sms) {
    buttons.push(
      <a key="sms" href={smsHref(h.sms)} className={`call-btn ${h.tel ? 'soft' : kind}`} aria-label={`${t.textLabel}: ${name}`}>
        <ChatIcon /><span><small>{h.tel ? t.textInstead : name}</small><strong>{h.tel ? `${h.sms.number}` : contact}</strong></span>
      </a>
    );
  }
  return buttons;
}

/**
 * Shown right away when a check-in comes back as high-risk or crisis. Gives one-tap calls to the
 * right services for the person's country. Nothing is sent anywhere: the app stays anonymous.
 */
export default function CrisisAlert({ r, onClose }) {
  const { t, lang } = useLang();
  const cardRef = useRef(null);
  const crisis = r.riskLevel === 'crisis';

  const helplines = r.helplines.filter((h) => h.kind === 'helpline' && (h.tel || h.sms));
  const emergencies = r.helplines.filter((h) => h.kind === 'emergency' && h.tel);
  const directory = r.helplines.find((h) => h.kind === 'directory');

  // Accessibility: move focus into the dialog, keep Tab inside it, close on Escape, restore focus after.
  useEffect(() => {
    const prev = document.activeElement;
    const card = cardRef.current;
    const focusables = () => [...card.querySelectorAll('a[href], button:not([disabled])')];
    (focusables()[0] || card).focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [onClose]);

  return (
    <div className="crisis-backdrop">
      <div ref={cardRef} role="alertdialog" aria-modal="true" aria-labelledby="crisis-title" aria-describedby="crisis-body" tabIndex={-1} className="crisis-card">
        <div className="crisis-heart" aria-hidden="true">♥</div>
        <h2 id="crisis-title" className="mt-3 font-serif text-2xl leading-snug md:text-3xl">{crisis ? t.crisisTitle : t.highTitle}</h2>
        <p id="crisis-body" className="mt-3 text-ink/85">{crisis ? t.crisisBody : t.highBody}</p>

        {helplines.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-ink/70">{t.talkNow}</p>
            <div className="grid gap-2.5">
              {helplines.map((h, i) => <ActionButton key={i} h={h} kind={i === 0 ? 'primary pulse' : 'primary'} />)}
            </div>
          </div>
        )}

        {emergencies.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-ink/70">{crisis ? t.emergencyNow : t.emergencyIf}</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {emergencies.map((h, i) => <ActionButton key={i} h={h} kind="emergency" />)}
            </div>
          </div>
        )}

        <p className="mt-5 rounded-2xl bg-sand px-4 py-3 text-sm text-ink/85">{t.trustedPerson}</p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {directory ? (
            <a href={directory.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-sage-deep underline underline-offset-4">
              <span className="h-4 w-4"><GlobeIcon /></span>{t.moreHelp}
            </a>
          ) : <span />}
          <button type="button" onClick={onClose} className="btn-ghost">{t.closeAlert}</button>
        </div>
        <p className="sr-only" lang={lang}>{pick(r.helplines[0]?.name, lang)}</p>
      </div>
    </div>
  );
}

/** Slim always-visible bar after the alert is closed, so help stays one tap away. */
export function CrisisBar({ r, onOpen }) {
  const { t, lang } = useLang();
  const main = r.helplines.find((h) => h.kind === 'helpline' && h.tel) || r.helplines.find((h) => h.kind === 'emergency' && h.tel);
  if (!main) return null;
  return (
    <div className="crisis-bar" role="region" aria-label={t.barText}>
      <p className="hidden text-sm font-medium sm:block">{t.barText}</p>
      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <button type="button" onClick={onOpen} className="rounded-full px-3 py-2 text-sm font-semibold underline underline-offset-4">{t.moreHelp}</button>
        <a href={`tel:${main.tel}`} className="call-btn primary !w-auto !gap-2 !rounded-full !px-4 !py-2" aria-label={`${t.callLabel}: ${pick(main.name, lang)}, ${pick(main.contact, lang)}`}>
          <PhoneIcon /><strong className="!text-base">{pick(main.contact, lang)}</strong>
        </a>
      </div>
    </div>
  );
}
