import 'dotenv/config';
import dns from 'node:dns';
import net from 'node:net';
// Some Windows/ISP networks hang on IPv6 routes to Google; prefer IPv4 and fail over quickly.
dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamilyAttemptTimeout?.(500);
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool, initDb } from './db.js';
import { analyzeWithGemini } from './gemini.js';
import { HELPLINES, isCrisisText } from './helplines.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '40kb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false,
  message: { code: 'RATE_LIMITED', error: 'Too many requests. Please wait a little and try again.' } });

const clamp = (n, lo, hi, d) => (Number.isFinite(+n) ? Math.min(hi, Math.max(lo, +n)) : d);
const strList = (a, max) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, max) : []);
const RISKS = ['low', 'moderate', 'high', 'crisis'];
const SENTS = ['positive', 'neutral', 'negative', 'mixed'];
const LANGS = ['en', 'si'];
const FALLBACK = {
  en: { summary: 'Thank you for sharing. What you feel matters.', help: 'Talking with a trained professional can help.' },
  si: { summary: 'බෙදාගත්තාට ස්තූතියි. ඔබට දැනෙන දේ වැදගත්.', help: 'පුහුණු වෘත්තිකයෙකු සමඟ කතා කිරීමෙන් උපකාරයක් ලබාගත හැකියි.' },
};

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

app.post('/api/analyze-journal', limiter, async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const country = HELPLINES[req.body?.country] ? req.body.country : 'OTHER';
  const lang = LANGS.includes(req.body?.lang) ? req.body.lang : 'en';
  if (text.length < 10 || text.length > 5000)
    return res.status(400).json({ code: 'BAD_LENGTH', error: 'Please write between 10 and 5,000 characters.' });

  let ai;
  try {
    ai = await analyzeWithGemini(text, lang);
  } catch (err) {
    console.error('Analysis failed:', err.message); // never log journal text
    return res.status(502).json({ code: 'ANALYSIS_UNAVAILABLE', error: 'The analysis service is unavailable. Please try again shortly.' });
  }

  // Normalize model output + apply deterministic safety override.
  let risk = RISKS.includes(ai?.riskLevel) ? ai.riskLevel : 'moderate';
  if (isCrisisText(text)) risk = 'crisis';
  const stressLevel = Math.round(clamp(ai?.stressLevel, 1, 10, 5));
  if (stressLevel >= 8 && risk === 'low') risk = 'moderate';

  const result = {
    sentiment: {
      label: SENTS.includes(ai?.sentiment?.label) ? ai.sentiment.label : 'mixed',
      score: clamp(ai?.sentiment?.score, -1, 1, 0),
    },
    stressLevel,
    riskLevel: risk,
    emotions: strList(ai?.emotions, 4),
    summary: String(ai?.summary || FALLBACK[lang].summary),
    copingStrategies: (Array.isArray(ai?.copingStrategies) ? ai.copingStrategies : [])
      .filter((c) => c && typeof c.title === 'string').slice(0, 5)
      .map((c) => ({ title: c.title, steps: String(c.steps || '') })),
    affirmations: strList(ai?.affirmations, 3),
    professionalHelpAdvice: String(ai?.professionalHelpAdvice || FALLBACK[lang].help),
    lang,
    crisis: risk === 'crisis' || risk === 'high',
    helplines: HELPLINES[country],
  };

  // Anonymous storage: random UUID, scores only. No text, no IP, no identifiers.
  const sessionId = crypto.randomUUID();
  try {
    await pool.execute(
      `INSERT INTO sessions (id, sentiment_label, sentiment_score, stress_level, risk_level, emotions, text_length, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, result.sentiment.label, result.sentiment.score, result.stressLevel, result.riskLevel,
       JSON.stringify(result.emotions), text.length, country]
    );
  } catch (err) {
    console.error('DB insert failed:', err.code || err.message); // don't block the user's support
  }
  res.json({ sessionId, ...result });
});

// Serve the built React app in production (single-service deployment).
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Development local server handling vs Vercel Serverless export
const port = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  initDb()
    .then(() => app.listen(port, () => console.log(`MindSafe API on :${port}`)))
    .catch((e) => { console.error('Database connection failed:', e.code || e.message); process.exit(1); });
} else {
  initDb().catch(() => {});
}

export default app;